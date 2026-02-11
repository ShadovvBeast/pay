# SB0 Pay - Product Overview

SB0 Pay is a mobile-first Point of Sale (PoS) system designed to be the easiest payment solution for shop owners. The system integrates with the AllPay payment gateway to generate payment links and QR codes for customers to scan and pay using their mobile devices.

## Core Features

- Simple merchant registration and authentication
- Quick payment amount entry with mobile-optimized interface
- AllPay API integration for payment processing
- QR code generation for customer payments
- Transaction history and database storage
- Progressive Web App (PWA) for mobile installation
- Public API for third-party integrations with API key authentication
- Internationalization support (English, Hebrew, Arabic, Russian)

## Target Users

- Shop owners who need a simple PoS solution
- Merchants who want to accept mobile payments via QR codes
- Third-party platforms integrating payment processing (via Public API)

## Key Workflows

1. Merchant registers and logs in
2. Merchant enters payment amount
3. System generates AllPay payment link and QR code
4. Customer scans QR code and completes payment
5. Transaction is recorded in database
6. Merchant views transaction history

## API Integration

The system provides a public API (`/api/v1/payments`) for third-party integrations, secured with Bearer token authentication using API keys prefixed with `sb0_live_` or `sb0_test_`.
