# Plataforma de pagamentos e infoprodutos — build white label

Gateway/plataforma de vendas completa em Laravel 12 + Inertia + Vue 3, entregue
como código-fonte, **sem marca, sem licenciamento e sem qualquer vínculo com
quem forneceu o código**.

---

## ⚠️ Leia primeiro

Este software é fornecido **“no estado em que se encontra” (as is)**, sem
garantia de qualquer natureza.

**A partir do momento em que você instala, a responsabilidade é 100% sua** —
segurança, dados, conformidade legal e fiscal, pagamentos, disponibilidade,
backups, atualizações e a conduta dos seus usuários. Não há suporte, SLA,
monitoramento ou manutenção por parte de quem entregou o código.

→ **`docs/RESPONSABILIDADE.md`** e **`LICENSE`**

---

## Instalação

| Cenário | Guia |
|---|---|
| VPS Linux com Docker (recomendado) | [`docs/INSTALACAO-VPS.md`](docs/INSTALACAO-VPS.md) |
| Hospedagem compartilhada (cPanel/Hostinger) | [`docs/INSTALACAO-HOSPEDAGEM-COMPARTILHADA.md`](docs/INSTALACAO-HOSPEDAGEM-COMPARTILHADA.md) |
| Trocar a marca | [`docs/WHITE-LABEL.md`](docs/WHITE-LABEL.md) |

Resumo do fluxo, em qualquer cenário:

```
instalar → configurar domínio → criar administrador → PRIMEIROS PASSOS → painel
```

A tela **Primeiros passos** é obrigatória e vem antes de tudo: é nela que a
plataforma ganha nome, cor, logotipo e favicon. O painel só abre depois dela.

---

## O que vem liberado

Nesta build **não existe recurso pago, bloqueado ou por trás de plugin**:

- Produtos digitais e físicos, checkout, cupons, order bump, upsell
- Área de membros com construtor visual e app PWA
- Afiliados, vitrine de afiliação e co-produção
- Equipe (cargos e permissões)
- Assinaturas e cobrança recorrente
- Financeiro, saldo, saques e conciliação
- Disputas MED, KYC, antifraude no checkout
- **API PIX liberada para os sellers** (`/aplicacoes-api`)
- E-mail marketing, relatórios, conquistas
- Multi-idioma e multi-moeda
- Integrações: Meta/TikTok/Google pixels, UTMify, webhooks

Gateways de pagamento suportados: CajuPay, Mercado Pago, Pagar.me, Spacepag,
Woovi, Pluggou, BlackCat, UmbrellaPag, PayShark, PushinPay, Efí, Stripe.
As credenciais são suas, cadastradas em **Financeiro → Adquirentes**.

---

## Requisitos

| | VPS (Docker) | Hospedagem compartilhada |
|---|---|---|
| PHP | 8.3 (no container) | **8.3+** |
| Banco | PostgreSQL 16 | MySQL 8 / MariaDB 10.6 |
| Cache/fila | Redis (opcional) | arquivo + fila `database` |
| RAM | 4 GB+ | — |
| Cron | container `scheduler` | 1 job por minuto |

---

## Estrutura

```
app/            código da aplicação (Laravel)
config/         configuração — veja config/platform.php (marca e operação)
resources/js/   painel e checkout (Vue 3 + Inertia)
public/install/ assistente de instalação para hospedagem compartilhada
docker/         scripts de VPS (subir, diagnosticar, recuperar, TLS)
docs/           instalação, white label e termo de responsabilidade
```

---

## Comandos úteis

```bash
php artisan migrate --force          # aplicar migrations
php artisan config:clear             # limpar cache de config (após mexer no .env)
php artisan schedule:run             # rodar o agendador uma vez (teste)
php artisan platform:export-shared-schema   # regerar public/install/database.sql

# Docker (na VPS)
docker compose ps                    # estado dos serviços
sh docker/verify-workers.sh          # workers de fila
sh docker/diagnose-stack.sh          # diagnóstico sem reiniciar
bash update.sh                       # atualizar e reconstruir
```

---

## Segurança — mínimo obrigatório

- `APP_DEBUG=false`, `APP_ENV=production`
- HTTPS com certificado válido
- `.env` inacessível pela web (teste: `https://seudominio.com/.env` → 403/404)
- 2FA no administrador da plataforma
- Backup automático do banco e de `storage/` — **com restauração testada**
- Remova `public/install/` depois de instalar

O checklist completo está em `docs/RESPONSABILIDADE.md`.

---

## Licença

Uso irrestrito: use, modifique, renomeie, revenda, ofereça como serviço, sem
atribuição e sem pedir autorização. Em contrapartida, **sem garantia alguma e
com responsabilidade integral sua**. Veja [`LICENSE`](LICENSE).
