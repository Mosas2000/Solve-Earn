;; Solve-Earn Bounty Vault
;; Core contract for bounty management and payouts

(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u200))
(define-constant err-bounty-not-found (err u201))
(define-constant err-insufficient-funds (err u202))
(define-constant err-bounty-expired (err u203))
(define-constant err-invalid-severity (err u204))
(define-constant err-submission-exists (err u205))

(define-data-var bounty-nonce uint u0)
(define-data-var submission-nonce uint u0)

(define-map bounties
    { bounty-id: uint }
    {
        project: principal,
        title: (string-utf8 100),
        description: (string-utf8 500),
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
        severity: (string-ascii 10),
        report-hash: (buff 32),
        submitted-at: uint,
        status: (string-ascii 10),
        reward-amount: uint
    }
)

(define-map project-bounties
    { project: principal }
    { bounty-ids: (list 50 uint) }
)

(define-map researcher-submissions
    { researcher: principal }
    { submission-ids: (list 100 uint) }
)
