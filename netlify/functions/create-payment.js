exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "ok" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Método não permitido." }) };
  }

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado no Netlify." }) };
    }

    const body = JSON.parse(event.body || "{}");
    const title = String(body.title || "Livro MBLab");
    const price = Number(body.price || 0);
    const quantity = Number(body.quantity || 1);
    const buyerEmail = String(body.email || "");
    const coupon = String(body.coupon || "");
    const siteUrl = String(process.env.SITE_URL || "https://mblab-livros.netlify.app").replace(/\/$/, "");

    if (!price || price <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Preço inválido." }) };
    }

    const preference = {
      items: [
        {
          title: coupon ? `${title} - cupom ${coupon}` : title,
          quantity,
          currency_id: "BRL",
          unit_price: price
        }
      ],
      payer: buyerEmail ? { email: buyerEmail } : undefined,
      back_urls: {
        success: `${siteUrl}/#/pagamento/sucesso`,
        failure: `${siteUrl}/#/pagamento/erro`,
        pending: `${siteUrl}/#/pagamento/pendente`
      },
      auto_return: "approved",
      statement_descriptor: "MBLAB",
      payment_methods: {
        installments: 12
      }
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, headers, body: JSON.stringify({ error: "Erro no Mercado Pago.", details: data }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
        id: data.id
      })
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Erro interno.", details: error.message }) };
  }
};