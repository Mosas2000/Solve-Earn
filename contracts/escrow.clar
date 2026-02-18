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
