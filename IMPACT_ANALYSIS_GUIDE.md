# AREarnZone – Non-Breaking Development Mode & Impact Analysis Guide

## Overview
This document outlines the operational directives, dependency matrix, and automated testing protocols for **AREarnZone**.
To guarantee that newly implemented features never break existing functionality (Auth, Google Sign-In, Dashboard, CPA Center, Wallet, Withdraw, Membership, Referrals, API Sync, Admin Panel), every modification must pass the **Dependency & Impact Analysis** and **Automated Regression Test Suite**.

---

## 1. System Module Dependency Matrix

| Module ID | Module Name | Core Responsibilities | Direct Dependencies | Risk Level |
|---|---|---|---|---|
| `auth_module` | Auth & Google Sign-In | Firebase Auth, Google OAuth Popup Handler, OTP System, User Session Sync | `dashboard_module`, `wallet_withdraw_module`, `api_sync_admin` | **CRITICAL** |
| `dashboard_module` | Dashboard & Balance Engine | Real-time Balance Ledger, Task Limits, Stats Aggregation | `auth_module`, `membership_module` | **HIGH** |
| `cpa_module` | CPA Center & Postbacks | CPAlead/CPAGrip Offer Feeds, Callback Sync (`/api/cpa/postback`), Payout Crediting | `dashboard_module`, `wallet_withdraw_module` | **HIGH** |
| `wallet_withdraw_module` | Wallet & Withdraw Engine | Deposit Requests, Payout Gateways (Bkash/Nagad/Rocket), Min Thresholds | `auth_module`, `dashboard_module`, `api_sync_admin` | **CRITICAL** |
| `membership_module` | Membership & VIP Tiers | VIP Tier Perks, Daily Earning Caps, Upgrade Submissions | `dashboard_module`, `wallet_withdraw_module` | **MEDIUM** |
| `referrals_module` | Referrals & Multi-Level Bonus | Referral Code Generation, Target Milestones, Multi-Tier Commission | `auth_module`, `dashboard_module` | **MEDIUM** |
| `api_sync_admin_module` | API Sync & Admin Controls | Admin Authorization, System Config Sync, SMTP OTP Dispatch, Postbacks | `auth_module`, `cpa_module`, `wallet_withdraw_module` | **CRITICAL** |

---

## 2. Pre-Implementation Impact Analysis Protocol

Before making changes to any file or feature:
1. Identify the **Target Module ID** from the matrix above.
2. Determine all **Direct and Indirect Dependencies**.
3. Review the **Critical System Invariants**:
   - User UID and authentication state must remain valid and non-null.
   - User balance equations must remain accurate (`total_earned = task_rewards + cpa_rewards + referral_bonuses`).
   - Withdrawal requests must check `available_balance >= withdrawal_amount`.
   - Firestore Security Rules must strictly validate `request.auth != null`.
4. Run pre-implementation impact check via `analyzeFeatureImpact(featureName, targetModuleId, proposedChanges)`.
5. Execute the **Automated Regression Suite** using `npm test` or the Admin Regression Dashboard.

---

## 3. Firestore Rules Security Lockdown

The `firestore.rules` file enforces zero-trust Attribute-Based Access Control (ABAC):
- **Authentication Guard**: `isSignedIn()` enforces `request.auth != null`.
- **Identity Isolation**: User documents `/users/{userId}` can only be updated by `isOwner(userId)` or `isAdmin()`.
- **Request Ownership**: Financial/Task requests (`/withdraws`, `/submissions`, `/depositRequests`, `/membershipRequests`) mandate `request.resource.data.userId == request.auth.uid`.
- **Admin Isolation**: System configs, network parameters, and payout configurations (`/config`, `/cpaNetworks`, `/withdrawOptions`, `/membershipPlans`) can only be modified by verified admin accounts.

---

## 4. Automated Regression Test Suite

The automated regression test suite tests all 7 modules end-to-end:
```bash
# Run automated regression test suite headlessly via CLI
npm test
```
Or trigger regression testing directly from the Admin Panel in the web interface.
