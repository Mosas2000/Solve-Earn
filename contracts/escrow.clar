;; clarity-version: 2
;; Escrow contract for milestone-based payment release
;; Integrates with the bounty-vault ecosystem to provide
;; locked-fund contracts between employers and workers.

(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u400))
(define-constant err-escrow-not-found (err u401))
(define-constant err-insufficient-funds (err u402))
(define-constant err-invalid-status (err u403))
(define-constant err-milestone-not-found (err u404))
(define-constant err-already-released (err u405))
(define-constant err-self-escrow (err u406))
(define-constant err-deadline-passed (err u407))
(define-constant err-milestone-limit (err u408))
(define-constant err-exceeds-total (err u409))

(define-constant MAX-MILESTONES u10)

(define-data-var escrow-nonce uint u0)
(define-data-var milestone-nonce uint u0)

(define-map escrows
    { escrow-id: uint }
    {
        employer: principal,
        worker: principal,
        total-amount: uint,
        released-amount: uint,
        committed-amount: uint,
        status: (string-ascii 10),
        created-at: uint,
        deadline: uint,
        milestone-count: uint
    }
)

(define-map milestones
    { escrow-id: uint, milestone-index: uint }
    {
        description: (string-utf8 100),
        amount: uint,
        status: (string-ascii 10),
        released-at: (optional uint)
    }
)

;; Create a new escrow contract between an employer and worker.
;; The employer locks the total amount in the contract at creation time.
;; duration-blocks sets how long the escrow remains valid.
(define-public (create-escrow
    (worker principal)
    (total-amount uint)
    (duration-blocks uint)
)
    (let
        (
            (escrow-id (+ (var-get escrow-nonce) u1))
            (deadline (+ block-height duration-blocks))
        )
        ;; Cannot create an escrow with yourself
        (asserts! (not (is-eq tx-sender worker)) err-self-escrow)
        ;; Must lock at least 1 microSTX
        (asserts! (> total-amount u0) err-insufficient-funds)
        ;; Transfer funds from employer to the contract
        (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))
        (map-set escrows
            { escrow-id: escrow-id }
            {
                employer: tx-sender,
                worker: worker,
                total-amount: total-amount,
                released-amount: u0,
                committed-amount: u0,
                status: "pending",
                created-at: block-height,
                deadline: deadline,
                milestone-count: u0
            }
        )
        (var-set escrow-nonce escrow-id)
        (print {
            event: "escrow-created",
            escrow-id: escrow-id,
            employer: tx-sender,
            worker: worker,
            amount: total-amount,
            deadline: deadline
        })
        (ok escrow-id)
    )
)

;; Add a milestone to an existing escrow. Only the employer may add milestones.
;; The escrow must be in 'pending' status (not yet activated).
(define-public (add-milestone
    (escrow-id uint)
    (description (string-utf8 100))
    (amount uint)
)
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
            (current-count (get milestone-count escrow))
            (new-committed (+ (get committed-amount escrow) amount))
        )
        (asserts! (is-eq tx-sender (get employer escrow)) err-unauthorized)
        (asserts! (is-eq (get status escrow) "pending") err-invalid-status)
        (asserts! (< current-count MAX-MILESTONES) err-milestone-limit)
        (asserts! (> amount u0) err-insufficient-funds)
        ;; Milestone amounts cannot exceed the total escrow amount
        (asserts! (<= new-committed (get total-amount escrow)) err-exceeds-total)
        (map-set milestones
            { escrow-id: escrow-id, milestone-index: current-count }
            {
                description: description,
                amount: amount,
                status: "pending",
                released-at: none
            }
        )
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { milestone-count: (+ current-count u1), committed-amount: new-committed })
        )
        (ok current-count)
    )
)

;; Activate an escrow contract. Called by the worker to accept the terms.
;; The escrow must be in 'pending' status.
(define-public (activate-escrow (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
        )
        (asserts! (is-eq tx-sender (get worker escrow)) err-unauthorized)
        (asserts! (is-eq (get status escrow) "pending") err-invalid-status)
        (asserts! (< block-height (get deadline escrow)) err-deadline-passed)
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { status: "active" })
        )
        (print {
            event: "escrow-activated",
            escrow-id: escrow-id,
            worker: tx-sender,
            block-height: block-height
        })
        (ok true)
    )
)

;; Release payment for a specific milestone. Only the employer may release.
;; The escrow must be active and the milestone must be in 'pending' status.
;; Transfers the milestone amount from the contract to the worker.
(define-public (release-milestone (escrow-id uint) (milestone-index uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
            (milestone (unwrap! (map-get? milestones { escrow-id: escrow-id, milestone-index: milestone-index }) err-milestone-not-found))
            (amount (get amount milestone))
        )
        (asserts! (is-eq tx-sender (get employer escrow)) err-unauthorized)
        (asserts! (is-eq (get status escrow) "active") err-invalid-status)
        (asserts! (is-eq (get status milestone) "pending") err-already-released)
        ;; Transfer milestone amount to worker
        (try! (as-contract (stx-transfer? amount tx-sender (get worker escrow))))
        (map-set milestones
            { escrow-id: escrow-id, milestone-index: milestone-index }
            (merge milestone {
                status: "released",
                released-at: (some block-height)
            })
        )
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow {
                released-amount: (+ (get released-amount escrow) amount)
            })
        )
        (print {
            event: "milestone-released",
            escrow-id: escrow-id,
            milestone-index: milestone-index,
            amount: amount,
            worker: (get worker escrow),
            block-height: block-height
        })
        (ok true)
    )
)

;; Either party can raise a dispute on an active escrow.
;; This freezes the escrow until the dispute-resolver contract handles it.
(define-public (dispute-escrow (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
        )
        (asserts! (or (is-eq tx-sender (get employer escrow))
                      (is-eq tx-sender (get worker escrow))) err-unauthorized)
        (asserts! (is-eq (get status escrow) "active") err-invalid-status)
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { status: "disputed" })
        )
        (print {
            event: "escrow-disputed",
            escrow-id: escrow-id,
            initiator: tx-sender,
            block-height: block-height
        })
        (ok true)
    )
)

;; Mark the escrow as completed. Called by the employer after all milestones
;; have been released, or to finalize a non-milestone escrow.
(define-public (complete-escrow (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
        )
        (asserts! (is-eq tx-sender (get employer escrow)) err-unauthorized)
        (asserts! (is-eq (get status escrow) "active") err-invalid-status)
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { status: "completed" })
        )
        (print {
            event: "escrow-completed",
            escrow-id: escrow-id,
            block-height: block-height
        })
        (ok true)
    )
)

;; Refund remaining funds to the employer. Only callable by the employer
;; when the escrow is still pending (worker never accepted) or deadline passed.
(define-public (refund-escrow (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
            (refund-amount (- (get total-amount escrow) (get released-amount escrow)))
        )
        (asserts! (is-eq tx-sender (get employer escrow)) err-unauthorized)
        (asserts! (or (is-eq (get status escrow) "pending")
                      (>= block-height (get deadline escrow))) err-invalid-status)
        (if (> refund-amount u0)
            (try! (as-contract (stx-transfer? refund-amount tx-sender (get employer escrow))))
            true
        )
        (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { status: "refunded" })
        )
        (print {
            event: "escrow-refunded",
            escrow-id: escrow-id,
            amount: refund-amount,
            block-height: block-height
        })
        (ok refund-amount)
    )
)

;; Read-only functions for querying escrow state

(define-read-only (get-escrow (escrow-id uint))
    (map-get? escrows { escrow-id: escrow-id })
)

(define-read-only (get-milestone (escrow-id uint) (milestone-index uint))
    (map-get? milestones { escrow-id: escrow-id, milestone-index: milestone-index })
)

(define-read-only (get-remaining-committable (escrow-id uint))
    (let
        (
            (escrow (unwrap! (map-get? escrows { escrow-id: escrow-id }) err-escrow-not-found))
        )
        (ok (- (get total-amount escrow) (get committed-amount escrow)))
    )
)

(define-read-only (get-total-escrows)
    (ok (var-get escrow-nonce))
)
