import { NextRequest, NextResponse } from 'next/server';

// Stripe public key will be configured in the dashboard
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || 'pk_live_51QqACCFwlv8iCAQ2mEtJ1lx0mCIBzVGBrKMOCGpqyomZWNdmv8rvY86KcdIb2SrSh99M86zy8Q8kVxzAG8wCmPy300D5IrMvhh';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1QqADOFwlv8iCAQ2K23M8kZ5'; // OpenClaw Guide price ID

export async function POST(req: NextRequest) {
  try {
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { email } = body;

    // TODO: Integrate with Stripe Checkout
    // For now, return a placeholder response
    // This will be implemented when Stripe is fully configured

    return NextResponse.json({
      message: 'Stripe integration coming soon',
      publicKey: STRIPE_PUBLIC_KEY,
      priceId: STRIPE_PRICE_ID,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
