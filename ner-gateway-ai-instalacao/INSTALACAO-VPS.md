# Instalação em VPS (Docker)

Passo a passo para subir a plataforma numa VPS Linux limpa. Ao final você terá
domínio com HTTPS, filas rodando e o painel administrativo configurado com a sua
marca.

> Antes de começar, leia `docs/RESPONSABILIDADE.md`. A operação é inteiramente sua.

---

## 0. O que você precisa

| Item | Mínimo | Recomendado |
|---|---|---|
| Sistema | Ubuntu 22.04 / Debian 12 (com `apt-get`) | Ubuntu 24.04 |
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Disco | 40 GB SSD | 80 GB SSD |
| Acesso | root ou usuário com `sudo` | — |
| Domínio | um subdomínio apontado para o IP da VPS | — |

O script instala Docker, Docker Compose, Caddy (TLS automático), PostgreSQL,
Redis, a aplicação PHP 8.3 e os workers de fila.

---

## 1. Apontar o DNS

No seu provedor de DNS, crie um registro **A** apontando para o IP da VPS:

```
Tipo: A     Nome: app (ou @)     Valor: <IP-DA-VPS>     TTL: automático
```

Se usar Cloudflare, deixe o proxy (nuvem laranja) **desligado** durante a
instalação — é o caminho mais simples para o certificado sair na primeira
tentativa. Depois você liga se quiser.

Confirme antes de continuar:

```bash
dig +short app.seudominio.com
```

Precisa devolver o IP da VPS.

---

## 2. Enviar o pacote para a VPS

Do seu computador, com o `.zip` da plataforma em mãos:

```bash
scp plataforma.zip root@<IP-DA-VPS>:/root/
```

Na VPS:

```bash
ssh root@<IP-DA-VPS>
apt-get update -y && apt-get install -y unzip
mkdir -p /opt/plataforma
unzip -q /root/plataforma.zip -d /opt/plataforma
cd /opt/plataforma
ls    # deve listar artisan, composer.json, docker-compose.yml, install-caddy.sh
```

> Se o zip criou uma subpasta (`/opt/plataforma/personal-gateway/…`), mova o
> conteúdo um nível acima: `mv personal-gateway/* personal-gateway/.[!.]* . && rmdir personal-gateway`

---

## 3. Rodar o instalador

Com domínio e HTTPS (recomendado):

```bash
cd /opt/plataforma
chmod +x install-caddy.sh
PLATFORM_DIR=/opt/plataforma \
PLATFORM_APP_URL="https://app.seudominio.com" \
bash install-caddy.sh
```

O script:

1. instala Docker e Docker Compose;
2. cria swap se a RAM for baixa;
3. instala as dependências PHP (Composer);
4. sobe os containers (`app`, `postgres`, `redis`, `caddy`, `scheduler` e os workers);
5. verifica se os workers subiram.

Duração típica: 5 a 15 minutos.

Variações:

| Situação | Comando |
|---|---|
| Sem Redis (VPS pequena) | `bash install-no-redis.sh` |
| Sem Caddy, atrás de outro proxy | `bash install.sh` (expõe HTTP em `PLATFORM_HTTP_PORT`, padrão 80) |
| Porta 80 ocupada | `PLATFORM_HTTP_PORT=8080 bash install.sh` |

---

## 4. Configuração do domínio

Abra no navegador o endereço que o script imprimiu ao final:

```
http://<IP-DA-VPS>/docker-setup
```

Informe o **domínio público** (`app.seudominio.com`, sem `http://`) e salve. O
Caddy emite o certificado Let's Encrypt automaticamente.

### TLS com Cloudflare

| Modo no Cloudflare | O que fazer |
|---|---|
| Proxy desligado (DNS only) | Nada. Let's Encrypt resolve sozinho. |
| **Flexible** | Proxy ligado; a origem fica em HTTP :80, já contemplado no Caddyfile. |
| **Full** | Se o ACME falhar atrás do proxy: `PLATFORM_CADDY_TLS_MODE=internal` no `.env` e rode `sh docker/fix-caddy-domain.sh`. |
| **Full (strict)** | Coloque o Origin Certificate em `.docker/certs/origin.pem` e `.docker/certs/origin-key.pem`, depois `sh docker/fix-caddy-domain.sh`. |

---

## 5. Criar o administrador

Você será levado a `/criar-admin`. Preencha nome, e-mail e uma senha forte.

Esse é o **operador da plataforma** (`platform_admin`) — quem administra tudo,
não um vendedor.

---

## 6. Primeira configuração (é a próxima tela, obrigatoriamente)

Logo após criar o admin, o painel abre em **Primeiros passos** e só libera o
resto depois de concluído. Nessa tela você define:

- **Nome da plataforma** — usado no painel, e-mails, checkout e PWA;
- **Cor principal** — hexadecimal, ex.: `#2135FA`;
- **Logotipo claro, logotipo escuro, símbolo e favicon** — upload direto;
- **Chamada e texto de apoio** da tela de entrada;
- **URL pública**, **remetente de e-mail** e **WhatsApp de suporte**;
- **Aceite do termo de responsabilidade** (obrigatório).

Tudo isso pode ser reajustado depois em **Configurações → Personalização**.

---

## 7. Cron (obrigatório)

Na instalação Docker, o container `scheduler` já roda o agendador. Confirme:

```bash
docker compose ps scheduler
docker compose logs --tail=50 scheduler
```

Se você instalou sem Docker, agende no crontab do servidor:

```bash
* * * * * cd /opt/plataforma && php artisan schedule:run >> /dev/null 2>&1
```

Sem cron não há: processamento de filas, conciliação de pagamentos, expiração de
assinaturas nem envio de webhooks pendentes.

---

## 8. Verificação final

```bash
cd /opt/plataforma
docker compose ps                      # todos os serviços "running"
sh docker/verify-workers.sh            # workers de fila ativos
docker compose logs --tail=100 app     # sem erro fatal
```

No painel:

1. **Configurações → E-mail** → configure SMTP/SendGrid e envie um teste.
2. **Financeiro → Adquirentes** → cadastre as credenciais do seu gateway.
3. **Configurações → LGPD** → publique seus termos de uso e política de privacidade.
4. Crie um produto de R$ 1,00 e faça uma compra real de ponta a ponta.

---

## 9. Backup (faça antes de vender qualquer coisa)

```bash
# Banco
docker compose exec -T postgres pg_dump -U postgres plataforma > backup-$(date +%F).sql

# Uploads e logs
tar czf storage-$(date +%F).tar.gz storage/app storage/logs

# .env (contém APP_KEY — sem ela os dados criptografados são perdidos)
cp .env env-backup-$(date +%F)
```

Agende isso e **teste a restauração**. Backup não testado não é backup.

---

## 10. Atualizar depois

Esta build não tem repositório upstream nem atualização automática. Para
atualizar, você substitui os arquivos e roda as migrations:

```bash
cd /opt/plataforma
# suba a nova versão dos arquivos (preservando .env, storage/ e .docker/)
docker compose exec app php artisan migrate --force
docker compose exec app php artisan config:clear
docker compose restart
```

Se você mantiver seu próprio repositório Git, aponte-o em `.env`:

```
PLATFORM_UPDATE_GITHUB_REPO=seu-usuario/seu-repo
PLATFORM_UPDATE_REPO=https://github.com/seu-usuario/seu-repo.git
PLATFORM_UPDATES_ENABLED=true
```

Aí a aba **Configurações → Versão** volta a checar e aplicar atualizações.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `502` no domínio | app ainda subindo ou caiu | `docker compose logs --tail=100 app` |
| Certificado não emite | DNS não propagou ou proxy CF ligado | `dig +short seu.dominio`; desligue o proxy e rode `sh docker/fix-caddy-domain.sh` |
| Tela branca no painel | `public/build` ausente | Reenvie a pasta `public/build` do pacote |
| Pagamento não confirma | cron/worker parado | `sh docker/verify-workers.sh` |
| `419 Page Expired` | `APP_URL` diferente do domínio real | Corrija `APP_URL` no `.env` e `php artisan config:clear` |
| Diagnóstico geral | — | `sh docker/diagnose-installation-health.sh` |
