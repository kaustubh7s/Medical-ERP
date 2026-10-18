# CarePlus Pharmacy & Wellness ERP — External Pine Labs POS Terminal Integration

This repository contains the **CarePlus Pharmacy & Wellness Medical Store ERP**, integrated with a standalone, external **Pine Labs-style POS Terminal Simulator**.

The integration follows a decoupled, two-application architecture where the ERP communicates with the separately running POS terminal simulator via server-side REST APIs and real-time Server-Sent Events (SSE).

---

## 🚀 Quick Start Guide

### 1. Run the POS Terminal Simulator (Application 1)
Open a terminal in the simulator repository directory (`/Users/kaustubh/Desktop/PINELABS`):

```bash
cd /Users/kaustubh/Desktop/PINELABS
npm run dev
```
* Runs by default on: **`http://localhost:3001`**

### 2. Run the Medical Store ERP (Application 2)
In this repository (`/Users/kaustubh/Desktop/medical`):

```bash
cd /Users/kaustubh/Desktop/medical
npm run dev
```
* Runs by default on: **`http://localhost:3000`**

---

## ⚙️ Environment Variables

Configure the integration using environment variables in `.env.local` (see `.env.example`):

```ini
# Base URL where external POS Terminal Simulator is running
POS_TERMINAL_API_BASE_URL=http://localhost:3001

# Terminal Device Identity
POS_TERMINAL_DEVICE_ID=PINELABS-POS-M884
POS_TERMINAL_MERCHANT_NAME=CarePlus Pharmacy & Wellness

# Bearer Token obtained via Device Pairing Handshake (server-side only)
POS_TERMINAL_TOKEN=pos_live_ebce2ddbdd0f8120c30dd915ee783942043b0d74b3357e56
```

> **Security Note:** Authentication tokens and pairing secrets are strictly isolated on the server side (`src/lib/server/payment-terminal.ts`) and never leaked to browser client code.

---

## 💳 Payment Workflow & State Machine

```text
[IDLE]
  │
  ▼ Cashier clicks "Collect Payment on Terminal"
[REQUESTED] ── (ERP sends payload with exact payable amount & INV reference)
  │
  ▼ Simulator queues transaction on screen
[PROCESSING] ── (Customer taps card, inserts chip, or scans Bharat UPI QR)
  ├──► [SUCCESS] ──► [AUTHORITATIVE SERVER VERIFICATION] ──► [FINALIZE INVOICE & DEDUCT STOCK STRICTLY ONCE] ──► [OPEN RECEIPT]
  ├──► [FAILED] ──► (Preserve invoice as unpaid; display failure reason; allow retry)
  ├──► [CANCELLED] ──► (Cashier cancels in-flight transaction; reconcile state)
  └──► [TIMED_OUT / UNKNOWN] ──► [RECONCILIATION_REQUIRED] (No double-charging)
```

---

## 🛡️ Concurrency & Idempotency Guarantees

1. **Unique Payment Request IDs:** Every payment attempt generates a unique UUID `req-inv-${timestamp}-${hash}` bound to the invoice.
2. **Double-Click Protection:** UI locks and prevents multiple submissions while a payment is `REQUESTED` or `PROCESSING`.
3. **Strict Server-to-Server Verification:** Before finalizing an invoice, ERP's server verifies:
   - Payment Request ID matches
   - Invoice Reference matches
   - Settled Amount matches expected payable total within ±₹0.01 precision
   - Currency matches (`INR`)
   - Status is strictly `SUCCESS`
4. **Single Stock Deduction:** FEFO batch quantities are decremented strictly once upon authoritative confirmation.
5. **Persistence & Crash Recovery:** Transaction attempts are persisted in local storage (`CAREPLUS_TERMINAL_PAYMENT_ATTEMPTS_V1`). If the cashier refreshes or connection drops, active state and receipt details can be safely reconciled without duplicate billing.

---

## 📡 Dedicated ERP Integration Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/terminal/health` | `GET` | Checks terminal readiness (`READY`, `BUSY`, `UNAVAILABLE`, `OFFLINE`). |
| `/api/terminal/payment-request` | `POST` | Submits payment amount and invoice reference to simulator. |
| `/api/terminal/status` | `GET` | Queries transaction status by `transactionId` or `requestId`. |
| `/api/terminal/verify` | `POST` | Authoritatively verifies payment details before invoice finalization. |
| `/api/terminal/cancel` | `POST` | Cancels an active in-flight payment request on the terminal. |
| `/api/terminal/pair` | `GET / POST` | Performs the 6-digit one-time code pairing handshake. |
| `/api/terminal/events` | `GET` | Proxies SSE event stream from the simulator to the ERP client. |

---

## 🧾 Receipt Generation

Upon confirmed terminal payment, the ERP automatically opens the Tax Invoice modal with:
- Store Name & Drug License Details
- Invoice Number, Date & Patient Name
- Medicine batch details & FEFO dispensing
- Tax breakdown (CGST, SGST, IGST) & Round-off
- Payment Method: **Pine Labs POS Terminal**
- Terminal Device ID: `PINELABS-POS-M884`
- Transaction ID (e.g. `TXN-20261017-...`)
- Terminal Auth Code & RRN
- Card (`**** 4111 VISA`) or UPI VPA (`patient@upi`)
- Verified Status: **SETTLED (DEMO)**

---

## 🧪 Automated Integration Tests

To run the full 15-scenario integration test suite:

```bash
npm test
```

### Covered Scenarios:
1. Successful demo payment results in exactly one paid invoice and receipt.
2. Failed payment does not finalize invoice.
3. Cancelled payment does not finalize invoice unless subsequent success verified.
4. Timeout leaves transaction in pending or `RECONCILIATION_REQUIRED`.
5. Lost connection after successful payment can be recovered without duplicate billing.
6. Duplicate success events do not cause duplicate stock deductions.
7. Repeated clicks do not create multiple active charges (idempotency).
8. Mismatched amount is rejected.
9. Mismatched invoice reference is rejected.
10. Mismatched payment request ID is rejected.
11. Pending payment does not generate a paid receipt.
12. Existing cash, UPI, card, credit, and split-payment workflows remain operational.
13. Browser refresh after successful payment retains correct final invoice.
14. Simulator restart does not erase ERP payment records.
15. Terminal disconnection returns `OFFLINE` and prevents false successes.

---

## 🔧 Troubleshooting

- **"Terminal Disconnected" in POS Billing:**
  - Verify that the POS simulator is running on port 3001 (`curl http://localhost:3001/api/terminal/health`).
  - Check `POS_TERMINAL_API_BASE_URL` in `.env.local`.
- **"Device Busy (HTTP 409)":**
  - Another transaction is currently active on the terminal simulator. Cancel it or wait for completion.
- **Pairing Issues:**
  - Navigate to **Settings & Backup** > **Pine Labs POS Terminal Integration**.
  - Click **Fetch Pairing Code** to generate a 6-digit code on the simulator, then click **Pair Device**.
