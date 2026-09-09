Documentação da API
Bem-vindo à documentação da API Blackcat. Aqui você encontrará tudo que precisa para integrar pagamentos PIX, Cartão de Crédito e Boleto em sua aplicação.

Base URL
Produção
https://api.blackcatoficial.com/api
Formato
Todas as requisições e respostas utilizam o formato JSON. Certifique-se de incluir o header:

Content-Type: application/json
Valores Monetários
⚠️
Importante:
Todos os valores monetários são em
centavos
. Por exemplo, R$ 99,90 deve ser enviado como 9990.

Autenticação
A API utiliza autenticação via API Key. Você pode obter sua API Key no painel administrativo.

Header de Autenticação
Inclua sua API Key em todas as requisições:

Header
Copiar
X-API-Key: sua_api_key_aqui
Exemplo de Requisição
cURL
Copiar
curl -X POST https://api.blackcatoficial.com/api/sales/create-sale \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key_aqui" \
  -d '{"amount": 9990, "paymentMethod": "PIX", ...}'

  Criar Venda
Cria uma nova transação de pagamento via PIX.

POST
/sales/create-sale
Parâmetros do Body
Campo	Tipo	Obrigatório	Descrição
amount	integer	Sim	Valor em centavos. Ex: 1000 = R$ 10,00
currency	string	Não	Moeda da transação. Default: BRL
paymentMethod	string	Sim	pix
items	array	Sim	Lista de itens da venda (mínimo 1 item)
customer	object	Sim	Dados do cliente (ver abaixo)
pix	object	Não	Configurações específicas para PIX
shipping	object	Condicional	Endereço de entrega (obrigatório quando há produtos com tangible: true)
metadata	string	Não	Informações adicionais sobre a venda
postbackUrl	string	Não	URL para receber notificações de webhook sobre mudanças de status
externalRef	string	Não	Seu identificador único para esta venda
utm_source	string	Não	Origem do tráfego (google, facebook, email, etc.)
utm_medium	string	Não	Meio de marketing (cpc, email, social, etc.)
utm_campaign	string	Não	Nome da campanha de marketing
utm_content	string	Não	Conteúdo específico do anúncio
utm_term	string	Não	Termo de pesquisa associado
Objeto Items
Campo	Tipo	Obrigatório	Descrição
title	string	Sim	Nome/descrição do item
unitPrice	integer	Sim	Preço unitário em centavos. Ex: 10000 = R$ 100,00
quantity	integer	Sim	Quantidade do item
tangible	boolean	Não	Se é um produto físico (true) ou digital (false). Default: false
Objeto Customer
Campo	Tipo	Obrigatório	Descrição
name	string	Sim	Nome completo do cliente
email	string	Sim	E-mail do cliente
phone	string	Sim	Telefone (apenas números)
document	object	Sim	Documento do cliente
Objeto Document
Campo	Tipo	Obrigatório	Descrição
number	string	Sim	Número do documento (apenas números)
type	string	Sim	cpf ou cnpj
Objeto PIX
Campo	Tipo	Obrigatório	Descrição
expiresInDays	integer	Não	Dias para expiração do PIX. Default: 1
Objeto Shipping (Produtos Físicos)
⚠️ Obrigatório para produtos físicos:
Quando algum item tiver
tangible: true
, o objeto
shipping
se torna obrigatório.
Campo	Tipo	Obrigatório	Descrição
name	string	Sim*	Nome do destinatário para entrega
street	string	Sim*	Rua/Logradouro do endereço de entrega
number	string	Sim*	Número do endereço
complement	string	Não	Complemento (apto, bloco, etc.)
neighborhood	string	Sim*	Bairro
city	string	Sim*	Cidade
state	string	Sim*	Estado (UF) - 2 caracteres. Ex: SP, RJ
zipCode	string	Sim*	CEP (apenas números)
* Obrigatório apenas quando há produtos com tangible: true

📊 Campos UTM para Analytics
📈 Rastreamento de Campanhas:
Use os campos UTM para rastrear a origem das suas vendas e medir o ROI das suas campanhas de marketing.
Todos os campos UTM são opcionais e serão armazenados no metadata da transação:

Campo	Descrição	Exemplo
utm_source	Origem do tráfego	google, facebook, email, newsletter
utm_medium	Meio de marketing	cpc, email, social, banner
utm_campaign	Nome da campanha	black_friday_2024, lancamento_produto
utm_content	Conteúdo específico	banner_principal, video_demo
utm_term	Termo de pesquisa	curso_javascript, pagamento_pix
💾 Armazenamento:
Os dados UTM ficam em
transaction.metadata.utm
e são preservados junto com outros metadados existentes.
Exemplos de Código
💡 Dica:
Os exemplos abaixo mostram uma venda de produto
digital
. Para produtos
físicos
(
tangible: true
), você deve adicionar o objeto
shipping
com todos os campos de endereço (name, street, number, neighborhood, city, state, zipCode).
cURL
Copiar
curl -X POST "https://api.blackcatoficial.com/api/sales/create-sale" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key_aqui" \
  -d '{
    "amount": 1000,
    "currency": "BRL",
    "paymentMethod": "pix",
    "items": [
      {
        "title": "Curso de JavaScript Avançado",
        "quantity": 1,
        "tangible": false
      }
    ],
    "customer": {
      "name": "João da Silva",
      "email": "joao@email.com",
      "phone": "11999999999",
      "document": {
        "number": "12345678901",
        "type": "cpf"
      }
    },
    "pix": {
      "expiresInDays": 2
    },
    "postbackUrl": "https://meusite.com/webhook/payment",
    "metadata": "Primeira compra do cliente",
    "externalRef": "ORDER-2024-001",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "lancamento_2024",
    "utm_content": "banner_home",
    "utm_term": "curso_javascript"
  }'
📦 Exemplo com Produto Físico
Quando algum item tiver tangible: true, é obrigatório enviar os dados de endereço no campo shipping:

Produto Físico com Endereço de Entrega
Copiar
curl -X POST "https://api.blackcatoficial.com/api/sales/create-sale" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_api_key_aqui" \
  -d '{
    "amount": 15000,
    "currency": "BRL",
    "paymentMethod": "pix",
    "items": [
      {
        "title": "Camiseta Personalizada",
        "unitPrice": 12000,
        "quantity": 1,
        "tangible": true
      },
      {
        "title": "Frete Correios",
        "unitPrice": 3000,
        "quantity": 1,
        "tangible": false
      }
    ],
    "customer": {
      "name": "Carlos Oliveira",
      "email": "carlos@email.com",
      "phone": "11988887777",
      "document": {
        "number": "12345678901",
        "type": "cpf"
      }
    },
    "shipping": {
      "name": "Carlos Oliveira",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 45",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234567"
    },
    "pix": {
      "expiresInDays": 2
    },
    "postbackUrl": "https://meusite.com/webhook/payment",
    "externalRef": "ORDER-2024-002",
    "utm_source": "facebook",
    "utm_medium": "social",
    "utm_campaign": "produtos_fisicos_2024"
  }'
Response - 201 Created
Sucesso
Copiar
{
  "success": true,
  "data": {
    "transactionId": "TXN-1733654321-ABC123",
    "status": "PENDING",
    "paymentMethod": "pix",
    "amount": 1000,
    "netAmount": 970,
    "fees": 30,
    "invoiceUrl": "https://blackcat.squarify.co/checkout/TXN-1733654321-ABC123",
    "createdAt": "2025-12-08T10:30:00.000Z",
    "paymentData": {
      "qrCode": "00020126580014br.gov.bcb.pix...",
      "qrCodeBase64": "data:image/png;base64,...",
      "copyPaste": "00020126580014br.gov.bcb.pix...",
      "expiresAt": "2025-12-10T10:30:00.000Z"
    }
  }
}
Campos da Resposta
Campo	Tipo	Descrição
transactionId	string	ID único da transação
status	string	Status da transação: PENDING, PAID, CANCELLED
paymentMethod	string	Método de pagamento utilizado
amount	integer	Valor bruto em centavos
netAmount	integer	Valor líquido em centavos (após taxas)
fees	integer	Taxas cobradas em centavos
invoiceUrl	string	URL para visualização da fatura pelo cliente
paymentData	object	Dados específicos do método de pagamento (QR Code para PIX)
Response - 400 Bad Request
Erro de Validação
{
  "success": false,
  "message": "Dados inválidos",
  "error": "O campo 'items' é obrigatório e deve conter ao menos 1 item"
}

Consultar Status
Consulta o status atual de uma transação pelo ID.

GET
/sales/{transactionId}/status
Parâmetros de URL
Parâmetro	Tipo	Descrição
transactionId	string	ID da transação retornado na criação
Exemplos de Código
cURL
Copiar
curl -X GET "https://api.blackcatoficial.com/api/sales/TXN-1733654321-ABC123/status" \
  -H "X-API-Key: sua_api_key_aqui"
Status Possíveis
Status	Descrição
PENDING	Aguardando pagamento
PAID	Pagamento confirmado
CANCELLED	Transação cancelada ou expirada
REFUNDED	Pagamento estornado
Response - 200 OK
Sucesso
Copiar
{
  "success": true,
  "data": {
    "transactionId": "TXN-1733654321-ABC123",
    "status": "PAID",
    "paymentMethod": "PIX",
    "amount": 1000,
    "netAmount": 970,
    "fees": 30,
    "paidAt": "2025-12-08T10:35:00.000Z",
    "endToEndId": "E12345678202312081035XYZ123"
  }
}

Dados do Vendedor
Retorna informações básicas da empresa associada à API Key, como nome, CNPJ e logo. Útil para personalizar interfaces de checkout e identificar o vendedor.

GET
/sales/seller
Resposta
Campo	Tipo	Descrição
success	boolean	Indica se a requisição foi bem-sucedida
data.name	string	Nome fantasia da empresa
data.legalName	string	Razão social completa da empresa
data.cnpj	string	CNPJ formatado (XX.XXX.XXX/XXXX-XX)
data.logo	string|null	URL do logotipo da empresa (null se não configurado)
Exemplo de Resposta
Resposta JSON
Copiar
{
  "success": true,
  "data": {
    "name": "Tech Store",
    "legalName": "Tech Store Comércio Ltda",
    "cnpj": "12.345.678/0001-90",
    "logo": "https://cdn.exemplo.com/logos/techstore.png"
  }
}
Exemplos de Código
cURL
Copiar
curl -X GET "https://api.blackcatoficial.com/api/sales/seller" \
  -H "X-API-Key: sua_api_key_aqui"
💡
Dica:
Use este endpoint para personalizar a interface de checkout com os dados da sua empresa, criando uma experiência mais profissional para seus clientes.

💰 Criar Saque
Cria uma nova solicitação de saque via PIX. Permite que você retire os fundos disponíveis da sua conta.

POST
/sales/create-withdrawal
🔐
Requisito:
A empresa deve ter a funcionalidade de saques via API habilitada. Entre em contato com o suporte para ativar.
Parâmetros do Body
Campo	Tipo	Obrigatório	Descrição
amount	number	✅ Sim	Valor do saque em reais (ex: 100.50)
pixKey	string	✅ Sim	Chave PIX de destino
method	string	❌ Não	Método de saque (padrão: "PIX")
pixKeyType	string	❌ Não	Tipo da chave PIX (detectado automaticamente)
description	string	❌ Não	Descrição opcional do saque
🎯
Detecção Automática:
Se você não informar o pixKeyType, nossa API detecta automaticamente baseado no formato da chave (CPF, CNPJ, Email, Telefone, UUID).
Tipos de Chave PIX
Tipo	Formato	Exemplo
EMAIL	Email válido	usuario@email.com
CPF	11 dígitos	12345678901
CNPJ	14 dígitos	12345678000123
PHONE	Telefone brasileiro	+5521999999999
RANDOM	Chave aleatória (UUID)	123e4567-e89b-12d3-a456...
Exemplos de Código
cURL - Exemplo Simples
Copiar
curl -X POST "https://api.blackcatoficial.com/api/sales/create-withdrawal" \
  -H "X-API-Key: sua_api_key_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "pixKey": "usuario@email.com"
  }'
cURL - Telefone
Copiar
curl -X POST "https://api.blackcatoficial.com/api/sales/create-withdrawal" \
  -H "X-API-Key: sua_api_key_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "pixKey": "+5521999999999",
    "description": "Saque via API"
  }'
Exemplo de Resposta de Sucesso
Resposta JSON
Copiar
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.50,
    "amountFormatted": "R$ 100,50",
    "fees": 2.50,
    "feesFormatted": "R$ 2,50",
    "netAmount": 98.00,
    "netAmountFormatted": "R$ 98,00",
    "method": "PIX",
    "pixKeyType": "EMAIL",
    "pixKey": "usuario@email.com",
    "status": "PROCESSING",
    "autoWithdrawal": true,
    "createdAt": "2026-01-27T20:00:00.000Z",
    "message": "Saque criado e enviado automaticamente para processamento."
  }
}
Possíveis Erros
Valor mínimo não atingido
Copiar
{
  "success": false,
  "message": "Valor mínimo para saque é R$ 2,00"
}
Saldo insuficiente
Copiar
{
  "success": false,
  "message": "Saldo insuficiente. Disponível para saque: R$ 45,30",
  "data": {
    "available": 45.30,
    "requested": 100.00
  }
}
API não habilitada
Copiar
{
  "success": false,
  "message": "Saques via API não estão habilitados para esta empresa. Entre em contato com o suporte."
}
⚠️
Importante:
Valores são informados em reais (formato decimal)
Taxas são automaticamente calculadas e deduzidas
Processamento pode ser automático ou manual
Existe valor mínimo configurável por empresa

Webhooks
Webhooks permitem que você receba notificações em tempo real sobre eventos que acontecem na sua conta, como pagamentos confirmados e saques processados.

Como Funcionam
Quando um evento ocorre (ex: pagamento PIX confirmado), enviamos uma requisição POST para a URL que você configurou com os dados do evento.

Headers Enviados
Header	Descrição
Content-Type	application/json
X-Webhook-Event	Nome do evento (ex: transaction.paid)
X-Webhook-Source	blackcat-api
Boas Práticas
💡
Responda com status 200 em até 10 segundos
Processe os webhooks de forma assíncrona
Implemente idempotência usando o transactionId
Verifique se o status mudou antes de processar
Dados UTM nos Webhooks
Se dados UTM foram fornecidos na criação da transação, eles são automaticamente incluídos nos webhooks para que você possa rastrear a origem das suas vendas.

🏷️
Campos UTM Disponíveis:
utm_source:
Origem do tráfego (google, facebook, newsletter)
utm_medium:
Meio utilizado (cpc, email, organic)
utm_campaign:
Nome da campanha (promo_janeiro, black_friday)
utm_content:
Conteúdo específico (banner_top, link_footer)
utm_term:
Termo de pesquisa (pagamento_pix, checkout)

Eventos de Webhook
Lista de todos os eventos disponíveis e exemplos de payload.

transaction.created
Transação
Disparado quando uma nova transação é criada.

Payload
Copiar
{
  "event": "transaction.created",
  "timestamp": "2025-12-08T10:30:00.000Z",
  "transactionId": "TXN-1733654321-ABC123",
  "externalReference": "ORDER-12345",
  "status": "PENDING",
  "amount": 9990,
  "netAmount": 9691,
  "fees": 299,
  "paymentMethod": "PIX",
  "acquirer": "payzu",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com"
  },
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "promo_janeiro",
    "utm_content": "banner_top",
    "utm_term": "pagamento_pix"
  }
}
transaction.paid
Transação
Disparado quando um pagamento é confirmado.

Payload
Copiar
{
  "event": "transaction.paid",
  "timestamp": "2025-12-08T10:35:00.000Z",
  "transactionId": "TXN-1733654321-ABC123",
  "externalReference": "ORDER-12345",
  "status": "PAID",
  "amount": 9990,
  "netAmount": 9691,
  "fees": 299,
  "paymentMethod": "PIX",
  "acquirer": "payzu",
  "acquirerTransactionId": "pix_abc123def456",
  "paidAt": "2025-12-08T10:35:00.000Z",
  "endToEndId": "E12345678202312081035XYZ123",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com"
  },
  "utm": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "promo_janeiro",
    "utm_content": "banner_top",
    "utm_term": "pagamento_pix"
  }
}
transaction.failed
Transação
Disparado quando uma transação falha ou expira.

Payload
Copiar
{
  "event": "transaction.failed",
  "timestamp": "2025-12-08T11:30:00.000Z",
  "transactionId": "TXN-1733654321-ABC123",
  "externalReference": "ORDER-12345",
  "status": "CANCELLED",
  "amount": 9990,
  "paymentMethod": "PIX",
  "reason": "PIX expirado"
}
withdrawal.created
Saque
Disparado quando um novo saque é solicitado.

Payload
Copiar
{
  "event": "withdrawal.created",
  "timestamp": "2025-12-08T14:00:00.000Z",
  "withdrawalId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "amount": 50000,
  "fees": 150,
  "netAmount": 49850,
  "method": "PIX",
  "pixKeyType": "EMAIL",
  "pixKey": "empresa@email.com",
  "createdAt": "2025-12-08T14:00:00.000Z"
}
withdrawal.completed
Saque
Disparado quando um saque é processado com sucesso.

Payload
Copiar
{
  "event": "withdrawal.completed",
  "timestamp": "2025-12-08T14:05:00.000Z",
  "withdrawalId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "amount": 50000,
  "fees": 150,
  "netAmount": 49850,
  "method": "PIX",
  "pixKeyType": "EMAIL",
  "pixKey": "empresa@email.com",
  "createdAt": "2025-12-08T14:00:00.000Z",
  "processedAt": "2025-12-08T14:05:00.000Z"
}
withdrawal.failed
Saque
Disparado quando um saque falha.

Payload
Copiar
{
  "event": "withdrawal.failed",
  "timestamp": "2025-12-08T14:05:00.000Z",
  "withdrawalId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "FAILED",
  "amount": 50000,
  "fees": 150,
  "netAmount": 49850,
  "method": "PIX",
  "pixKeyType": "EMAIL",
  "pixKey": "empresa@email.com",
  "createdAt": "2025-12-08T14:00:00.000Z",
  "processedAt": "2025-12-08T14:05:00.000Z"
}
Evento Especial: all
Ao cadastrar um webhook com o evento all, vo

Códigos de Erro
Lista de códigos de status HTTP e mensagens de erro comuns.

Código	Descrição	Ação Sugerida
400	Bad Request - Dados inválidos	Verifique o body da requisição
401	Unauthorized - API Key inválida	Verifique sua API Key
403	Forbidden - Sem permissão	Conta não aprovada ou bloqueada
404	Not Found - Recurso não encontrado	Verifique o ID informado
422	Unprocessable Entity - Validação falhou	Verifique os campos obrigatórios
429	Too Many Requests - Rate limit	Aguarde antes de tentar novamente
500	Internal Server Error	Erro interno, tente novamente
Estrutura de Erro
Resposta de Erro Padrão
{
  "success": false,
  "message": "Descrição do erro",
  "error": "Detalhes técnicos (opcional)"
}