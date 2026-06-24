# MBLab Loja de Livros

Loja simples para vender livros com Mercado Pago.

## GitHub
Suba estes itens na raiz:
- index.html
- package.json
- netlify.toml
- public
- src
- netlify
- README.md

## Netlify
Build command:
npm install --no-audit --no-fund && npm run build

Publish directory:
dist

Functions directory:
netlify/functions

## Variáveis
MERCADOPAGO_ACCESS_TOKEN = seu Access Token do Mercado Pago
SITE_URL = URL do site no Netlify

## Admin
Email: mateusbpugli@gmail.com
Senha: Mateus Buarque 1101


## Atualização
- Faixa azul removida.
- Categorias funcionando.
- Upload de capa no painel admin.
- Azul ajustado para combinar com a logo.


## Atualização V3
- Formulário de comprador completo.
- Informações de envio: CEP, rua, número, complemento, bairro, cidade e estado.
- Pedidos salvos no painel admin.
- Status do pedido e código de rastreio no admin.
