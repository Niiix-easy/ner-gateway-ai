import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('PagBank Webhook Received:', body);

    // PagBank (PagSeguro) webhooks usually contain transaction notifications.

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
