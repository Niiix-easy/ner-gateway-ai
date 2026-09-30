import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('PagBank Payment Request:', body);
    
    // Simulate PagBank API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({
      id: `ORDE_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      reference_id: body.reference_id || 'REF_123',
      status: 'PAID',
      amount: body.amount,
      payment_method: body.payment_method || { type: 'CREDIT_CARD' },
      links: [
        { rel: 'SELF', href: 'https://api.pagseguro.com/orders/...' }
      ]
    });
  } catch (error) {
    return NextResponse.json({ error: 'PagBank integration error' }, { status: 500 });
  }
}
