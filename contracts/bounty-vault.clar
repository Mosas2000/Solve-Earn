;; clarity-version: 2
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u200))
(define-constant err-bounty-not-found (err u201))
(define-constant err-insufficient-funds (err u202))
(define-constant err-bounty-expired (err u203))
(define-constant err-invalid-severity (err u204))

(define-data-var bounty-nonce uint u0)
(define-data-var submission-nonce uint u0)

(define-map bounties
    { bounty-id: uint }
    {
        project: principal,
        title: (string-utf8 50),
        description: (string-utf8 200),
        total-pool: uint,
        remaining-pool: uint,
        critical-reward: uint,
        high-reward: uint,
        medium-reward: uint,
        low-reward: uint,
        expires-at: uint,
        created-at: uint,
        is-active: bool
    }
)

(define-map submissions
    { submission-id: uint }
    {
        bounty-id: uint,
        researcher: principal,
        severity: (string-ascii 8),
        report-hash: (buff 32),
        submitted-at: uint,
        status: (string-ascii 8),
        reward-amount: uint
    }
)

(define-public (create-bounty
    (title (string-utf8 50))
    (description (string-utf8 200))
    (total-pool uint)
    (critical-reward uint)
    (high-reward uint)
    (medium-reward uint)
    (low-reward uint)
    (duration-blocks uint)
)
    (let
        (
            (bounty-id (+ (var-get bounty-nonce) u1))
            (expires-at (+ block-height duration-blocks))
        )
        (asserts! (>= total-pool (+ critical-reward high-reward medium-reward low-reward)) err-insufficient-funds)
        (try! (stx-transfer? total-pool tx-sender (as-contract tx-sender)))
        (map-set bounties
            { bounty-id: bounty-id }
            {
                project: tx-sender,
                title: title,
                description: description,
                total-pool: total-pool,
                remaining-pool: total-pool,
                critical-reward: critical-reward,
                high-reward: high-reward,
                medium-reward: medium-reward,
                low-reward: low-reward,
                expires-at: expires-at,
                created-at: block-height,
                is-active: true
            }
        )
        (var-set bounty-nonce bounty-id)
        (ok bounty-id)
    )
)

(define-public (submit-vulnerability
    (bounty-id uint)
    (severity (string-ascii 8))
    (report-hash (buff 32))
)
    (let
        (
            (bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) err-bounty-not-found))
            (submission-id (+ (var-get submission-nonce) u1))
            (reward (get-reward-by-severity bounty severity))
        )
        (asserts! (get is-active bounty) err-bounty-expired)
        (asserts! (< block-height (get expires-at bounty)) err-bounty-expired)
        (asserts! (> reward u0) err-invalid-severity)
        (map-set submissions
            { submission-id: submission-id }
            {
                bounty-id: bounty-id,
                researcher: tx-sender,
                severity: severity,
                report-hash: report-hash,
                submitted-at: block-height,
                status: "pending",
                reward-amount: reward
            }
        )
        (var-set submission-nonce submission-id)
        (ok submission-id)
    )
)

(define-private (get-reward-by-severity (bounty (tuple 
    (project principal)
    (title (string-utf8 50))
    (description (string-utf8 200))
    (total-pool uint)
    (remaining-pool uint)
    (critical-reward uint)
    (high-reward uint)
    (medium-reward uint)
    (low-reward uint)
    (expires-at uint)
    (created-at uint)
    (is-active bool)
)) (severity (string-ascii 8)))
    (if (is-eq severity "critical")
        (get critical-reward bounty)
        (if (is-eq severity "high")
            (get high-reward bounty)
            (if (is-eq severity "medium")
                (get medium-reward bounty)
                (get low-reward bounty)
            )
        )
    )
)

(define-public (approve-submission (submission-id uint))
    (let
        (
            (submission (unwrap! (map-get? submissions { submission-id: submission-id }) err-bounty-not-found))
            (bounty-id (get bounty-id submission))
            (bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) err-bounty-not-found))
            (reward (get reward-amount submission))
        )
        (asserts! (is-eq tx-sender (get project bounty)) err-unauthorized)
        (asserts! (>= (get remaining-pool bounty) reward) err-insufficient-funds)
        (try! (as-contract (stx-transfer? reward tx-sender (get researcher submission))))
        (map-set submissions
            { submission-id: submission-id }
            (merge submission { status: "approved" })
        )
        (map-set bounties
            { bounty-id: bounty-id }
            (merge bounty { remaining-pool: (- (get remaining-pool bounty) reward) })
        )
        (ok true)
    )
)

(define-public (reject-submission (submission-id uint))
    (let
        (
            (submission (unwrap! (map-get? submissions { submission-id: submission-id }) err-bounty-not-found))
            (bounty-id (get bounty-id submission))
            (bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) err-bounty-not-found))
        )
        (asserts! (is-eq tx-sender (get project bounty)) err-unauthorized)
        (map-set submissions
            { submission-id: submission-id }
            (merge submission { status: "rejected" })
        )
        (ok true)
    )
)

(define-public (close-bounty (bounty-id uint))
    (let
        (
            (bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) err-bounty-not-found))
            (remaining (get remaining-pool bounty))
        )
        (asserts! (is-eq tx-sender (get project bounty)) err-unauthorized)
        (if (> remaining u0)
            (try! (as-contract (stx-transfer? remaining tx-sender (get project bounty))))
            true
        )
        (map-set bounties
            { bounty-id: bounty-id }
            (merge bounty { is-active: false })
        )
        (ok remaining)
    )
)

(define-read-only (get-bounty (bounty-id uint))
    (map-get? bounties { bounty-id: bounty-id })
)

(define-read-only (get-submission (submission-id uint))
    (map-get? submissions { submission-id: submission-id })
)

(define-read-only (get-total-bounties)
    (ok (var-get bounty-nonce))
)
