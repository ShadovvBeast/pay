# SB0 Pay — System Design Document

## 1. What is SB0 Pay?

SB0 Pay is a mobile-first Point of Sale system designed for shop owners who want the simplest way to accept payments. A merchant enters a payment amount, the system generates a QR code, the customer scans it with their phone, pays, and the transaction is recorded. That's the core loop.

Beyond the merchant-facing app, SB0 Pay also provides a public API so third-party platforms (e-commerce sites, booking systems, etc.) can create and manage payments programmatically.

---

## 2. Who Uses It?

There are three types of users:

- **Merchants (Shop Owners)** — The primary users. They register, log in, create payments, and track their transaction history through a mobile-friendly web app they can install on their phone.
- **Customers** — They don't have accounts. They simply scan a QR code presented by the merchant and complete payment on the AllPay payment page.
- **Third-Party Developers** — They integrate SB0 Pay into their own platforms using the public API and API keys.

---

## 3. Pages & Screens

The app has a small number of focused pages. Here's every screen a user can see and what it does.

### 3.1 Authentication Page (`/auth`)

This is the entry point for unauthenticated users. It has two modes that the user can toggle between:

**Login Mode**
- Email and password fields
- "Remember me" checkbox that saves the email for next time
- Show/hide password toggle
- "Forgot password?" link
- "Don't have an account? Create one" link to switch to registration
- PWA install prompt at the bottom (if the app isn't installed yet)
- PWA status indicator at the top

**Registration Mode (2-step wizard)**

Step 1 — Business Information:
- Business name
- Contact person (owner name)
- Email address
- Password (with strength requirements shown on validation)
- Confirm password
- Show/hide password toggles for both fields

Step 2 — Business Details:
- Company registration number (ח"פ) — exactly 9 digits
- Preferred currency dropdown (Israeli Shekel, US Dollar, Euro, Ugandan Shilling)
- Preferred language dropdown (Hebrew, English, Russian, Arabic)
- An info box explaining "What happens next?" — reassuring the merchant that setup is automatic

A step indicator (1 → 2) shows progress. The user can go back to step 1 to edit before submitting.

After successful login or registration, the user is automatically redirected to the Dashboard.

---

### 3.2 Dashboard (`/dashboard`)

This is the main screen after login. It uses a flat view-switching pattern (not separate pages) with four views:

#### Overview (default view)

What the merchant sees when they first land:

- **"Create Payment" button** — large, prominent, takes up the full width. This is the primary action.
- **PWA Install Prompt** — if the app isn't installed on the home screen yet, a card encourages installation.
- **Three information cards:**
  - **Shop Information** — shop name, owner name, email
  - **Business Configuration** — company number (ח"פ), currency (with symbol), language (with native name)
  - **Quick Actions** — three buttons: "Create Payment", "View Transactions", "Settings"

The top navigation bar shows:
- SB0 Pay logo and name
- "← Back to Dashboard" link (when in a sub-view)
- Shop name (on larger screens)
- PWA status indicator
- "Sign Out" button

#### Payment View

Accessed by tapping "Create Payment" from the overview. This is a multi-step flow:

**Step 1 — Amount Entry (`AmountInput` component)**
- A large currency symbol display (₪, $, €, or USh depending on merchant config)
- A big, centered number input field optimized for touch — large font, decimal keyboard on mobile
- Real-time formatted amount display below the input (e.g., "₪1,234.56")
- Validation messages (amount required, must be > 0, max 999,999.99, max 2 decimal places)
- Quick amount buttons: 10, 50, 100 in the merchant's currency for fast entry
- "Create Payment" submit button (disabled until a valid amount is entered)
- Loading spinner when payment is being created

**Step 2 — QR Code Display (`QRCodeDisplay` component)**

Once the payment is created, this screen shows:
- The payment amount in large text (e.g., "₪250.00")
- A QR code image that the customer scans
- Step-by-step instructions for the customer:
  1. Scan the QR code with your phone camera
  2. Choose your payment method: Credit Card, Bit, or Apple Pay
  3. Complete the payment securely
- "New Payment" button to start over
- "Open Payment Link" button to open the AllPay payment page in a new tab (useful if the merchant wants to send the link directly)

**Step 3 — Status Polling**

While the QR code is displayed, the app automatically checks for payment completion:
- A blue "Waiting for payment..." indicator with a spinner
- When payment completes: green success card with ✅ and "Create New Payment" button
- When payment fails: red error card with ❌ and "Try Again" button
- When payment is cancelled: yellow warning card with ⚠️ and "Create New Payment" button

**Error State**

If payment creation fails (e.g., AllPay is down), a red error card shows the error message with a "Try Again" button.

#### Transactions View

Accessed by tapping "View Transactions" from the overview.

- Header showing "Transaction History" with total count and a "Refresh" button
- A scrollable list of transactions, each showing:
  - Status icon (✅ completed, ⏳ pending, ❌ failed, 🚫 cancelled)
  - Payment ID (last 8 characters)
  - Date and time
  - Status badge (color-coded: green/yellow/red/gray)
  - Action links:
    - "Details" — opens the detail modal
    - "Cancel" — only for pending transactions
    - "Refund" — only for completed transactions
  - Amount with currency symbol (right-aligned)
- "Load More" button at the bottom if there are more transactions
- Empty state: "No Transactions Yet" with a clipboard icon

**Transaction Details Modal**

A full-screen overlay that shows:
- Transaction ID (full UUID)
- Amount with currency
- Status
- Created and updated timestamps
- AllPay payment details (when available):
  - Customer name, email, phone
  - Card number (masked), card brand, foreign card indicator
  - AllPay transaction ID and order ID
  - AllPay status
  - AllPay amount
  - Any additional fields from AllPay
- "View Receipt" button (if a receipt link exists) — opens in new tab
- "Close" button

**Refund Modal**

A smaller overlay for processing refunds:
- Refund amount input (pre-filled with the full transaction amount)
- Note explaining that refunds depend on AllPay account funds
- "Cancel" and "Process Refund" buttons
- Loading state while processing

#### Settings View

Accessed by tapping "Settings" from the overview. Has two tabs:

**Profile Tab**
- Displays all merchant information in read-only mode by default
- "Edit Settings" button switches to edit mode
- Editable fields:
  - Shop name
  - Owner name
  - Email address
  - Company number (ח"פ)
  - Currency (dropdown: Israeli Shekel, US Dollar, Euro, Ugandan Shilling)
  - Language (dropdown: Hebrew, English, Russian, Arabic)
- "Save Changes" and "Cancel" buttons in edit mode
- Success/error messages after saving

**API Keys Tab**

This is the `ApiKeyManagement` component. It shows:

- Header with "API Keys" title and "Create API Key" button
- **New key creation form** (shown when "Create API Key" is clicked):
  - Key name input (e.g., "Production API", "Mobile App", "Website Integration")
  - Expiration date picker (optional — leave empty for no expiration)
  - Permissions grid — for each resource (Payments, Transactions, Webhooks, Profile), checkboxes for each action (Create, Read, Update, Delete)
  - "Create API Key" and "Cancel" buttons

- **New key display** (shown once after creation):
  - Green success banner with 🔑 icon
  - The full API key displayed in monospace font (this is the only time it's shown)
  - "Copy" button
  - "I've saved the key securely" dismissal link

- **API keys list** — each key shows:
  - Key name and active/inactive badge
  - Key prefix with masked remainder (e.g., `sb0_live_12345678••••••••••••••••••••••••`)
  - Created date
  - Last used date (if ever used)
  - Expiration date (if set)
  - Permission badges (e.g., "payments: create, read")
  - "Disable"/"Enable" toggle button
  - "Delete" button (with confirmation dialog)

- **Empty state**: "No API Keys Yet" with a key icon and "Create Your First API Key" button

- **API Documentation section** — displayed below the keys list, showing inline documentation for the public API with endpoint descriptions and code examples

---

### 3.3 Payment Success Page (`/payment/success`)

This is a standalone page that customers (not merchants) see after completing a payment. It's typically reached via AllPay's redirect after successful payment.

- Green checkmark icon
- "Payment Successful!" heading
- "Your payment has been processed successfully. Thank you for your purchase!"
- Payment details box (if available from URL parameters):
  - Order ID
  - Transaction ID
  - Amount and currency
- "Return to Dashboard" button (for merchants)
- "Print Receipt" button
- Support contact note

---

### 3.4 Payment Failure Page (`/payment/failure`)

The counterpart to the success page, shown when a payment fails.

- Red X icon
- "Payment Failed" heading
- Human-readable error message based on error code:
  - "Payment was declined by your bank"
  - "Insufficient funds"
  - "Invalid card details"
  - "Card expired"
  - "Transaction timeout"
  - "Payment cancelled by user"
  - Generic: "Payment could not be processed"
- Order ID (if available)
- "Try Again" button
- "Return to Dashboard" button
- Help box: "If you continue to experience issues, please check your payment details or contact your bank."

---

## 4. Merchant Registration & Profile

### Signing Up

A new merchant provides:
- Email and password (their login credentials)
- Shop name and owner name
- Business details:
  - Company number (Israeli ח"פ business registration — exactly 9 digits)
  - Preferred currency (Israeli Shekel, US Dollar, Euro, or Ugandan Shilling)
  - Preferred language (Hebrew, English, Russian, or Arabic)

Once registered, the merchant is automatically logged in and taken to their dashboard.

### Managing Their Profile

From the Settings page (Profile tab), merchants can update any of their information at any time — shop name, owner name, email, company number, currency, and language. Changing the currency or language affects how future payment pages are generated.

---

## 5. Creating a Payment

This is the heart of the system. The flow is intentionally simple:

1. **Merchant taps "Create Payment"** on their dashboard
2. **Enters the amount** — a large, mobile-friendly number pad optimized for quick entry. Quick-select buttons (10, 50, 100) are available for common amounts.
3. **System generates a QR code** — behind the scenes, the system talks to AllPay (the payment gateway) to create a payment link, then converts that link into a QR code
4. **Customer scans the QR code** — this opens the AllPay payment page on their phone where they can pay by credit card, Apple Pay, or Bit
5. **System watches for completion** — the app automatically polls for status updates and shows a green checkmark when payment is confirmed, or an error if it fails
6. **Merchant taps "New Payment"** to start the next one

The whole process takes seconds. The merchant never has to type a customer's card number or handle sensitive payment data — AllPay handles all of that.

---

## 6. Transaction History

Every payment the merchant creates is recorded and visible in the Transaction History view. For each transaction, the merchant can see:

- The amount and currency
- Current status (pending, completed, failed, cancelled, refunded)
- When it was created and last updated
- A short transaction ID for reference

### Viewing Details

Tapping "Details" on any transaction opens a modal that shows everything AllPay knows about the payment:
- Customer name, email, and phone (if provided)
- Card information (masked card number, card brand, whether it's a foreign card)
- AllPay's own transaction and order IDs
- A link to view/print the payment receipt

### Cancelling a Payment

If a payment is still pending (the customer hasn't paid yet), the merchant can cancel it directly from the transaction list. Cancelled payments cannot be reopened.

### Refunding a Payment

If a payment has been completed, the merchant can issue a refund via a dedicated refund modal:
- **Full refund** — returns the entire amount to the customer
- **Partial refund** — returns a specific amount (for example, if one item in an order was returned)

A partially refunded payment can later be fully refunded. The system tracks whether a refund is full or partial.

---

## 7. Public API for Third-Party Integrations

Beyond the merchant app, SB0 Pay exposes a REST API that external platforms can use to create and manage payments on behalf of a merchant.

### How It Works

1. The merchant generates an API key from their Settings → API Keys tab
2. The merchant gives that key to the third-party developer
3. The developer includes the key in their API requests
4. Payments created via the API are linked to the merchant's account and appear in their transaction history

### What the API Can Do

- **Create payments** with rich options:
  - Itemized line items (product name, price, quantity, VAT handling)
  - Customer information (name, email, phone, ID number)
  - Installment plans (1–12 monthly payments)
  - Payment expiration dates
  - Pre-authorization (hold funds without charging)
  - Apple Pay and Bit payment options
  - Custom redirect URLs for success and cancellation
  - Webhook URLs for real-time payment notifications
  - Custom metadata for the developer's own tracking
- **Retrieve payment details** — check the status and details of any payment
- **List payments** — paginated list of all payments
- **Refund payments** — full or partial refunds
- **Cancel payments** — cancel pending payments

### API Key Management

Merchants manage their API keys from the Settings → API Keys tab:

- **Create keys** with a custom name and specific permissions (e.g., "can create payments but not refund them")
- **View all keys** with their status, last used date, and creation date
- **Deactivate/reactivate keys** without deleting them
- **Set expiration dates** so keys automatically stop working after a certain date
- **Delete keys** permanently
- **View usage statistics** — how many requests each key has made, success/error rates, daily breakdown

Each key's permissions are granular. A merchant can create a key that only allows reading payment data but not creating new payments, or one that can do everything. The available permission areas are: payments, transactions, webhooks, and profile — each with create, read, update, and delete actions.

---

## 8. Webhook Notifications

When a customer completes (or fails) a payment, AllPay sends a notification back to SB0 Pay. The system automatically updates the transaction status in the database. This means:

- The merchant's app updates in real-time (via polling)
- Third-party integrations can also receive these notifications if they provide a webhook URL when creating a payment

---

## 9. Installable Mobile App (PWA)

SB0 Pay is a Progressive Web App, which means merchants can install it on their phone's home screen just like a native app. Benefits:

- **Works offline** — if the merchant loses internet connection, they can still queue up payments. When connectivity returns, the queued payments are automatically processed.
- **Installable** — the app prompts merchants to add it to their home screen for quick access. The install prompt appears on both the login page and the dashboard.
- **Fast** — once installed, it loads instantly without needing to open a browser

The dashboard shows the current online/offline status and whether the app is installed.

---

## 10. Multi-Language Support

The app supports four languages:
- **Hebrew** (עברית) — default, right-to-left layout
- **English** — left-to-right layout
- **Russian** (Русский) — left-to-right layout
- **Arabic** (العربية) — right-to-left layout

The merchant's language preference (set during registration or in settings) determines:
- The app interface language
- The language of the AllPay payment page that customers see

The layout automatically flips for right-to-left languages (Hebrew and Arabic).

---

## 11. API Documentation

The system includes built-in API documentation accessible from the API Keys tab in Settings. This provides:

- Complete endpoint descriptions with all parameters
- Request and response examples
- Ready-to-use code samples in cURL, JavaScript, and Python
- An OpenAPI 3.0 specification for automatic client generation

This makes it easy for third-party developers to integrate without needing separate documentation.

---

## 12. Payment Gateway Integration (AllPay)

AllPay is the payment processor that handles the actual money movement. SB0 Pay uses AllPay to:

- Generate payment pages where customers enter their card details
- Support multiple payment methods (credit cards, Apple Pay, Bit)
- Handle installment plans for larger purchases
- Process refunds back to the customer's payment method
- Send webhook notifications when payment status changes
- Generate receipts for completed transactions

The merchant never interacts with AllPay directly — SB0 Pay handles all communication with the gateway behind the scenes. The merchant's AllPay credentials are configured once during system setup and stored securely.

---

## 13. Security & Access Control

- **Merchants** access the app through email/password login with automatic session management. Sessions last 7 days before requiring re-login.
- **API consumers** authenticate with API keys that have specific permissions. Keys can be deactivated or expired at any time.
- **Customers** don't authenticate with SB0 Pay at all — they interact only with the AllPay payment page.
- All payment data flows through AllPay's secure infrastructure. SB0 Pay never sees or stores credit card numbers.
- Every API request is logged with the endpoint, method, status, IP address, and timestamp for audit purposes.

---

## 14. Supported Currencies & Payment Options

| Currency | Symbol | Code |
|----------|--------|------|
| Israeli Shekel | ₪ | ILS |
| US Dollar | $ | USD |
| Euro | € | EUR |
| Ugandan Shilling | USh | UGX |

Payment methods available to customers (depending on AllPay configuration):
- Credit/debit cards
- Apple Pay
- Bit (Israeli mobile payment)
- Installment plans (1–12 months)

---

## 15. Key User Journeys

### New Merchant Getting Started
Register (2-step form) → Land on dashboard → Tap "Create Payment" → Enter amount → Show QR to customer → Payment confirmed → View in transaction history

### Returning Merchant Daily Use
Open app (installed on home screen) → Tap "Create Payment" → Enter amount → Show QR → Repeat throughout the day → Check transaction history at end of day

### Third-Party Integration Setup
Merchant goes to Settings → API Keys tab → Creates a new key with desired permissions → Copies the key (shown only once) → Gives it to the developer → Developer uses the key to make API calls

### Handling a Refund
Merchant opens Transaction History → Finds the completed transaction → Taps "Refund" → Enters refund amount (or leaves full amount) → Confirms → Refund is processed through AllPay

### Offline Payment
Merchant loses internet → App shows offline indicator → Merchant creates payment → Payment is queued locally → Internet returns → Queued payment is automatically processed

---

## 16. Page Map Summary

| URL | Page | Who Sees It | Purpose |
|-----|------|-------------|---------|
| `/auth` | Authentication | Unauthenticated users | Login or register |
| `/dashboard` | Dashboard | Logged-in merchants | Main hub — create payments, view transactions, manage settings |
| `/dashboard` → Overview | Dashboard Overview | Logged-in merchants | Shop info, quick actions, PWA install |
| `/dashboard` → Payment | Payment Flow | Logged-in merchants | Enter amount → QR code → wait for payment |
| `/dashboard` → Transactions | Transaction History | Logged-in merchants | View, cancel, refund past payments |
| `/dashboard` → Settings | Settings | Logged-in merchants | Edit profile, manage API keys, view API docs |
| `/payment/success` | Payment Success | Customers (via redirect) | Confirmation after successful payment |
| `/payment/failure` | Payment Failure | Customers (via redirect) | Error details after failed payment |
