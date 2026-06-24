const { json } = require("./_helpers");

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return json(500, { error: "MERCADOPAGO_ACCESS_TOKEN não configurado no Netlify." });

    const body = JSON.parse(event.body || "{}");
    const price = Number(body.price || 0);
    if (!price || price <= 0) return json(400, { error: "Preço inválido." });

    const siteUrl = String(process.env.SITE_URL || "https://mblab-livros.netlify.app").replace(/\/$/, "");

    const preference = {
      items: [{
        title: String(body.title || "Livro MBLab"),
        quantity: 1,
        currency_id: "BRL",
        unit_price: price
      }],
      payer: body.email ? { email: String(body.email) } : undefined,
      external_reference: String(body.orderId || ""),
      back_urls: {
        success: `${siteUrl}/#/pagamento/sucesso`,
        failure: `${siteUrl}/#/pagamento/erro`,
        pending: `${siteUrl}/#/pagamento/pendente`
      },
      auto_return: "approved",
      statement_descriptor: "MBLAB",
      payment_methods: { installments: 12 }
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference)
    });

    const data = await res.json();
    if (!res.ok) return json(res.status, { error: "Erro no Mercado Pago.", details: data });

    return json(200, { init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, id: data.id });
  } catch (error) {
    return json(500, { error: "Erro interno.", details: error.message });
  }
};