;; Solve-Earn Reputation System
;; Tracks researcher credibility and history

(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u100))
(define-constant err-not-found (err u101))
(define-constant err-invalid-score (err u102))

(define-data-var total-researchers uint u0)

(define-map researcher-profiles
    { researcher: principal }
    {
        total-submissions: uint,
        accepted-submissions: uint,
        rejected-submissions: uint,
        total-earned: uint,
        reputation-score: uint,
        joined-at: uint,
        is-verified: bool
    }
)

(define-map submission-history
    { researcher: principal, submission-id: uint }
    {
        bounty-id: uint,
        severity: (string-ascii 10),
        reward: uint,
        timestamp: uint,
        status: (string-ascii 10)
    }
)

(define-read-only (get-researcher-profile (researcher principal))
    (map-get? researcher-profiles { researcher: researcher })
)

(define-read-only (get-reputation-score (researcher principal))
    (match (map-get? researcher-profiles { researcher: researcher })
        profile (ok (get reputation-score profile))
        err-not-found
    )
)

(define-public (register-researcher)
    (let
        (
            (existing (map-get? researcher-profiles { researcher: tx-sender }))
        )
        (asserts! (is-none existing) err-unauthorized)
        (map-set researcher-profiles
            { researcher: tx-sender }
            {
                total-submissions: u0,
                accepted-submissions: u0,
                rejected-submissions: u0,
                total-earned: u0,
                reputation-score: u50,
                joined-at: block-height,
                is-verified: false
            }
        )
        (var-set total-researchers (+ (var-get total-researchers) u1))
        (ok true)
    )
)
