import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Mercado Pago Payment Request:', body);
    
    // Simulate Mercado Pago API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({
      id: Math.floor(Math.random() * 1000000000),
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: body.transaction_amount,
      payment_method_id: body.payment_method_id || 'visa',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Mercado Pago integration error' }, { status: 500 });
  }
}
