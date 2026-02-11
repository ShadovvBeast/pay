@echo off
REM Quick API test script using curl for Windows
REM Usage: test-api-curl.bat YOUR_API_KEY

setlocal enabledelayedexpansion

set API_KEY=%1
if "%API_BASE_URL%"=="" set API_BASE_URL=https://sb0pay-678576192331.us-central1.run.app/api/v1

if "%API_KEY%"=="" (
    echo Usage: test-api-curl.bat YOUR_API_KEY
    exit /b 1
)

echo Testing SB0 Pay API
echo =====================
echo.
echo API Base URL: %API_BASE_URL%
echo API Key: %API_KEY:~0,20%...
echo.

REM Test 1: Create a simple payment
echo Test 1: Creating a simple payment...
echo ------------------------------------
curl -X POST "%API_BASE_URL%/payments" ^
  -H "Authorization: Bearer %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\": 100.00, \"description\": \"Test Payment - Simple\", \"customerEmail\": \"test@example.com\", \"customerName\": \"Test Customer\"}"
echo.
echo.

REM Test 2: Create payment with line items
echo Test 2: Creating payment with line items...
echo --------------------------------------------
curl -X POST "%API_BASE_URL%/payments" ^
  -H "Authorization: Bearer %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\": 250.00, \"description\": \"Test Payment - With Line Items\", \"lineItems\": [{\"name\": \"Product A\", \"price\": 100.00, \"quantity\": 2, \"includesVat\": true}, {\"name\": \"Product B\", \"price\": 50.00, \"quantity\": 1, \"includesVat\": true}], \"customerEmail\": \"test@example.com\", \"customerName\": \"Test Customer\", \"customerPhone\": \"+972501234567\", \"maxInstallments\": 12, \"metadata\": {\"orderId\": \"TEST-123\", \"source\": \"curl-test\"}}"
echo.
echo.

REM Test 3: List payments
echo Test 3: Listing payments...
echo ---------------------------
curl -X GET "%API_BASE_URL%/payments?limit=5" ^
  -H "Authorization: Bearer %API_KEY%"
echo.
echo.

echo =======================================
echo API Testing Complete!
echo =======================================

endlocal
