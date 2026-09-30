async function testWebhooks() {
  const providers = ['mercadopago', 'stripe', 'pagbank'];
  
  for (const provider of providers) {
    console.log(`Testing ${provider} webhook...`);
    try {
      const response = await fetch(`http://localhost:3000/api/webhooks/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: '1',
          name: 'João Testador',
          productName: 'Curso de IA',
          amount: 297.00,
          status: 'success'
        })
      });
      const data = await response.json();
      console.log(`${provider} result:`, data);
    } catch (e) {
      console.error(`${provider} failed:`, e.message);
    }
  }
}

testWebhooks();
