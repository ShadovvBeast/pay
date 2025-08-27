# Requirements Document

## Introduction

SB0 Pay is a simple Point of Sale (PoS) system designed to be the easiest payment solution for shop owners. The system integrates with the AllPay API to generate payment links and displays QR codes for customers to scan and pay using their mobile devices. The focus is on minimal clicks and maximum speed for the user experience.

## Requirements

### Requirement 1

**User Story:** As a shop owner, I want to register and login to the system, so that I can securely access my PoS system and configure my payment settings.

#### Acceptance Criteria

1. WHEN a new shop owner accesses the system THEN they SHALL be presented with a registration form
2. WHEN registering THEN the system SHALL collect shop name, owner name, email, password, and all required AllPay merchant details
3. WHEN collecting AllPay details THEN the system SHALL store merchant ID, terminal details, success/failure URLs, and any other API parameters needed for payments
4. WHEN a registered shop owner returns THEN they SHALL login with email and password
5. IF login credentials are invalid THEN the system SHALL display an error and allow retry
6. WHEN successfully logged in THEN the system SHALL remember the session and proceed directly to the payment interface

### Requirement 2

**User Story:** As a shop owner, I want to quickly enter a payment amount and generate a payment link, so that I can process customer payments with minimal effort.

#### Acceptance Criteria

1. WHEN the logged-in shop owner accesses the payment interface THEN the system SHALL display an amount input field as the primary interface
2. WHEN the shop owner enters a valid amount THEN the system SHALL accept numeric values with up to 2 decimal places
3. WHEN the shop owner submits the amount THEN the system SHALL use pre-configured AllPay merchant details to generate a payment link within 3 seconds
4. IF the amount is invalid or empty THEN the system SHALL display a clear error message and prevent submission
5. WHEN generating the payment THEN the system SHALL use all merchant details stored during registration to minimize API call complexity

### Requirement 3

**User Story:** As a shop owner, I want the system to automatically handle API authentication, so that I don't need to manage credentials for each transaction.

#### Acceptance Criteria

1. WHEN the system processes payments THEN it SHALL use the AllPay API credentials (login: pp1012035, API key: E51C3EA351988CB77BCC97D2642A45AE) stored securely
2. WHEN making API calls THEN the system SHALL automatically include authentication headers
3. IF authentication fails THEN the system SHALL display an error message and prevent payment processing
4. WHEN authentication expires THEN the system SHALL automatically re-authenticate without user intervention

### Requirement 4

**User Story:** As a shop owner, I want to display a QR code immediately after creating a payment, so that customers can quickly scan and pay.

#### Acceptance Criteria

1. WHEN a payment link is successfully generated THEN the system SHALL immediately display a QR code containing the payment URL
2. WHEN the QR code is displayed THEN it SHALL be large enough to be easily scanned from a mobile device
3. WHEN displaying the QR code THEN the system SHALL also show the payment amount and a "New Payment" button
4. WHEN the shop owner clicks "New Payment" THEN the system SHALL return to the amount entry screen

### Requirement 5

**User Story:** As a shop owner, I want all payments to be stored in a database, so that I can track transaction history.

#### Acceptance Criteria

1. WHEN a payment link is generated THEN the system SHALL store the transaction details in the PostgreSQL database
2. WHEN storing transaction data THEN the system SHALL include amount, timestamp, payment link, transaction status, and shop owner ID
3. WHEN a payment is completed THEN the system SHALL update the transaction status in the database
4. IF database connection fails THEN the system SHALL still allow payment processing but log the error

### Requirement 6

**User Story:** As a shop owner, I want the system to have sensible defaults and require minimal configuration, so that I can start using it immediately after registration.

#### Acceptance Criteria

1. WHEN the system starts after login THEN it SHALL work with pre-configured settings without additional setup
2. WHEN entering amounts THEN the system SHALL default to the local currency format
3. WHEN generating payment links THEN the system SHALL use default AllPay settings for payment methods
4. WHEN displaying the interface THEN the system SHALL use a clean, minimal design optimized for speed

### Requirement 7

**User Story:** As a shop owner, I want the system to handle errors gracefully, so that payment processing is never completely blocked.

#### Acceptance Criteria

1. WHEN the AllPay API is unavailable THEN the system SHALL display a clear error message and retry option
2. WHEN network connectivity is lost THEN the system SHALL queue the payment request and retry when connection is restored
3. WHEN an API error occurs THEN the system SHALL display the error details and allow the user to try again
4. IF the database is unavailable THEN the system SHALL continue to process payments but warn about missing transaction logging