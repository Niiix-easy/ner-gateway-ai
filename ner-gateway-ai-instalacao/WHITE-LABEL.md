# White label — trocar a marca

Esta build não tem marca de fábrica: nenhum nome, logotipo, domínio, CDN ou
serviço de terceiro pré-configurado. O que segue é onde ajustar cada peça da
identidade visual e o que verificar antes de publicar.

---

## 1. Pelo painel (cobre 90% dos casos)

A primeira tela depois de criar o administrador — **Primeiros passos** — já pede
nome, cor, logotipos e favicon. Depois, tudo fica em:

**Plataforma → Configurações → Personalização**

| Campo | Onde aparece |
|---|---|
| Nome da aplicação | Título das páginas, sidebar, e-mails, checkout, PWA |
| Cor principal | Botões, links, destaques do painel e do checkout |
| Logotipo (claro / escuro) | Sidebar expandida, login, e-mails |
| Símbolo / ícone | Sidebar recolhida, ícone do PWA |
| Favicon | Aba do navegador |
| Imagem do login | Fundo da tela de entrada |
| Chamada / texto de apoio | Textos da tela de entrada |

Os valores salvos aqui **sobrescrevem** os defaults do código a cada request
(`App\Http\Middleware\ApplyBrandingConfig`). Você não precisa editar arquivo
nenhum para trocar a marca.

Outras abas que valem revisar:

- **Tema** — layout do painel do vendedor;
- **Idiomas / Traduções** — textos da interface, editáveis um a um;
- **Banners** — faixas do dashboard e dos relatórios;
- **Suporte do painel** — botão flutuante de suporte para os sellers;
- **LGPD** — seus termos de uso e política de privacidade;
- **App** — nome, ícones e notificações push do PWA.

---

## 2. Arquivos de imagem

Substitua diretamente em `public/images/` se quiser mudar o padrão do pacote
(o que o painel enviar tem precedência sobre isso):

```
public/images/logo.png         logotipo tema claro
public/images/logo-dark.png    logotipo tema escuro
public/images/logo-mark.png    símbolo quadrado (sidebar recolhida, PWA)
public/images/favicon.png      favicon
public/images/login.png        arte da tela de entrada
public/images/login-bg.jpg     fundo da tela de entrada
```

---

## 3. Defaults no código

`config/platform.php` — ponto de partida da instalação:

```php
'app_name'      => env('APP_NAME', 'Plataforma'),
'theme_primary' => env('BRAND_THEME_PRIMARY', '#2135FA'),
'app_logo'      => '/images/logo.png',
// …
```

`.env`:

```
APP_NAME="Minha Plataforma"
APP_URL=https://app.seudominio.com
BRAND_THEME_PRIMARY=#2135FA
SUPPORT_WHATSAPP=5511999999999
```

Depois de mexer em `.env` ou em `config/`:

```bash
php artisan config:clear
```

---

## 4. E-mails

- Remetente: **Configurações → E-mail** (nome e endereço), ou
  `MAIL_FROM_NAME` / `MAIL_FROM_ADDRESS` no `.env`.
- Os templates usam o nome e o logotipo do branding automaticamente
  (`App\Services\BrandingEmailData`).
- Configure SPF, DKIM e DMARC no seu domínio. Sem isso, entrega no spam.

---

## 5. Domínio e URLs

- `APP_URL` precisa ser exatamente o domínio público, com `https://` e **sem**
  barra no final. É dele que saem links de checkout, webhooks e e-mails.
- Área de membros com domínio próprio: configurável por produto no painel.
- Se estiver atrás de proxy/CDN, defina `TRUSTED_PROXIES` no `.env`.

---

## 6. O que foi removido desta build

Para que não sobre nenhum vínculo com o fornecedor original:

- **Licenciamento** — sem chave, sem ativação, sem portal, sem heartbeat.
- **Telemetria / fleet beacon** — nenhum envio de inventário ou status.
- **Loja de plugins** — a área "Plugins" saiu do painel administrativo;
  todos os recursos (infoprodutos, vitrine de afiliados, equipe) vêm liberados.
- **Modo cloud / billing externo** — sem orquestrador remoto e sem cobrança.
- **CDN de terceiros para artes** — as imagens de conquistas agora são enviadas
  por você em **Plataforma → Conquistas**.
- **Aba Segurança** em Configurações — removida do painel administrativo.
- **Atualização automática** — não há repositório upstream. Veja a seção 8.

Nenhum código faz chamada de rede para infraestrutura do fornecedor. As únicas
chamadas externas são para os serviços que **você** configurar: gateways de
pagamento, e-mail, storage S3/R2, pixels de rastreamento e CEP.

---

## 7. API PIX para os seus sellers

A área **API PIX** (`/aplicacoes-api`) vem liberada e visível no menu lateral do
vendedor. Cada seller gera as próprias chaves (public key / secret key),
configura webhook e integra.

Controles do operador:

- **Financeiro → API PIX** — liga/desliga globalmente e define o valor mínimo
  por cobrança;
- **Infoprodutores → (usuário)** — sobrescreve por seller: herdar, forçar
  liberado ou forçar bloqueado.

A documentação da API para os sellers fica em `/docs/api-pagamentos`.

---

## 8. Atualizações

Não existe upstream. Para atualizar, você substitui os arquivos e roda:

```bash
php artisan migrate --force
php artisan config:clear
```

Se você mantiver o seu próprio repositório Git, ligue a atualização pelo painel
no `.env`:

```
PLATFORM_UPDATE_GITHUB_REPO=seu-usuario/seu-repo
PLATFORM_UPDATE_REPO=https://github.com/seu-usuario/seu-repo.git
PLATFORM_UPDATE_BRANCH=main
PLATFORM_UPDATES_ENABLED=true
```

Sem isso, a aba **Configurações → Versão** apenas mostra a versão instalada
(arquivo `VERSION` na raiz — mantenha-o alinhado às suas releases).

---

## 9. Checklist antes de publicar

- [ ] Nome, cor, logotipos e favicon trocados
- [ ] `APP_NAME` e `APP_URL` corretos no `.env`
- [ ] Favicon aparecendo na aba do navegador
- [ ] Tela de login com a sua arte e os seus textos
- [ ] E-mail de teste chegando com o seu remetente e o seu logotipo
- [ ] Termos de uso e política de privacidade próprios publicados (LGPD)
- [ ] Ícones do PWA atualizados (Plataforma → App)
- [ ] Checkout revisado com a marca certa
- [ ] Nenhuma referência à marca antiga: `grep -ril "<marca antiga>" app config resources routes`
