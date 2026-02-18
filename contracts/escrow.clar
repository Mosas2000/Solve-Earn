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
