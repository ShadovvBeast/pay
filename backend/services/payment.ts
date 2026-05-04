import * as QRCode from 'qrcode';
import { allPayClient } from './allpay';
import { providerRegistry } from './providerRegistry.js';
import { transactionRepository } from './repository.js';
import type {
  User,
  Transaction,
  AllPayWebhookPayload,
  PaymentMethod,
  PaymentProvider,
} from '../types/index.js';
import type { MobileMoneyCallbackPayload } from '../types/mobileMoney.js';

export interface CreatePaymentRequest {
  amount: number;
  currency?: string;
  language?: string;
  description?: string;
  paymentMethod?: 'card' | 'mobile_money' | 'auto';
  lineItems?: Array<{ name: string; price: number; quantity: number; includesVat?: boolean }>;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerIdNumber?: string;
  maxInstallments?: number;
  fixedInstallments?: boolean;
  expiresAt?: Date;
  preauthorize?: boolean;
  showApplePay?: boolean;
  showBit?: boolean;
  customField1?: string;
  customField2?: string;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentCreationResult {
  transaction: Transaction;
  paymentUrl: string;
  qrCodeDataUrl: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Create a new payment with AllPay and generate QR code
   */
  async createPayment(
    user: User,
    request: CreatePaymentRequest,
    apiKeyId?: string
  ): Promise<PaymentCreationResult> {
    return Promise.race([
      this._createPaymentInternal(user, request, apiKeyId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Payment creation timeout')), 10000)
      )
    ]);
  }

  private async _createPaymentInternal(
    user: User,
    request: CreatePaymentRequest,
    apiKeyId?: string
  ): Promise<PaymentCreationResult> {
    try {
      // Validate amount
      if (!request.amount || request.amount <= 0) {
        throw new Error('Amount must be a positive number');
      }

      if (request.amount > 999999.99) {
        throw new Error('Amount exceeds maximum allowed value');
      }

      // Determine payment method: auto-detect from phone number, or use explicit choice
      const shouldUseMobileMoney = this.shouldRouteMobileMoney(request);

      if (shouldUseMobileMoney && request.customerPhone) {
        return this._createMobileMoneyPayment(user, request, apiKeyId);
      }

      // Default: AllPay card payment
      return this._createAllPayPayment(user, request, apiKeyId);

    } catch (error) {
      console.error('Error creating payment:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('An unexpected error occurred while creating the payment');
    }
  }

  /**
   * Determine if a payment should be routed to mobile money.
   */
  private shouldRouteMobileMoney(request: CreatePaymentRequest): boolean {
    // Explicit card request → AllPay
    if (request.paymentMethod === 'card') return false;

    // Explicit mobile money request
    if (request.paymentMethod === 'mobile_money') return true;

    // Auto mode (default): check if phone number matches a mobile money provider
    if (request.customerPhone) {
      return providerRegistry.isMobileMoneyNumber(request.customerPhone);
    }

    return false;
  }

  /**
   * Create a mobile money payment (MTN MoMo, Airtel Money, M-Pesa).
   */
  private async _createMobileMoneyPayment(
    user: User,
    request: CreatePaymentRequest,
    apiKeyId?: string
  ): Promise<PaymentCreationResult> {
    const externalId = `SB0-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const callbackUrl = `${process.env.BACKEND_URL || 'http://localhost:2894'}/payments/webhook/mobile-money`;

    // Route to the correct provider based on phone number
    const route = providerRegistry.routePayment(request.customerPhone!);
    if (!route) {
      throw new Error(`No mobile money provider found for phone number: ${request.customerPhone}`);
    }

    // Use the provider's currency if not explicitly set
    const currency = request.currency || route.currency || user.merchantConfig.currency || 'UGX';

    console.log(`Routing mobile money payment to ${route.provider} (${route.country}) for ${request.customerPhone}`);

    // Send payment request to the mobile money provider
    const momoResponse = await providerRegistry.requestPayment({
      amount: request.amount,
      currency,
      customerPhone: route.normalizedPhone,
      description: request.description || `Payment from ${user.shopName}`,
      externalId,
      callbackUrl,
      payerMessage: request.description || `Payment to ${user.shopName}`,
      payeeNote: `SB0Pay transaction for ${user.shopName}`,
    });

    if (!momoResponse.success) {
      throw new Error(momoResponse.error || `Mobile money payment request failed via ${route.provider}`);
    }

    // Create transaction record
    const transaction = await transactionRepository.create({
      userId: user.id,
      amount: request.amount,
      currency,
      paymentUrl: '', // Mobile money doesn't have a payment URL — it's push-based
      allpayTransactionId: externalId,
      paymentMethod: momoResponse.paymentMethod,
      paymentProvider: momoResponse.provider,
      providerReference: momoResponse.providerTransactionId,
      providerMetadata: momoResponse.metadata,
      description: request.description,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
      webhookUrl: request.webhookUrl,
      metadata: {
        ...request.metadata,
        routedCountry: route.country,
        routedProvider: route.provider,
      },
      apiKeyId,
    });

    // Generate a QR code with transaction info (for display purposes)
    const qrData = JSON.stringify({
      transactionId: transaction.id,
      provider: route.provider,
      phone: request.customerPhone,
      amount: request.amount,
      currency,
      status: 'pending',
    });
    const qrCodeDataUrl = await this.generateQRCode(qrData);

    return {
      transaction,
      paymentUrl: '', // No URL for mobile money — push notification sent to phone
      qrCodeDataUrl,
    };
  }

  /**
   * Create an AllPay card payment (existing flow).
   */
  private async _createAllPayPayment(
    user: User,
    request: CreatePaymentRequest,
    apiKeyId?: string
  ): Promise<PaymentCreationResult> {
    // Create payment with AllPay
    const allPayResponse = await allPayClient.createPayment(
      request.amount,
      {
        ...user.merchantConfig,
        currency: request.currency || user.merchantConfig.currency,
        language: request.language || user.merchantConfig.language
      },
      request.description,
      {
        lineItems: request.lineItems,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        customerIdNumber: request.customerIdNumber,
        maxInstallments: request.maxInstallments,
        fixedInstallments: request.fixedInstallments,
        expiresAt: request.expiresAt,
        preauthorize: request.preauthorize,
        showApplePay: request.showApplePay,
        showBit: request.showBit,
        customField1: request.customField1,
        customField2: request.customField2,
        notificationsUrl: request.webhookUrl,
        successUrl: request.successUrl,
        backlinkUrl: request.cancelUrl
      }
    );

    const paymentUrl = allPayResponse.payment_url;

    if (!paymentUrl) {
      throw new Error(
        allPayResponse.error || 'Failed to create payment with AllPay'
      );
    }

    // Store the AllPay order ID for status checking
    const allPayOrderId = allPayResponse.order_id;

    // Create transaction record in database
    const transaction = await transactionRepository.create({
      userId: user.id,
      amount: request.amount,
      currency: user.merchantConfig.currency || 'ILS',
      paymentUrl: paymentUrl,
      allpayTransactionId: allPayOrderId,
      paymentMethod: 'card',
      paymentProvider: 'allpay',
      description: request.description,
      lineItems: request.lineItems,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerIdNumber: request.customerIdNumber,
      maxInstallments: request.maxInstallments,
      fixedInstallments: request.fixedInstallments,
      expiresAt: request.expiresAt,
      preauthorize: request.preauthorize,
      customField1: request.customField1,
      customField2: request.customField2,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
      webhookUrl: request.webhookUrl,
      metadata: request.metadata,
      apiKeyId: apiKeyId
    });

    // Generate QR code for the payment URL
    const qrCodeDataUrl = await this.generateQRCode(paymentUrl);

    return {
      transaction,
      paymentUrl: paymentUrl,
      qrCodeDataUrl
    };
  }

  /**
   * Get detailed transaction information from AllPay
   */
  async getTransactionDetails(transactionId: string, userId: string): Promise<{
    transaction: Transaction;
    allPayDetails: any;
  }> {
    try {
      // Get transaction from database
      const transaction = await transactionRepository.findById(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify the transaction belongs to the authenticated user
      if (transaction.userId !== userId) {
        throw new Error('Unauthorized access to transaction');
      }

      // Get details from AllPay if we have an AllPay transaction ID
      let allPayDetails = null;
      if (transaction.allpayTransactionId) {
        try {
          console.log(`Getting AllPay details for order ID: ${transaction.allpayTransactionId}`);
          allPayDetails = await allPayClient.getPaymentStatus(transaction.allpayTransactionId);
          console.log('AllPay details response:', allPayDetails);
        } catch (error) {
          console.error('Error getting AllPay details:', error);
          // Don't fail the whole request if AllPay is unavailable
          allPayDetails = { error: 'Unable to fetch payment details from AllPay' };
        }
      }

      return {
        transaction,
        allPayDetails
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw error;
    }
  }

  /**
   * Get payment status and update transaction if needed
   */
  async getPaymentStatus(transactionId: string): Promise<Transaction> {
    console.log(`PaymentService.getPaymentStatus called with ID: ${transactionId}`);
    return Promise.race([
      this._getPaymentStatusInternal(transactionId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Payment status check timeout')), 10000)
      )
    ]);
  }

  private async _getPaymentStatusInternal(transactionId: string): Promise<Transaction> {
    try {
      const transaction = await transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // If transaction is already completed or failed, return as-is (no need to check again)
      if (transaction.status === 'completed' || transaction.status === 'failed') {
        console.log(`Transaction ${transactionId} already finalized with status: ${transaction.status}`);
        return transaction;
      }

      // For pending transactions, check with the appropriate provider
      if (transaction.status === 'pending') {
        const provider = (transaction.paymentProvider || 'allpay') as string;

        if (provider === 'allpay') {
          // AllPay status check (existing flow)
          if (transaction.allpayTransactionId) {
            try {
              console.log(`Checking AllPay status for order ID: ${transaction.allpayTransactionId}`);
              const allPayStatus = await allPayClient.getPaymentStatus(transaction.allpayTransactionId);
              console.log('AllPay status response:', allPayStatus);

              const newStatus = this.mapAllPayStatusToTransactionStatus(allPayStatus.status || 'pending');
              if (newStatus !== transaction.status) {
                console.log(`Updating transaction ${transactionId} status from ${transaction.status} to ${newStatus}`);
                const updatedTransaction = await transactionRepository.updateStatus(transactionId, newStatus);
                if (updatedTransaction) return updatedTransaction;
              }
            } catch (allPayError) {
              console.warn('Failed to check AllPay status, returning local status:', allPayError);
            }
          }
        } else if (['mtn_momo', 'airtel_money', 'mpesa'].includes(provider)) {
          // Mobile money status check
          if (transaction.providerReference) {
            try {
              console.log(`Checking ${provider} status for ref: ${transaction.providerReference}`);
              const momoStatus = await providerRegistry.getPaymentStatus(
                provider as PaymentProvider,
                transaction.providerReference
              );
              console.log(`${provider} status response:`, momoStatus);

              const newStatus = this.mapMobileMoneyStatusToTransactionStatus(momoStatus.status);
              if (newStatus !== transaction.status) {
                console.log(`Updating transaction ${transactionId} status from ${transaction.status} to ${newStatus}`);
                const updatedTransaction = await transactionRepository.updateStatus(transactionId, newStatus);
                if (updatedTransaction) return updatedTransaction;
              }
            } catch (momoError) {
              console.warn(`Failed to check ${provider} status, returning local status:`, momoError);
            }
          }
        }
      }

      return transaction;

    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Process webhook from AllPay
   */
  async processWebhook(
    payload: AllPayWebhookPayload,
    signature: string
  ): Promise<WebhookProcessingResult> {
    return Promise.race([
      this._processWebhookInternal(payload, signature),
      new Promise<WebhookProcessingResult>((resolve) =>
        setTimeout(() => resolve({
          success: false,
          error: 'Webhook processing timeout'
        }), 10000)
      )
    ]);
  }

  private async _processWebhookInternal(
    payload: AllPayWebhookPayload,
    signature: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Validate webhook signature
      if (!allPayClient.validateWebhookSignature(payload, signature)) {
        console.error('Invalid webhook signature');
        return {
          success: false,
          error: 'Invalid signature'
        };
      }

      // Find transaction by AllPay transaction ID or order ID
      let transaction = null;

      if (payload.transaction_id) {
        transaction = await transactionRepository.findByAllPayId(payload.transaction_id);
      }

      // If not found by transaction_id, try to find by order_id (our internal ID)
      if (!transaction && payload.order_id) {
        // Extract our transaction ID from the order_id if it follows our format
        const orderIdMatch = payload.order_id.match(/SB0-(\d+)-/);
        if (orderIdMatch) {
          // This is a simplified approach - in reality you'd need a better mapping
          console.warn('Transaction lookup by order_id not fully implemented');
        }
      }

      if (!transaction) {
        console.error('Transaction not found for AllPay ID:', payload.transaction_id || payload.order_id);
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      // Map AllPay status to our transaction status
      const newStatus = this.mapAllPayStatusToTransactionStatus(payload.status);

      // Update transaction status if it has changed
      if (newStatus !== transaction.status) {
        await transactionRepository.updateStatus(transaction.id, newStatus);
        console.log(`Transaction ${transaction.id} status updated to ${newStatus}`);
      }

      return {
        success: true,
        transactionId: transaction.id
      };

    } catch (error) {
      console.error('Error processing webhook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    return Promise.race([
      this._getTransactionHistoryInternal(userId, limit, offset),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction history timeout')), 10000)
      )
    ]);
  }

  private async _getTransactionHistoryInternal(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      return await transactionRepository.findByUserId(userId, limit, offset);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to retrieve transaction history');
    }
  }

  /**
   * Generate QR code data URL for payment URL
   */
  private async generateQRCode(paymentUrl: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256, // 256x256 pixels for mobile scanning
        errorCorrectionLevel: 'M'
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Map AllPay status to our transaction status
   * AllPay status codes: 0=unpaid, 1=successful, 3=refunded, 4=partially refunded
   */
  private mapAllPayStatusToTransactionStatus(
    allPayStatus: string | number
  ): 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' {
    // Handle numeric status codes from AllPay
    if (typeof allPayStatus === 'number') {
      const numericStatusMap: Record<number, 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'> = {
        0: 'pending',           // Unpaid (pending or failed)
        1: 'completed',         // Successful payment
        3: 'refunded',          // Refunded
        4: 'partially_refunded' // Partially refunded
      };

      console.log(`Mapping numeric AllPay status ${allPayStatus} to:`, numericStatusMap[allPayStatus] || 'failed');
      return numericStatusMap[allPayStatus] || 'failed';
    }

    // Handle string status codes (fallback)
    const stringStatusMap: Record<string, 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'> = {
      'pending': 'pending',
      'processing': 'pending',
      'completed': 'completed',
      'success': 'completed',
      'approved': 'completed',
      'failed': 'failed',
      'declined': 'failed',
      'error': 'failed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'refunded': 'refunded',
      'partially_refunded': 'partially_refunded',
      'timeout': 'failed',
      'expired': 'failed'
    };

    const normalizedStatus = String(allPayStatus).toLowerCase();
    console.log(`Mapping string AllPay status '${normalizedStatus}' to:`, stringStatusMap[normalizedStatus] || 'failed');
    return stringStatusMap[normalizedStatus] || 'failed';
  }

  /**
   * Map mobile money status to our transaction status
   */
  private mapMobileMoneyStatusToTransactionStatus(
    momoStatus: string
  ): 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' {
    const statusMap: Record<string, 'pending' | 'completed' | 'failed' | 'cancelled'> = {
      'pending': 'pending',
      'processing': 'pending',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'timeout': 'failed',
      'insufficient_funds': 'failed',
    };

    return statusMap[momoStatus] || 'failed';
  }

  /**
   * Process a mobile money webhook/callback.
   * Called by the mobile money webhook endpoints.
   */
  async processMobileMoneyCallback(
    callback: MobileMoneyCallbackPayload
  ): Promise<WebhookProcessingResult> {
    try {
      console.log(`Processing ${callback.provider} callback:`, callback);

      // Find transaction by provider reference or external ID
      let transaction = await transactionRepository.findByAllPayId(callback.externalId);

      if (!transaction && callback.providerTransactionId) {
        // Try finding by provider reference stored in provider_reference column
        // This requires a query by provider_reference — for now use allpay_transaction_id
        // since we store externalId there for mobile money transactions
      }

      if (!transaction) {
        console.error(`Transaction not found for ${callback.provider} callback:`, callback.externalId);
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      const newStatus = this.mapMobileMoneyStatusToTransactionStatus(callback.status);

      if (newStatus !== transaction.status) {
        await transactionRepository.updateStatus(transaction.id, newStatus);
        console.log(`Transaction ${transaction.id} status updated to ${newStatus} via ${callback.provider} callback`);
      }

      // If the merchant has a webhook URL configured, forward the notification
      if (transaction.webhookUrl) {
        try {
          await fetch(transaction.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId: transaction.id,
              status: newStatus,
              provider: callback.provider,
              amount: transaction.amount,
              currency: transaction.currency,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (webhookError) {
          console.warn('Failed to forward webhook to merchant:', webhookError);
        }
      }

      return {
        success: true,
        transactionId: transaction.id,
      };
    } catch (error) {
      console.error('Error processing mobile money callback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refund a completed payment
   */
  async refundPayment(transactionId: string, userId: string, refundAmount?: number): Promise<Transaction> {
    try {
      const transaction = await transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.userId !== userId) {
        throw new Error('Unauthorized to refund this transaction');
      }

      // Only allow refund on completed locally
      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      if (!transaction.allpayTransactionId) {
        throw new Error('Cannot refund transaction without AllPay transaction ID');
      }

      // Pre-check remote status to avoid processor incorrect status errors
      try {
        const remote = await allPayClient.getPaymentStatus(transaction.allpayTransactionId);
        const remoteMapped = this.mapAllPayStatusToTransactionStatus(remote.status ?? 'pending');

        // If already refunded remotely, sync and return
        if (remoteMapped === 'refunded' || remoteMapped === 'partially_refunded') {
          const synced = await transactionRepository.updateStatus(transactionId, remoteMapped);
          if (synced) return synced;
        }

        // Only proceed if remote considers it completed/settled
        if (remoteMapped !== 'completed') {
          throw new Error('Processor refund error: Cannot perform action due to an incorrect status');
        }
      } catch (precheckError) {
        if (precheckError instanceof Error) throw precheckError;
        throw new Error('Processor refund error: status check failed');
      }

      // Determine amount to refund (defaults to full amount)
      const amountToRefund = typeof refundAmount === 'number' && refundAmount > 0
        ? Math.min(refundAmount, transaction.amount)
        : transaction.amount;

      console.log(`Processing refund for order ID: ${transaction.allpayTransactionId}, amount: ${amountToRefund}`);

      const refundResponse = await allPayClient.refundPayment(
        transaction.allpayTransactionId,
        amountToRefund
      );

      let newStatus: Transaction['status'];
      if (refundResponse.status === 3) {
        newStatus = 'refunded';
      } else if (refundResponse.status === 4) {
        newStatus = 'partially_refunded';
      } else {
        throw new Error('Unexpected refund status from AllPay');
      }

      const updated = await transactionRepository.updateStatus(transactionId, newStatus);
      if (!updated) {
        throw new Error('Failed to update transaction status');
      }

      return updated;

    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(transactionId: string, userId: string): Promise<Transaction> {
    try {
      const transaction = await transactionRepository.findById(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.userId !== userId) {
        throw new Error('Unauthorized to cancel this transaction');
      }

      if (transaction.status !== 'pending') {
        throw new Error('Can only cancel pending transactions');
      }

      const updatedTransaction = await transactionRepository.updateStatus(transactionId, 'cancelled');

      if (!updatedTransaction) {
        throw new Error('Failed to cancel transaction');
      }

      return updatedTransaction;

    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics for a user
   */
  async getPaymentStats(userId: string, days: number = 30): Promise<{
    totalAmount: number;
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
  }> {
    try {
      const transactions = await transactionRepository.findByUserIdInDateRange(
        userId,
        new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        new Date()
      );

      const stats = transactions.reduce((acc, transaction) => {
        acc.totalTransactions++;

        if (transaction.status === 'completed') {
          acc.completedTransactions++;
          acc.totalAmount += transaction.amount;
        } else if (transaction.status === 'failed') {
          acc.failedTransactions++;
        } else if (transaction.status === 'pending') {
          acc.pendingTransactions++;
        }

        return acc;
      }, {
        totalAmount: 0,
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0
      });

      return stats;

    } catch (error) {
      console.error('Error getting payment stats:', error);
      throw new Error('Failed to retrieve payment statistics');
    }
  }

  /**
   * Get total transaction count for a user
   */
  async getTransactionCount(userId: string): Promise<number> {
    try {
      return await transactionRepository.countByUserId(userId);
    } catch (error) {
      console.error('Error getting transaction count:', error);
      throw new Error('Failed to retrieve transaction count');
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();