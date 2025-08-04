import { NextRequest, NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'
import { handleEmailPayment, sendPaymentInstructions } from '../../../lib/paymentManager';

// Initialize Firebase Admin SDK
import '../../../lib/firebaseConfig';

// Subscription plan definitions
const SUBSCRIPTION_PLANS = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'pro',
    displayName: 'Pro Plan (Monthly)',
    price: 9.99,
    currency: 'USD',
    interval: 'monthly',
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'pro',
    displayName: 'Pro Plan (Yearly)',
    price: 99.99,
    currency: 'USD',
    interval: 'yearly',
  },
  pro_plus_monthly: {
    id: 'pro_plus_monthly',
    name: 'pro-plus',
    displayName: 'Pro Plus Plan (Monthly)',
    price: 19.99,
    currency: 'USD',
    interval: 'monthly',
  },
  pro_plus_yearly: {
    id: 'pro_plus_yearly',
    name: 'pro-plus',
    displayName: 'Pro Plus Plan (Yearly)',
    price: 199.99,
    currency: 'USD',
    interval: 'yearly',
  }
}

export async function POST(request: NextRequest) {
  try {
    // Security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
      )
    }

    const { uid, planId, action } = body
    const db = getFirestore()
    const userRef = db.collection('users').doc(uid)

    switch (action) {
      case 'send_instructions':
        await sendPaymentInstructions(uid, planId)
        return NextResponse.json(
          { success: true, message: 'Payment instructions sent.' },
          { status: 200, headers }
        )
      case 'confirm_payment':
        const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
        await handleEmailPayment(uid, plan.name as 'pro' | 'pro-plus', plan.price, plan.currency as 'USD' | 'INR');
        return NextResponse.json(
          { success: true, message: 'Payment confirmed and subscription updated.' },
          { status: 200, headers }
        )
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400, headers }
        )
    }

  } catch (error) {
    console.error('Subscription API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }}
    )
  }
}

// Handle GET requests - return available plans
export async function GET() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff'
  }

  return NextResponse.json({
    success: true,
    plans: Object.values(SUBSCRIPTION_PLANS)
  }, { status: 200, headers })
}
