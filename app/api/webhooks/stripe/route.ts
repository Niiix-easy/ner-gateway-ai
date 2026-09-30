import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.type;
    console.log(`Stripe Webhook Received: ${eventType}`);

    // In a real app, you'd verify the Stripe signature here.

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
