;; clarity-version: 2
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u300))
(define-constant err-dispute-not-found (err u301))
(define-constant err-already-voted (err u302))
(define-constant err-not-arbiter (err u303))
(define-constant err-dispute-closed (err u304))
(define-constant err-quorum-not-reached (err u305))
(define-constant err-voting-active (err u306))
(define-constant err-already-resolved (err u307))
(define-constant err-arbiter-inactive (err u308))
(define-constant err-already-registered (err u309))

;; Minimum number of votes required before a dispute can be resolved
(define-constant QUORUM u3)
;; Number of blocks after creation during which voting is allowed
(define-constant VOTING-PERIOD u144)

(define-data-var dispute-nonce uint u0)
(define-data-var arbiter-count uint u0)

(define-map disputes
    { dispute-id: uint }
    {
        submission-id: uint,
        initiator: principal,
        reason: (string-utf8 100),
        created-at: uint,
        votes-for: uint,
        votes-against: uint,
        status: (string-ascii 8),
        resolved-at: (optional uint)
    }
)

(define-map arbiters
    { arbiter: principal }
    { 
        is-active: bool,
        total-votes: uint,
        correct-votes: uint
    }
)

(define-map arbiter-votes
    { dispute-id: uint, arbiter: principal }
    { vote: bool, voted-at: uint }
)

(define-public (register-arbiter (new-arbiter principal))
    (begin
        ;; Only the contract owner may register arbiters
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        ;; Prevent re-registration from inflating the count
        (asserts! (is-none (map-get? arbiters { arbiter: new-arbiter })) err-already-registered)
        (map-set arbiters
            { arbiter: new-arbiter }
            {
                is-active: true,
                total-votes: u0,
                correct-votes: u0
            }
        )
        (var-set arbiter-count (+ (var-get arbiter-count) u1))
        (print {
            event: "arbiter-registered",
            arbiter: new-arbiter,
            block-height: block-height
        })
        (ok true)
    )
)

(define-public (create-dispute 
    (submission-id uint)
    (reason (string-utf8 100))
)
    (let
        (
            (dispute-id (+ (var-get dispute-nonce) u1))
        )
        (map-set disputes
            { dispute-id: dispute-id }
            {
                submission-id: submission-id,
                initiator: tx-sender,
                reason: reason,
                created-at: block-height,
                votes-for: u0,
                votes-against: u0,
                status: "open",
                resolved-at: none
            }
        )
        (var-set dispute-nonce dispute-id)
        (print {
            event: "dispute-created",
            dispute-id: dispute-id,
            submission-id: submission-id,
            initiator: tx-sender,
            block-height: block-height
        })
        (ok dispute-id)
    )
)

(define-public (vote-on-dispute (dispute-id uint) (vote-for bool))
    (let
        (
            (dispute (unwrap! (map-get? disputes { dispute-id: dispute-id }) err-dispute-not-found))
            (arbiter (unwrap! (map-get? arbiters { arbiter: tx-sender }) err-not-arbiter))
            (existing-vote (map-get? arbiter-votes { dispute-id: dispute-id, arbiter: tx-sender }))
        )
        ;; Only active arbiters may vote
        (asserts! (get is-active arbiter) err-arbiter-inactive)
        ;; Cannot vote on a resolved or rejected dispute
        (asserts! (is-eq (get status dispute) "open") err-dispute-closed)
        ;; Cannot vote after the voting period expires
        (asserts! (< block-height (+ (get created-at dispute) VOTING-PERIOD)) err-dispute-closed)
        ;; Prevent duplicate votes
        (asserts! (is-none existing-vote) err-already-voted)
        (map-set arbiter-votes
            { dispute-id: dispute-id, arbiter: tx-sender }
            { vote: vote-for, voted-at: block-height }
        )
        (map-set disputes
            { dispute-id: dispute-id }
            (merge dispute {
                votes-for: (if vote-for (+ (get votes-for dispute) u1) (get votes-for dispute)),
                votes-against: (if vote-for (get votes-against dispute) (+ (get votes-against dispute) u1))
            })
        )
        ;; Increment the arbiter's total-votes counter
        (map-set arbiters
            { arbiter: tx-sender }
            (merge arbiter { total-votes: (+ (get total-votes arbiter) u1) })
        )
        (print {
            event: "dispute-vote",
            dispute-id: dispute-id,
            arbiter: tx-sender,
            vote-for: vote-for,
            block-height: block-height
        })
        (ok true)
    )
)

;; Resolve a dispute once the voting period has ended and quorum is met.
;; The outcome is determined by majority vote: if votes-for > votes-against
;; the dispute is resolved in favour of the initiator, otherwise it is
;; rejected. Only callable after the voting period has elapsed.
(define-public (resolve-dispute (dispute-id uint))
    (let
        (
            (dispute (unwrap! (map-get? disputes { dispute-id: dispute-id }) err-dispute-not-found))
            (total-votes (+ (get votes-for dispute) (get votes-against dispute)))
            (voting-deadline (+ (get created-at dispute) VOTING-PERIOD))
        )
        ;; Dispute must still be open
        (asserts! (is-eq (get status dispute) "open") err-already-resolved)
        ;; Voting period must have ended
        (asserts! (>= block-height voting-deadline) err-voting-active)
        ;; Quorum must be reached
        (asserts! (>= total-votes QUORUM) err-quorum-not-reached)
        ;; Determine outcome by majority
        (let
            (
                (outcome (if (> (get votes-for dispute) (get votes-against dispute))
                    "resolved"
                    "rejected"
                ))
            )
            (map-set disputes
                { dispute-id: dispute-id }
                (merge dispute {
                    status: outcome,
                    resolved-at: (some block-height)
                })
            )
            (print {
                event: "dispute-resolved",
                dispute-id: dispute-id,
                outcome: outcome,
                votes-for: (get votes-for dispute),
                votes-against: (get votes-against dispute),
                block-height: block-height
            })
            (ok outcome)
        )
    )
)

(define-read-only (get-dispute (dispute-id uint))
    (map-get? disputes { dispute-id: dispute-id })
)

;; Returns whether the given principal is a registered and active arbiter.
;; Used by bounty-vault to validate arbiter co-signing on high-value approvals.
(define-read-only (is-registered-arbiter (who principal))
    (match (map-get? arbiters { arbiter: who })
        arbiter-data (get is-active arbiter-data)
        false
    )
)

;; Deactivate an arbiter. Only the contract owner may call this.
;; Deactivated arbiters can no longer vote on disputes.
(define-public (deactivate-arbiter (who principal))
    (let
        (
            (arbiter (unwrap! (map-get? arbiters { arbiter: who }) err-not-arbiter))
        )
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (asserts! (get is-active arbiter) err-arbiter-inactive)
        (map-set arbiters
            { arbiter: who }
            (merge arbiter { is-active: false })
        )
        (var-set arbiter-count (- (var-get arbiter-count) u1))
        (print {
            event: "arbiter-deactivated",
            arbiter: who,
            block-height: block-height
        })
        (ok true)
    )
)

;; Read-only helpers for querying dispute and arbiter state

(define-read-only (get-total-disputes)
    (ok (var-get dispute-nonce))
)

(define-read-only (get-active-arbiter-count)
    (ok (var-get arbiter-count))
)

(define-read-only (get-arbiter-stats (who principal))
    (map-get? arbiters { arbiter: who })
)

(define-read-only (get-arbiter-vote (dispute-id uint) (who principal))
    (map-get? arbiter-votes { dispute-id: dispute-id, arbiter: who })
)

(define-read-only (get-voting-deadline (dispute-id uint))
    (match (map-get? disputes { dispute-id: dispute-id })
        dispute (ok (+ (get created-at dispute) VOTING-PERIOD))
        err-dispute-not-found
    )
)
