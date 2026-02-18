;; clarity-version: 2
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u300))
(define-constant err-dispute-not-found (err u301))
(define-constant err-already-voted (err u302))
(define-constant err-not-arbiter (err u303))

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

(define-public (register-arbiter)
    (begin
        (map-set arbiters
            { arbiter: tx-sender }
            {
                is-active: true,
                total-votes: u0,
                correct-votes: u0
            }
        )
        (var-set arbiter-count (+ (var-get arbiter-count) u1))
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
        (asserts! (is-none existing-vote) err-already-voted)
        (asserts! (get is-active arbiter) err-unauthorized)
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
        (ok true)
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
