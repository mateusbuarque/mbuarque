# MBLab Loja Completa com Melhor Envio

Suba todos os arquivos na raiz do GitHub.

Netlify:
- Build command: npm install --no-audit --no-fund && npm run build
- Publish directory: dist
- Functions directory: netlify/functions

Variáveis já usadas:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- MERCADOPAGO_ACCESS_TOKEN
- SITE_URL
- RESEND_API_KEY opcional
- FROM_EMAIL opcional

Variáveis novas do Melhor Envio:
- MELHOR_ENVIO_TOKEN
- CEP_ORIGEM
- MELHOR_ENVIO_ENV = production ou sandbox

Dados do remetente para gerar etiqueta:
- ME_FROM_NAME
- ME_FROM_EMAIL
- ME_FROM_PHONE
- ME_FROM_DOCUMENT
- ME_FROM_ADDRESS
- ME_FROM_NUMBER
- ME_FROM_DISTRICT
- ME_FROM_CITY
- ME_FROM_STATE
- ME_FROM_COMPLEMENT opcional

Dimensões padrão do livro embalado:
- PACKAGE_HEIGHT_CM = 2
- PACKAGE_WIDTH_CM = 12
- PACKAGE_LENGTH_CM = 17
- PACKAGE_WEIGHT_KG = 0.5


## OAuth Melhor Envio

Variáveis no Netlify:

MELHOR_ENVIO_CLIENT_ID=26411
MELHOR_ENVIO_CLIENT_SECRET=secret da Área Dev
MELHOR_ENVIO_REDIRECT_URI=https://mateusbuarque.netlify.app
MELHOR_ENVIO_AUTH_CODE=apenas o code, sem URL
MELHOR_ENVIO_ENV=production

Não use MELHOR_ENVIO_TOKEN junto com OAuth.
