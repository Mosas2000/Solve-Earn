;; clarity-version: 2
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u200))
(define-constant err-bounty-not-found (err u201))
(define-constant err-insufficient-funds (err u202))
(define-constant err-bounty-expired (err u203))
(define-constant err-invalid-severity (err u204))
(define-constant err-duplicate-hash (err u205))
(define-constant err-max-submissions-reached (err u206))
(define-constant err-self-submission (err u207))
(define-constant err-approval-too-early (err u208))
(define-constant err-arbiter-required (err u209))
(define-constant err-not-registered-arbiter (err u210))
(define-constant err-already-confirmed (err u211))
(define-constant err-not-pending (err u212))
(define-constant err-bounty-still-active (err u213))
(define-constant MAX-SUBMISSIONS-PER-RESEARCHER u3)
(define-constant DEFAULT-APPROVAL-DELAY u10)
(define-constant DEFAULT-HIGH-VALUE-THRESHOLD u5000000)
;; Grace period after bounty expiry before it can be closed (approx 1 day)
(define-constant CLOSE-GRACE-PERIOD u144)

(define-data-var bounty-nonce uint u0)
(define-data-var submission-nonce uint u0)
(define-data-var approval-delay uint DEFAULT-APPROVAL-DELAY)
(define-data-var high-value-threshold uint DEFAULT-HIGH-VALUE-THRESHOLD)

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

;; Tracks how many submissions a researcher has made to a specific bounty
(define-map researcher-submission-count
    { bounty-id: uint, researcher: principal }
    { count: uint }
)

;; Tracks whether a specific report hash has already been submitted to a bounty
(define-map submitted-hashes
    { bounty-id: uint, report-hash: (buff 32) }
    { submission-id: uint }
)

;; Tracks arbiter confirmations for high-value submission approvals
;; An independent arbiter must co-sign before the project owner can approve
(define-map approval-confirmations
    { submission-id: uint }
    {
        arbiter: principal,
        confirmed-at: uint
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
            (current-count (default-to { count: u0 }
                (map-get? researcher-submission-count { bounty-id: bounty-id, researcher: tx-sender })))
        )
        (asserts! (get is-active bounty) err-bounty-expired)
        (asserts! (< block-height (get expires-at bounty)) err-bounty-expired)
        (asserts! (> reward u0) err-invalid-severity)
        ;; Prevent bounty owner from submitting to their own bounty
        (asserts! (not (is-eq tx-sender (get project bounty))) err-self-submission)
        ;; Prevent duplicate report hashes on the same bounty
        (asserts! (is-none (map-get? submitted-hashes { bounty-id: bounty-id, report-hash: report-hash })) err-duplicate-hash)
        ;; Limit submissions per researcher per bounty
        (asserts! (< (get count current-count) MAX-SUBMISSIONS-PER-RESEARCHER) err-max-submissions-reached)
        ;; Record the submission
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
        ;; Track the hash to prevent duplicates
        (map-set submitted-hashes
            { bounty-id: bounty-id, report-hash: report-hash }
            { submission-id: submission-id }
        )
        ;; Increment the per-researcher submission count
        (map-set researcher-submission-count
            { bounty-id: bounty-id, researcher: tx-sender }
            { count: (+ (get count current-count) u1) }
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
        ;; Submission must still be pending
        (asserts! (is-eq (get status submission) "pending") err-not-pending)
        ;; Enforce cooling period: cannot approve until approval-delay blocks after submission
        (asserts! (>= block-height (+ (get submitted-at submission) (var-get approval-delay))) err-approval-too-early)
        (asserts! (>= (get remaining-pool bounty) reward) err-insufficient-funds)
        ;; For high-value rewards, require an arbiter to have confirmed first
        (asserts! (or (<= reward (var-get high-value-threshold))
                      (is-some (map-get? approval-confirmations { submission-id: submission-id })))
                  err-arbiter-required)
        (try! (as-contract (stx-transfer? reward tx-sender (get researcher submission))))
        (print {
            event: "reward-payment",
            submission-id: submission-id,
            bounty-id: bounty-id,
            amount: reward,
            recipient: (get researcher submission),
            severity: (get severity submission),
            block-height: block-height
        })
        (map-set submissions
            { submission-id: submission-id }
            (merge submission { status: "approved" })
        )
        (map-set bounties
            { bounty-id: bounty-id }
            (merge bounty { remaining-pool: (- (get remaining-pool bounty) reward) })
        )
        ;; Update researcher reputation on acceptance
        (try! (contract-call? .reputation update-reputation-on-acceptance
            (get researcher submission) reward (get severity submission)))
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
        ;; Submission must still be pending
        (asserts! (is-eq (get status submission) "pending") err-not-pending)
        (map-set submissions
            { submission-id: submission-id }
            (merge submission { status: "rejected" })
        )
        ;; Update researcher reputation on rejection
        (try! (contract-call? .reputation update-reputation-on-rejection
            (get researcher submission)))
        (ok true)
    )
)

;; Arbiter confirms that a high-value submission has been independently reviewed.
;; Only registered arbiters from the dispute-resolver contract may call this.
;; The arbiter must not be the bounty project owner or the submission researcher.
(define-public (confirm-approval (submission-id uint))
    (let
        (
            (submission (unwrap! (map-get? submissions { submission-id: submission-id }) err-bounty-not-found))
            (bounty-id (get bounty-id submission))
            (bounty (unwrap! (map-get? bounties { bounty-id: bounty-id }) err-bounty-not-found))
        )
        ;; Must be a registered arbiter in the dispute-resolver contract
        (asserts! (contract-call? .dispute-resolver is-registered-arbiter tx-sender) err-not-registered-arbiter)
        ;; Submission must still be pending to confirm
        (asserts! (is-eq (get status submission) "pending") err-not-pending)
        ;; Arbiter cannot be the project owner (prevents self-dealing)
        (asserts! (not (is-eq tx-sender (get project bounty))) err-unauthorized)
        ;; Arbiter cannot be the submitting researcher
        (asserts! (not (is-eq tx-sender (get researcher submission))) err-unauthorized)
        ;; Prevent duplicate confirmations
        (asserts! (is-none (map-get? approval-confirmations { submission-id: submission-id })) err-already-confirmed)
        (map-set approval-confirmations
            { submission-id: submission-id }
            {
                arbiter: tx-sender,
                confirmed-at: block-height
            }
        )
        (print {
            event: "approval-confirmed",
            submission-id: submission-id,
            arbiter: tx-sender,
            block-height: block-height
        })
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
        ;; Can only close after the bounty has expired plus a grace period,
        ;; giving researchers time to finalize pending submissions
        (asserts! (>= block-height (+ (get expires-at bounty) CLOSE-GRACE-PERIOD)) err-bounty-still-active)
        (if (> remaining u0)
            (begin
                (try! (as-contract (stx-transfer? remaining tx-sender (get project bounty))))
                (print {
                    event: "bounty-refund",
                    bounty-id: bounty-id,
                    amount: remaining,
                    recipient: (get project bounty),
                    block-height: block-height
                })
                true
            )
            true
        )
        (map-set bounties
            { bounty-id: bounty-id }
            (merge bounty { is-active: false })
        )
        (print {
            event: "bounty-closed",
            bounty-id: bounty-id,
            refunded: remaining,
            block-height: block-height
        })
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

(define-read-only (get-total-submissions)
    (ok (var-get submission-nonce))
)

;; Governance: set the minimum block delay between submission and approval
(define-public (set-approval-delay (new-delay uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (var-set approval-delay new-delay)
        (ok new-delay)
    )
)

;; Governance: set the reward threshold above which arbiter confirmation is required
(define-public (set-high-value-threshold (new-threshold uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (var-set high-value-threshold new-threshold)
        (ok new-threshold)
    )
)

(define-read-only (get-approval-delay)
    (ok (var-get approval-delay))
)

(define-read-only (get-high-value-threshold)
    (ok (var-get high-value-threshold))
)

(define-read-only (get-approval-confirmation (submission-id uint))
    (map-get? approval-confirmations { submission-id: submission-id })
)
