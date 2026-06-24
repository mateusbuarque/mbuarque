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
