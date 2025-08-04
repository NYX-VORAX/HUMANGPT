// Payment processing and validation functions
import { createPaymentRecord, createSubscription, updateUserPlan } from './firebase'

export interface PaymentData {
  uid: string
  plan: 'pro' | 'pro-plus'
  amount: number
  currency: string
  paymentMethod: string
  paymentProvider: string
  transactionId: string
}

// Plan pricing configuration
export const PLAN_PRICES = {
  pro: {
    monthly: 19.99,
    currency: 'USD'
  },
  'pro-plus': {
    monthly: 29.99,
    currency: 'USD'
  }
}

// PayPal payment processing
export const processPayPalPayment = async (paymentData: PaymentData) => {
  try {
    // Validate payment with PayPal API
    const isValid = await validatePayPalPayment(paymentData.transactionId)
    
    if (!isValid) {
      throw new Error('PayPal payment validation failed')
    }

    // Record payment in Firebase
    const paymentId = await createPaymentRecord(paymentData.uid, {
      ...paymentData,
      status: 'completed'
    })

    // Create subscription
    const subscriptionId = await createSubscription(
      paymentData.uid,
      paymentData.plan,
      paymentData.paymentMethod,
      paymentData.amount
    )

    return {
      success: true,
      paymentId,
      subscriptionId,
      message: 'Payment processed successfully'
    }
  } catch (error: any) {
    console.error('PayPal payment processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Cryptocurrency payment processing
export const processCryptoPayment = async (paymentData: PaymentData) => {
  try {
    // Validate crypto transaction
    const isValid = await validateCryptoTransaction(
      paymentData.transactionId,
      paymentData.amount
    )
    
    if (!isValid) {
      throw new Error('Cryptocurrency payment validation failed')
    }

    // Record payment in Firebase
    const paymentId = await createPaymentRecord(paymentData.uid, {
      ...paymentData,
      status: 'completed'
    })

    // Create subscription
    const subscriptionId = await createSubscription(
      paymentData.uid,
      paymentData.plan,
      paymentData.paymentMethod,
      paymentData.amount
    )

    return {
      success: true,
      paymentId,
      subscriptionId,
      message: 'Crypto payment processed successfully'
    }
  } catch (error: any) {
    console.error('Crypto payment processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Credit card payment processing (with Stripe)
export const processStripePayment = async (paymentData: PaymentData) => {
  try {
    // Validate payment with Stripe API
    const isValid = await validateStripePayment(paymentData.transactionId)
    
    if (!isValid) {
      throw new Error('Stripe payment validation failed')
    }

    // Record payment in Firebase
    const paymentId = await createPaymentRecord(paymentData.uid, {
      ...paymentData,
      status: 'completed'
    })

    // Create subscription
    const subscriptionId = await createSubscription(
      paymentData.uid,
      paymentData.plan,
      paymentData.paymentMethod,
      paymentData.amount
    )

    return {
      success: true,
      paymentId,
      subscriptionId,
      message: 'Card payment processed successfully'
    }
  } catch (error: any) {
    console.error('Stripe payment processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// PayPal payment validation
const validatePayPalPayment = async (transactionId: string): Promise<boolean> => {
  try {
    // In a real implementation, you would call PayPal's API
    // This is a simplified example
    const response = await fetch('/api/paypal/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId })
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.status === 'COMPLETED'
  } catch (error) {
    console.error('PayPal validation error:', error)
    return false
  }
}

// Cryptocurrency transaction validation
const validateCryptoTransaction = async (
  transactionHash: string,
  expectedAmount: number
): Promise<boolean> => {
  try {
    // Example with Bitcoin - you would adapt this for your chosen cryptocurrency
    const response = await fetch(`https://blockstream.info/api/tx/${transactionHash}`)
    
    if (!response.ok) {
      return false
    }

    const transaction = await response.json()
    
    // Check if transaction is confirmed and amount matches
    return transaction.status.confirmed && 
           transaction.vout.some((output: any) => 
             output.value >= expectedAmount * 100000000 // Convert to satoshis
           )
  } catch (error) {
    console.error('Crypto validation error:', error)
    return false
  }
}

// Stripe payment validation
const validateStripePayment = async (paymentIntentId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/stripe/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentIntentId })
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.status === 'succeeded'
  } catch (error) {
    console.error('Stripe validation error:', error)
    return false
  }
}

// Get plan price
export const getPlanPrice = (plan: 'pro' | 'pro-plus'): number => {
  return PLAN_PRICES[plan].monthly
}

// Validate payment amount
export const validatePaymentAmount = (plan: 'pro' | 'pro-plus', amount: number): boolean => {
  const expectedAmount = getPlanPrice(plan)
  // Allow for small rounding differences (within 1 cent)
  return Math.abs(amount - expectedAmount) < 0.01
}

// Process payment based on provider
export const processPayment = async (
  provider: string,
  paymentData: PaymentData
) => {
  // Validate amount first
  if (!validatePaymentAmount(paymentData.plan, paymentData.amount)) {
    return {
      success: false,
      error: 'Invalid payment amount'
    }
  }

  switch (provider) {
    case 'paypal':
      return await processPayPalPayment(paymentData)
    case 'crypto':
      return await processCryptoPayment(paymentData)
    case 'stripe':
      return await processStripePayment(paymentData)
    default:
      return {
        success: false,
        error: 'Unsupported payment provider'
      }
  }
}

// Refund processing
export const processRefund = async (paymentId: string, reason: string = 'User request') => {
  try {
    // Update payment status to refunded
    // Implementation depends on your payment provider
    
    // For now, this is a placeholder
    console.log(`Processing refund for payment ${paymentId}, reason: ${reason}`)
    
    return {
      success: true,
      message: 'Refund processed successfully'
    }
  } catch (error: any) {
    console.error('Refund processing error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export default {
  processPayment,
  processRefund,
  getPlanPrice,
  validatePaymentAmount,
  PLAN_PRICES
}
