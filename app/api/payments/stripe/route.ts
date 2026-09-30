import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Stripe Payment Request:', body);
    
    // Simulate Stripe API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({
      id: `pi_${Math.random().toString(36).substring(2, 15)}`,
      object: 'payment_intent',
      amount: body.amount,
      currency: body.currency || 'brl',
      status: 'succeeded',
      client_secret: `pi_${Math.random().toString(36).substring(2, 15)}_secret_${Math.random().toString(36).substring(2, 15)}`,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Stripe integration error' }, { status: 500 });
  }
}
