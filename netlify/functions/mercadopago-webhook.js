const { json, supabase } = require("./_helpers");

function statusFromPayment(status) {
  if (status === "approved") return "Pago";
  if (status === "pending" || status === "in_process") return "Aguardando pagamento";
  if (status === "rejected" || status === "cancelled") return "Cancelado";
  if (status === "refunded" || status === "charged_back") return "Cancelado";
  return status || "Aguardando pagamento";
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return json(500, { error: "MERCADOPAGO_ACCESS_TOKEN não configurado." });

    const params = event.queryStringParameters || {};
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}

    const type = params.type || body.type || body.topic;
    const paymentId = params["data.id"] || params.id || body?.data?.id || body?.id;

    if (!paymentId || (type && !String(type).includes("payment"))) {
      return json(200, { ok: true, ignored: true });
    }

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const payment = await res.json();
    if (!res.ok) return json(200, { ok: false, mercadoPago: payment });

    const orderId = payment.external_reference;
    if (!orderId) return json(200, { ok: true, noOrderReference: true });

    const newStatus = statusFromPayment(payment.status);

    await supabase(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: newStatus,
        payment_id: String(paymentId),
        payment_status: payment.status,
        payment_detail: payment.status_detail || ""
      })
    });

    return json(200, { ok: true, orderId, status: newStatus });
  } catch (error) {
    return json(200, { ok: false, details: error.message });
  }
};