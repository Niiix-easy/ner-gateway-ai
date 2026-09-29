# Instalação em hospedagem compartilhada (cPanel / Hostinger / similares)

Passo a passo para subir a plataforma numa hospedagem compartilhada com PHP e
MySQL, sem acesso root e sem Docker.

> Antes de começar, leia `docs/RESPONSABILIDADE.md`. A operação é inteiramente sua.

---

## 0. Requisitos

| Item | Exigência |
|---|---|
| PHP | **8.3 ou superior** |
| Extensões | `pdo_mysql`, `mbstring`, `openssl`, `curl`, `zip`, `gd`, `bcmath`, `fileinfo`, `intl` |
| Banco | MySQL 8.0+ ou MariaDB 10.6+ |
| Disco | 2 GB livres |
| Escrita | `storage/`, `bootstrap/cache/` e o `.env` |
| Cron | um job por minuto |
| HTTPS | certificado ativo no domínio (Let's Encrypt do painel serve) |

Confirme a versão do PHP no painel da hospedagem **antes** de subir os arquivos.
Com PHP 8.2 ou inferior a aplicação não roda.

> Este é o cenário mais limitado. Se a sua operação for crescer, prefira a VPS
> (`docs/INSTALACAO-VPS.md`): filas com worker dedicado, Redis e mais controle.

---

## 1. Preparar o pacote

O pacote precisa vir com a pasta `vendor/` e a pasta `public/build/` já prontas
— a maioria das hospedagens compartilhadas bloqueia `proc_open`, e sem isso o
Composer e o `npm` não rodam no servidor.

Se você for gerar o pacote na sua máquina:

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build
```

Depois zipe tudo, incluindo `vendor/` e `public/build/`.

---

## 2. Criar o banco de dados

No painel da hospedagem (cPanel → "MySQL Databases", ou equivalente):

1. crie um banco **vazio** (ex.: `usuario_plataforma`);
2. crie um usuário com senha forte;
3. associe o usuário ao banco com **todos os privilégios**;
4. anote host, porta, nome do banco, usuário e senha.

O host quase sempre é `localhost` (não `127.0.0.1`) nesse tipo de hospedagem.

---

## 3. Enviar os arquivos

Envie o conteúdo do pacote para a pasta do domínio — normalmente
`public_html/` (ou `public_html/subdominio/`).

Estrutura esperada na raiz do domínio:

```
public_html/
├── app/
├── bootstrap/
├── config/
├── public/
├── storage/
├── vendor/
├── .htaccess          ← já vem no pacote, essencial
├── artisan
└── index.php          ← redireciona para public/index.php
```

O pacote já traz um `index.php` na raiz e um `.htaccess` que resolvem o caso em
que o DocumentRoot **não** aponta para `public/`. Se a sua hospedagem permitir
apontar o DocumentRoot para `public_html/public`, faça isso — é mais seguro.

Permissões:

```
storage/            → 755 (recursivo), gravável
bootstrap/cache/    → 755, gravável
```

---

## 4. Importar o schema do banco

O instalador de hospedagem compartilhada **não roda migrations**. O schema é
importado à mão:

1. abra o **phpMyAdmin** no painel;
2. selecione o banco vazio criado no passo 2;
3. aba **Importar** → escolha o arquivo `public/install/database.sql` do pacote;
4. execute e confirme que as tabelas foram criadas.

Se o arquivo for grande demais para o upload do phpMyAdmin, importe pelo
terminal SSH (quando disponível):

```bash
mysql -u USUARIO -p NOME_DO_BANCO < public/install/database.sql
```

---

## 5. Rodar o assistente de instalação

Acesse:

```
https://seudominio.com/install
```

O assistente tem 3 etapas:

**Etapa 1 — Requisitos e termo.** Confira os requisitos e marque o aceite do
termo de responsabilidade. O botão só libera depois do aceite.

**Etapa 2 — Banco.** Preencha host, porta, banco, usuário e senha. Clique em
**Testar conexão e schema** — precisa devolver "Conexão e schema OK". Se
disser que o SQL não foi importado, volte ao passo 4.

**Etapa 3 — Aplicação.** Informe:
- **Nome da plataforma** (sua marca);
- **URL da aplicação** (`https://seudominio.com`, sem barra no final);
- **Sessão / Cache**: escolha **Arquivo** — Redis raramente existe nesse tipo de
  hospedagem. Com "Arquivo", a fila usa o driver `database`, processada pelo cron.

Clique em **Instalar**. Ao final o assistente mostra a **URL do cron** — copie.

---

## 6. Configurar o cron (obrigatório)

No painel da hospedagem → "Cron Jobs", crie um job **a cada minuto**.

Se houver PHP CLI disponível:

```
* * * * * cd /home/USUARIO/public_html && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

Se não houver, use a URL que o instalador mostrou:

```
* * * * * curl -fsS "https://seudominio.com/cron?token=SEU_TOKEN" > /dev/null 2>&1
```

Sem cron nada funciona em segundo plano: pagamentos não conciliam, webhooks não
saem, assinaturas não expiram e e-mails não são enviados.

---

## 7. Criar o administrador

Clique em **Criar administrador e configurar a plataforma** (ou acesse
`https://seudominio.com/criar-admin`). Preencha nome, e-mail e senha forte.

Esse é o operador da plataforma, não um vendedor.

---

## 8. Primeira configuração (próxima tela, obrigatória)

Logo depois de criar o admin abre a tela **Primeiros passos**, e o painel só
libera quando ela for concluída. Nela você define:

- nome da plataforma, cor principal, logotipos e favicon;
- chamada e texto de apoio da tela de entrada;
- URL pública, remetente de e-mail e WhatsApp de suporte;
- aceite do termo de responsabilidade.

Depois é tudo editável em **Configurações → Personalização**.

---

## 9. Ajustes finais

1. **Configurações → E-mail** — configure SMTP e mande um teste. Em hospedagem
   compartilhada, use o SMTP do próprio provedor ou um serviço externo.
2. **Configurações → Storage** — em disco local por padrão. Se o plano tiver
   pouco espaço, aponte para S3/R2.
3. **Financeiro → Adquirentes** — credenciais do seu gateway de pagamento.
4. **Configurações → LGPD** — publique seus termos de uso e política de privacidade.
5. Faça uma compra real de R$ 1,00 de ponta a ponta antes de divulgar.

---

## 10. Segurança mínima

- Confirme que `.env` não é acessível pela web: `https://seudominio.com/.env`
  precisa dar **403 ou 404**. Se abrir o conteúdo, pare tudo e corrija o
  DocumentRoot / `.htaccess` antes de continuar.
- `APP_DEBUG=false` no `.env`.
- Remova ou bloqueie `/install` depois de concluir — o instalador se desativa
  sozinho quando `APP_INSTALLED=true`, mas apagar a pasta `public/install/` é
  mais seguro.
- Ative 2FA no usuário administrador.
- Configure backup automático do banco no painel da hospedagem e **teste a
  restauração**.

---

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Erro 500 em branco | PHP < 8.3, ou `storage/` sem permissão | Troque a versão do PHP no painel; `chmod -R 755 storage` |
| `manifest.json ausente` | `public/build` não foi enviado | Reenvie a pasta `public/build` completa |
| `SQLSTATE[HY000] [1045]` | credenciais do banco erradas | Reconfira usuário/senha; host normalmente é `localhost` |
| Instalador diz que o schema não existe | SQL não importado | Importe `public/install/database.sql` no phpMyAdmin |
| CSS/JS não carregam | DocumentRoot na raiz sem `.htaccess` | Confirme que o `.htaccess` do pacote está na raiz e `mod_rewrite` está ativo |
| Nada acontece em segundo plano | cron não configurado | Refaça o passo 6 |
| `419 Page Expired` | `APP_URL` diferente do domínio real | Corrija `APP_URL` no `.env` |
