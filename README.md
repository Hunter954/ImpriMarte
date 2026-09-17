# ImpriMarte Personalizados

Site vitrine responsivo + painel administrativo, preparado para GitHub + Railway, PostgreSQL e armazenamento de imagens em Volume `/data`.

## O que já está incluído

- Home desktop/mobile inspirada nos layouts enviados, agora usando a paleta principal `#E66914`.
- Logo PNG fornecida em `public/img/logo.png`.
- Catálogo, categorias, busca, página individual de produto e favoritos locais.
- Carrinho de **orçamento**: os itens ficam no navegador e são enviados em uma mensagem pronta para o WhatsApp.
- Produtos com preço "A partir de" ou "Sob consulta".
- Páginas Sobre, Contato, Privacidade e Termos.
- Painel admin com login, CRUD de produtos, categorias, banners e configurações.
- Upload de imagens no diretório persistente `/data/uploads` em produção.
- PostgreSQL com criação automática das tabelas e dados iniciais.
- Sessões do painel armazenadas no PostgreSQL.
- Railway health check em `/health`.

## Variáveis de ambiente

Copie `.env.example` e configure no Railway:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=gere-uma-chave-grande-e-aleatoria
ADMIN_EMAIL=seu-email@dominio.com
ADMIN_PASSWORD=uma-senha-forte
WHATSAPP_NUMBER=5545999999999
DATA_DIR=/data
SITE_URL=https://seu-dominio.com.br
```

`WHATSAPP_NUMBER` deve conter DDI + DDD + número, apenas dígitos. Exemplo Brasil/PR: `5545999999999`.

## Deploy no Railway

1. Crie um repositório no GitHub e envie todo o conteúdo desta pasta.
2. No Railway, crie um novo projeto a partir do repositório.
3. Adicione um serviço **PostgreSQL**.
4. No serviço do site, crie as variáveis acima. Para `DATABASE_URL`, use a referência do PostgreSQL do próprio Railway.
5. Em **Volumes**, crie um volume e monte em `/data`.
6. Faça o deploy. O comando de start já está configurado como `npm start`.
7. Abra `/admin/login` e entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
8. No painel, abra **Configurações** e ajuste o WhatsApp, textos e redes sociais.

## Rodando localmente

Requer Node.js 20+ e PostgreSQL.

```bash
npm install
cp .env.example .env
# exporte/carregue as variáveis do .env no seu ambiente
npm start
```

Acesse:

- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

## Observação sobre preços

Este projeto foi construído como **vitrine com carrinho de orçamento**, não como checkout com pagamento. O cliente consulta os valores iniciais, adiciona itens e envia tudo pelo WhatsApp. Isso combina com produtos personalizados, cujo preço final depende de quantidade, material, tamanho e acabamento.

## Próximas evoluções possíveis

Quando você quiser transformar em e-commerce completo, a estrutura pode receber cadastro de clientes, pedidos persistidos no banco, Mercado Pago/Pix, frete, cupons, estoque e status de produção sem precisar refazer a identidade visual.
