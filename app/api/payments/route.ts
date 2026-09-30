import { NextRequest, NextResponse } from 'next/server';

// Simulated payment processing endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, amount, currency, customerEmail } = body;

    if (!productId || !amount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Simulate gateway processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      return NextResponse.json({
        id: `pay_${Math.random().toString(36).substring(2, 11)}`,
        status: 'succeeded',
        amount,
        currency: currency || 'BRL',
        productId,
        customerEmail,
        created: Date.now()
      });
    } else {
      return NextResponse.json({
        error: 'Pagamento recusado pelo emissor do cartão',
        code: 'card_declined'
      }, { status: 402 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
