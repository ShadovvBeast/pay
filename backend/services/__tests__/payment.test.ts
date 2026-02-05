import { describe, it, expect, beforeEach, afterEach, mock, beforeAll, afterAll } from 'bun:test';
import { PaymentService } from '../payment';
import type { User, Transaction, AllPayWebhookPayload } from '../../types';

// Mock AllPay client
const mockAllPayClient = {
    createPayment: mock(),
    getPaymentStatus: mock(),
    validateWebhookSignature: mock(),
    healthCheck: mock()
};

// Mock transaction repository
const mockTransactionRepository = {
    create: mock(),
    findById: mock(),
    findByUserId: mock(),
    findByAllPayId: mock(),
    findByUserIdInDateRange: mock(),
    updateStatus: mock()
};

// Mock QRCode
const mockQRCode = {
    toDataURL: mock()
};

// Mock the modules
mock.module('../allpay', () => ({
    allPayClient: mockAllPayClient
}));

mock.module('../transactionRepository', () => ({
    transactionRepository: mockTransactionRepository
}));

mock.module('qrcode', () => mockQRCode);

describe('PaymentService', () => {
    let paymentService: PaymentService;
    let mockUser: User;
    let mockTransaction: Transaction;

    beforeEach(() => {
        paymentService = new PaymentService();

        mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            shopName: 'Test Shop',
            ownerName: 'Test Owner',
            merchantConfig: {
                merchantId: 'MERCHANT_123',
                terminalId: 'TERMINAL_123',
                successUrl: 'https://example.com/success',
                failureUrl: 'https://example.com/failure',
                notificationUrl: 'https://example.com/webhook',
                currency: 'ILS',
                language: 'he'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mockTransaction = {
            id: 'txn-123',
            userId: 'user-123',
            amount: 100.50,
            currency: 'ILS',
            paymentUrl: 'https://pay.allpay.co.il/payment/12345',
            allpayTransactionId: 'ALLPAY_TXN_123',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Clear all mocks
        mockAllPayClient.createPayment.mockClear();
        mockAllPayClient.getPaymentStatus.mockClear();
        mockAllPayClient.validateWebhookSignature.mockClear();
        mockAllPayClient.healthCheck.mockClear();
        mockTransactionRepository.create.mockClear();
        mockTransactionRepository.findById.mockClear();
        mockTransactionRepository.findByUserId.mockClear();
        mockTransactionRepository.findByAllPayId.mockClear();
        mockTransactionRepository.findByUserIdInDateRange.mockClear();
        mockTransactionRepository.updateStatus.mockClear();
        mockQRCode.toDataURL.mockClear();
    });

    describe('createPayment', () => {
        it('should create payment successfully', async () => {
            // Mock AllPay response
            mockAllPayClient.createPayment.mockResolvedValueOnce({
                success: true,
                paymentUrl: 'https://pay.allpay.co.il/payment/12345',
                transactionId: 'ALLPAY_TXN_123'
            });

            // Mock transaction creation
            mockTransactionRepository.create.mockResolvedValueOnce(mockTransaction);

            // Mock QR code generation
            mockQRCode.toDataURL.mockResolvedValueOnce('data:image/png;base64,mockqrcode');

            const result = await paymentService.createPayment(mockUser, {
                amount: 100.50,
                description: 'Test payment'
            });

            expect(mockAllPayClient.createPayment).toHaveBeenCalledWith(
                100.50,
                mockUser.merchantConfig,
                'Test payment'
            );

            expect(mockTransactionRepository.create).toHaveBeenCalledWith({
                userId: 'user-123',
                amount: 100.50,
                currency: 'ILS',
                paymentUrl: 'https://pay.allpay.co.il/payment/12345',
                allpayTransactionId: 'ALLPAY_TXN_123'
            });

            expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
                'https://pay.allpay.co.il/payment/12345',
                expect.objectContaining({
                    type: 'image/png',
                    width: 256,
                    errorCorrectionLevel: 'M'
                })
            );

            expect(result).toEqual({
                transaction: mockTransaction,
                paymentUrl: 'https://pay.allpay.co.il/payment/12345',
                qrCodeDataUrl: 'data:image/png;base64,mockqrcode'
            });
        });

        it('should validate amount is positive', async () => {
            await expect(paymentService.createPayment(mockUser, {
                amount: -10
            })).rejects.toThrow('Amount must be a positive number');

            await expect(paymentService.createPayment(mockUser, {
                amount: 0
            })).rejects.toThrow('Amount must be a positive number');
        });

        it('should validate amount does not exceed maximum', async () => {
            await expect(paymentService.createPayment(mockUser, {
                amount: 1000000
            })).rejects.toThrow('Amount exceeds maximum allowed value');
        });

        it('should handle AllPay API errors', async () => {
            mockAllPayClient.createPayment.mockResolvedValueOnce({
                success: false,
                errorMessage: 'Invalid merchant configuration'
            });

            await expect(paymentService.createPayment(mockUser, {
                amount: 100
            })).rejects.toThrow('Invalid merchant configuration');
        });

        it('should handle QR code generation errors', async () => {
            mockAllPayClient.createPayment.mockResolvedValueOnce({
                success: true,
                paymentUrl: 'https://pay.allpay.co.il/payment/12345',
                transactionId: 'ALLPAY_TXN_123'
            });

            mockTransactionRepository.create.mockResolvedValueOnce(mockTransaction);
            mockQRCode.toDataURL.mockRejectedValueOnce(new Error('QR generation failed'));

            await expect(paymentService.createPayment(mockUser, {
                amount: 100
            })).rejects.toThrow('Failed to generate QR code');
        });
    });

    describe('getPaymentStatus', () => {
        it('should return existing transaction if already completed', async () => {
            const completedTransaction = { ...mockTransaction, status: 'completed' as const };
            mockTransactionRepository.findById.mockResolvedValueOnce(completedTransaction);

            const result = await paymentService.getPaymentStatus('txn-123');

            expect(result).toEqual(completedTransaction);
            expect(mockAllPayClient.getPaymentStatus).not.toHaveBeenCalled();
        });

        it('should check AllPay status for pending transactions', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(mockTransaction);

            mockAllPayClient.getPaymentStatus.mockResolvedValueOnce({
                success: true,
                status: 'completed'
            });

            const updatedTransaction = { ...mockTransaction, status: 'completed' as const };
            mockTransactionRepository.updateStatus.mockResolvedValueOnce(updatedTransaction);

            const result = await paymentService.getPaymentStatus('txn-123');

            expect(mockAllPayClient.getPaymentStatus).toHaveBeenCalledWith('ALLPAY_TXN_123');
            expect(mockTransactionRepository.updateStatus).toHaveBeenCalledWith('txn-123', 'completed');
            expect(result).toEqual(updatedTransaction);
        });

        it('should handle transaction not found', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(null);

            await expect(paymentService.getPaymentStatus('nonexistent')).rejects.toThrow('Transaction not found');
        });

        it('should handle AllPay API errors gracefully', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(mockTransaction);
            mockAllPayClient.getPaymentStatus.mockRejectedValueOnce(new Error('API error'));

            const result = await paymentService.getPaymentStatus('txn-123');

            // Should return original transaction when AllPay API fails
            expect(result).toEqual(mockTransaction);
        });
    });

    describe('processWebhook', () => {
        let mockWebhookPayload: AllPayWebhookPayload;

        beforeEach(() => {
            mockWebhookPayload = {
                transactionId: 'ALLPAY_TXN_123',
                status: 'completed',
                amount: 10050,
                currency: 'ILS',
                timestamp: '2024-01-01T12:00:00Z',
                signature: 'valid_signature'
            };
        });

        it('should process valid webhook successfully', async () => {
            mockAllPayClient.validateWebhookSignature.mockReturnValueOnce(true);
            mockTransactionRepository.findByAllPayId.mockResolvedValueOnce(mockTransaction);

            const updatedTransaction = { ...mockTransaction, status: 'completed' as const };
            mockTransactionRepository.updateStatus.mockResolvedValueOnce(updatedTransaction);

            const result = await paymentService.processWebhook(mockWebhookPayload, 'valid_signature');

            expect(mockAllPayClient.validateWebhookSignature).toHaveBeenCalledWith(
                mockWebhookPayload,
                'valid_signature'
            );
            expect(mockTransactionRepository.findByAllPayId).toHaveBeenCalledWith('ALLPAY_TXN_123');
            expect(mockTransactionRepository.updateStatus).toHaveBeenCalledWith('txn-123', 'completed');
            expect(result).toEqual({
                success: true,
                transactionId: 'txn-123'
            });
        });

        it('should reject webhook with invalid signature', async () => {
            mockAllPayClient.validateWebhookSignature.mockReturnValueOnce(false);

            const result = await paymentService.processWebhook(mockWebhookPayload, 'invalid_signature');

            expect(result).toEqual({
                success: false,
                error: 'Invalid signature'
            });
            expect(mockTransactionRepository.findByAllPayId).not.toHaveBeenCalled();
        });

        it('should handle transaction not found', async () => {
            mockAllPayClient.validateWebhookSignature.mockReturnValueOnce(true);
            mockTransactionRepository.findByAllPayId.mockResolvedValueOnce(null);

            const result = await paymentService.processWebhook(mockWebhookPayload, 'valid_signature');

            expect(result).toEqual({
                success: false,
                error: 'Transaction not found'
            });
        });

        it('should not update status if unchanged', async () => {
            const pendingTransaction = { ...mockTransaction, status: 'pending' as const };
            const pendingWebhook = { ...mockWebhookPayload, status: 'pending' };

            mockAllPayClient.validateWebhookSignature.mockReturnValueOnce(true);
            mockTransactionRepository.findByAllPayId.mockResolvedValueOnce(pendingTransaction);

            const result = await paymentService.processWebhook(pendingWebhook, 'valid_signature');

            expect(mockTransactionRepository.updateStatus).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                transactionId: 'txn-123'
            });
        });
    });

    describe('getTransactionHistory', () => {
        it('should get transaction history with default pagination', async () => {
            const mockTransactions = [mockTransaction];
            mockTransactionRepository.findByUserId.mockResolvedValueOnce(mockTransactions);

            const result = await paymentService.getTransactionHistory('user-123');

            expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 50, 0);
            expect(result).toEqual(mockTransactions);
        });

        it('should get transaction history with custom pagination', async () => {
            const mockTransactions = [mockTransaction];
            mockTransactionRepository.findByUserId.mockResolvedValueOnce(mockTransactions);

            const result = await paymentService.getTransactionHistory('user-123', 10, 20);

            expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', 10, 20);
            expect(result).toEqual(mockTransactions);
        });

        it('should handle repository errors', async () => {
            mockTransactionRepository.findByUserId.mockRejectedValueOnce(new Error('DB error'));

            await expect(paymentService.getTransactionHistory('user-123')).rejects.toThrow(
                'Failed to retrieve transaction history'
            );
        });
    });

    describe('cancelPayment', () => {
        it('should cancel pending payment successfully', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(mockTransaction);

            const cancelledTransaction = { ...mockTransaction, status: 'cancelled' as const };
            mockTransactionRepository.updateStatus.mockResolvedValueOnce(cancelledTransaction);

            const result = await paymentService.cancelPayment('txn-123', 'user-123');

            expect(mockTransactionRepository.updateStatus).toHaveBeenCalledWith('txn-123', 'cancelled');
            expect(result).toEqual(cancelledTransaction);
        });

        it('should reject cancellation of non-pending transactions', async () => {
            const completedTransaction = { ...mockTransaction, status: 'completed' as const };
            mockTransactionRepository.findById.mockResolvedValueOnce(completedTransaction);

            await expect(paymentService.cancelPayment('txn-123', 'user-123')).rejects.toThrow(
                'Can only cancel pending transactions'
            );
        });

        it('should reject unauthorized cancellation', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(mockTransaction);

            await expect(paymentService.cancelPayment('txn-123', 'other-user')).rejects.toThrow(
                'Unauthorized to cancel this transaction'
            );
        });

        it('should handle transaction not found', async () => {
            mockTransactionRepository.findById.mockResolvedValueOnce(null);

            await expect(paymentService.cancelPayment('nonexistent', 'user-123')).rejects.toThrow(
                'Transaction not found'
            );
        });
    });

    describe('getPaymentStats', () => {
        it('should calculate payment statistics correctly', async () => {
            const mockTransactions = [
                { ...mockTransaction, status: 'completed' as const, amount: 100 },
                { ...mockTransaction, status: 'completed' as const, amount: 200 },
                { ...mockTransaction, status: 'failed' as const, amount: 50 },
                { ...mockTransaction, status: 'pending' as const, amount: 75 }
            ];

            mockTransactionRepository.findByUserIdInDateRange.mockResolvedValueOnce(mockTransactions);

            const result = await paymentService.getPaymentStats('user-123', 30);

            expect(mockTransactionRepository.findByUserIdInDateRange).toHaveBeenCalledWith(
                'user-123',
                expect.any(Date),
                expect.any(Date)
            );

            expect(result).toEqual({
                totalAmount: 300, // Only completed transactions
                totalTransactions: 4,
                completedTransactions: 2,
                failedTransactions: 1,
                pendingTransactions: 1
            });
        });

        it('should handle empty transaction history', async () => {
            mockTransactionRepository.findByUserIdInDateRange.mockResolvedValueOnce([]);

            const result = await paymentService.getPaymentStats('user-123');

            expect(result).toEqual({
                totalAmount: 0,
                totalTransactions: 0,
                completedTransactions: 0,
                failedTransactions: 0,
                pendingTransactions: 0
            });
        });
    });

    describe('mapAllPayStatusToTransactionStatus', () => {
        it('should map AllPay statuses correctly', async () => {
            // Test through the webhook processing which uses the private method
            const testCases = [
                { allPayStatus: 'completed', expected: 'completed' },
                { allPayStatus: 'success', expected: 'completed' },
                { allPayStatus: 'approved', expected: 'completed' },
                { allPayStatus: 'failed', expected: 'failed' },
                { allPayStatus: 'declined', expected: 'failed' },
                { allPayStatus: 'error', expected: 'failed' },
                { allPayStatus: 'cancelled', expected: 'cancelled' },
                { allPayStatus: 'canceled', expected: 'cancelled' },
                { allPayStatus: 'timeout', expected: 'failed' },
                { allPayStatus: 'expired', expected: 'failed' },
                { allPayStatus: 'pending', expected: 'pending' },
                { allPayStatus: 'processing', expected: 'pending' },
                { allPayStatus: 'unknown_status', expected: 'failed' }
            ];

            for (const testCase of testCases) {
                mockAllPayClient.validateWebhookSignature.mockReturnValueOnce(true);
                mockTransactionRepository.findByAllPayId.mockResolvedValueOnce(mockTransaction);

                const updatedTransaction = { ...mockTransaction, status: testCase.expected as any };
                mockTransactionRepository.updateStatus.mockResolvedValueOnce(updatedTransaction);

                const webhook = {
                    ...mockWebhookPayload,
                    status: testCase.allPayStatus
                };

                await paymentService.processWebhook(webhook, 'valid_signature');

                expect(mockTransactionRepository.updateStatus).toHaveBeenCalledWith(
                    'txn-123',
                    testCase.expected
                );

                mockAllPayClient.createPayment.mockClear();
                mockAllPayClient.getPaymentStatus.mockClear();
                mockAllPayClient.validateWebhookSignature.mockClear();
                mockTransactionRepository.create.mockClear();
                mockTransactionRepository.findById.mockClear();
                mockTransactionRepository.findByUserId.mockClear();
                mockTransactionRepository.findByAllPayId.mockClear();
                mockTransactionRepository.updateStatus.mockClear();
                mockQRCode.toDataURL.mockClear();
            }
        });
    });
});