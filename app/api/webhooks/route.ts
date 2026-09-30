import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In a real app, these keys would be in environment variables
const WEBHOOK_SECRETS: Record<string, string> = {
  mercadopago: 'mp_secret_key_123',
  stripe: 'whsec_secret_key_456',
  pagbank: 'pag_secret_key_789',
};

function verifySignature(payload: string, signature: string, secret: string) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex') === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get('x-webhook-signature');
    const pathname = new URL(req.url).pathname;
    const provider = pathname.split('/').pop() || 'unknown';

    if (!signature || !WEBHOOK_SECRETS[provider] || !verifySignature(rawBody, signature, WEBHOOK_SECRETS[provider])) {
      return NextResponse.json({ error: 'Assinatura inválida ou não autorizada' }, { status: 401 });
    }

    console.log(`[Next.js API] Valid webhook received for ${provider}:`, body);

    return NextResponse.json({ 
      received: true, 
      provider 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no processamento do webhook' }, { status: 500 });
  }
}
