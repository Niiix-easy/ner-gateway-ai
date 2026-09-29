# Termo de responsabilidade

> Leia antes de instalar. Ao concluir a instalação você aceita este termo — o
> instalador e a tela de primeira configuração pedem esse aceite de forma
> explícita.

## O que você está recebendo

Um código-fonte completo, entregue **no estado em que se encontra (as is)**, sem
garantia de qualquer natureza, sem licenciamento remoto, sem telemetria, sem
portal externo e sem qualquer serviço contínuo associado.

Não existe:

- servidor de licença ou ativação;
- verificação periódica ("heartbeat"), inventário de instalações ou beacon;
- loja de módulos, plugins pagos ou recursos bloqueados;
- suporte, SLA, monitoramento, auditoria ou manutenção por parte de quem
  forneceu o código.

## O que passa a ser seu, exclusivamente

A partir do momento em que você instala, executa ou disponibiliza a plataforma,
**tudo é de sua responsabilidade**. Sem exceção:

### Segurança
Servidor, sistema operacional, firewall, TLS, atualização de dependências,
força das senhas, 2FA, controle de acesso, rotação de chaves, proteção do
`.env`, isolamento do banco de dados, resposta a incidentes e a qualquer
vulnerabilidade — conhecida ou não, presente no código ou introduzida por você.

### Dados
Proteção de dados pessoais, base legal de tratamento, direitos dos titulares,
retenção, descarte, backup, restauração e comunicação de incidentes. Perante a
LGPD (ou legislação equivalente), o controlador e/ou operador é **você**.

### Legal, fiscal e regulatório
Enquadramento da atividade, emissão de documentos fiscais, recolhimento de
tributos, termos de uso e política de privacidade da sua plataforma, regras de
meios de pagamento e PIX, prevenção à lavagem de dinheiro e ao financiamento do
terrorismo, KYC/KYB, listas de sanções e qualquer exigência de bancos,
adquirentes ou do Banco Central.

### Pagamentos
Contratos e credenciais com gateways e adquirentes, taxas, liquidação, saques,
reembolsos, estornos, chargebacks, disputas (MED), fraude, split e repasses. Se
dinheiro entrar ou sair errado, o problema é seu.

### Operação
Disponibilidade, desempenho, filas, cron, escala, logs, custo de infraestrutura,
migrações de banco, atualizações de versão e correções de bugs.

### Seus usuários
Conduta, produtos, conteúdo, cobranças e reclamações dos vendedores (sellers) e
compradores da sua plataforma — incluindo o suporte a eles.

## O que NÃO é responsabilidade de quem forneceu o código

Nada do que está acima. Não há obrigação de:

- corrigir bugs ou falhas de segurança;
- fornecer atualizações, patches ou novas versões;
- responder dúvidas, chamados ou emergências;
- garantir compatibilidade com gateways, bancos ou serviços de terceiros;
- responder por prejuízo, multa, bloqueio, perda de dados ou lucro cessante.

## Checklist mínimo antes de colocar no ar

- [ ] `APP_DEBUG=false` e `APP_ENV=production` no `.env`
- [ ] `APP_KEY` gerada e `.env` fora do diretório público, sem permissão de leitura por terceiros
- [ ] HTTPS obrigatório, com certificado válido
- [ ] Senha forte e 2FA no usuário administrador da plataforma
- [ ] Banco de dados com usuário dedicado, senha forte e sem acesso externo
- [ ] Backup automático do banco e da pasta `storage/` — **e restauração testada**
- [ ] Cron rodando a cada minuto (filas, conciliação, expiração de assinaturas)
- [ ] Credenciais de gateway em ambiente de produção, testadas com valor real baixo
- [ ] Termos de uso e política de privacidade próprios publicados (Configurações → LGPD)
- [ ] Monitoramento de logs (`storage/logs/`) e de erro em produção
- [ ] Plano definido de resposta a incidente de segurança e vazamento

Este checklist é um mínimo, não uma garantia. A avaliação de risco da sua
operação é sua.

---

Consulte também o arquivo `LICENSE` na raiz do projeto.
