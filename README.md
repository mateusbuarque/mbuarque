# MBLab Loja de Livros com Supabase

## Netlify
Build command:
npm install --no-audit --no-fund && npm run build

Publish directory:
dist

Functions directory:
netlify/functions

## Variáveis obrigatórias no Netlify
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
MERCADOPAGO_ACCESS_TOKEN
SITE_URL

## Tabelas necessárias no Supabase
books, coupons e orders.


## Atualização V4
- Livros e cupons agora usam upsert: editar/salvar não gera erro de item duplicado.
- Admin edita status do pedido direto no site.
- Admin edita código de rastreio direto no site.
- Webhook Mercado Pago em netlify/functions/mercadopago-webhook.js.
- Cliente acompanha pedido em "Minha compra" usando o e-mail.
- Para atualização automática do pagamento, confirme que SITE_URL aponta para o domínio publicado.
