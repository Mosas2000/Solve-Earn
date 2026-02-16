;; clarity-version: 2
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u100))
(define-constant err-not-found (err u101))
(define-constant err-invalid-score (err u102))

(define-data-var total-researchers uint u0)

;; On-chain list of registered researcher principals for enumeration
(define-data-var researcher-list (list 200 principal) (list))

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
        (var-set researcher-list
            (unwrap-panic (as-max-len?
                (append (var-get researcher-list) tx-sender) u200)))
        (ok true)
    )
)

(define-public (update-reputation-on-acceptance 
    (researcher principal) 
    (reward uint) 
    (severity (string-ascii 8))
)
    (let
        (
            (profile (unwrap! (map-get? researcher-profiles { researcher: researcher }) err-not-found))
            (score-boost (severity-to-score-boost severity))
            (new-score (+ (get reputation-score profile) score-boost))
        )
        (asserts! (is-eq contract-caller contract-owner) err-unauthorized)
        (map-set researcher-profiles
            { researcher: researcher }
            (merge profile {
                total-submissions: (+ (get total-submissions profile) u1),
                accepted-submissions: (+ (get accepted-submissions profile) u1),
                total-earned: (+ (get total-earned profile) reward),
                reputation-score: (if (> new-score u100) u100 new-score)
            })
        )
        (ok new-score)
    )
)

(define-public (update-reputation-on-rejection (researcher principal))
    (let
        (
            (profile (unwrap! (map-get? researcher-profiles { researcher: researcher }) err-not-found))
            (new-score (if (>= (get reputation-score profile) u5) 
                (- (get reputation-score profile) u5)
                u0
            ))
        )
        (asserts! (is-eq contract-caller contract-owner) err-unauthorized)
        (map-set researcher-profiles
            { researcher: researcher }
            (merge profile {
                total-submissions: (+ (get total-submissions profile) u1),
                rejected-submissions: (+ (get rejected-submissions profile) u1),
                reputation-score: new-score
            })
        )
        (ok new-score)
    )
)

(define-private (severity-to-score-boost (severity (string-ascii 8)))
    (if (is-eq severity "critical")
        u20
        (if (is-eq severity "high")
            u15
            (if (is-eq severity "medium")
                u10
                u5
            )
        )
    )
)

(define-read-only (get-total-researchers)
    (ok (var-get total-researchers))
)

;; Returns the full list of registered researcher principals
(define-read-only (get-researcher-list)
    (ok (var-get researcher-list))
)

(define-read-only (calculate-success-rate (researcher principal))
    (match (map-get? researcher-profiles { researcher: researcher })
        profile
        (let
            (
                (total (get total-submissions profile))
                (accepted (get accepted-submissions profile))
            )
            (if (> total u0)
                (ok (/ (* accepted u100) total))
                (ok u0)
            )
        )
        err-not-found
    )
)
