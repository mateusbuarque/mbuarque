const { json, supabase, sendEmail } = require("./_helpers");

function paymentStatus(status) {
  if (status === "approved") return "Aguardando envio";
  if (status === "pending" || status === "in_process") return "Aguardando pagamento";
  if (status === "rejected") return "Pagamento recusado";
  if (status === "cancelled") return "Cancelado";
  if (status === "refunded") return "Estornado";
  if (status === "charged_back") return "Chargeback";
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

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payment = await response.json();
    if (!response.ok) return json(200, { ok: false, mercadoPago: payment });

    const orderId = payment.external_reference;
    if (!orderId) return json(200, { ok: true, noOrderReference: true });

    const existingRows = await supabase(`orders?id=eq.${encodeURIComponent(orderId)}&select=*`, { method: "GET" });
    const existingOrder = existingRows?.[0];
    if (!existingOrder) return json(200, { ok: false, orderNotFound: true, orderId });

    const fulfillmentStatuses = ["Separando pedido", "Enviado", "Entregue"];
    let newStatus = paymentStatus(payment.status);
    if (payment.status === "approved" && fulfillmentStatuses.includes(existingOrder.status)) {
      newStatus = existingOrder.status;
    }

    const updated = await supabase(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: newStatus,
        payment_id: String(paymentId),
        payment_status: payment.status,
        payment_detail: payment.status_detail || ""
      })
    });

    const order = updated?.[0] || existingOrder;
    let stockDeducted = false;

    if (payment.status === "approved") {
      const deduction = await supabase("rpc/deduct_order_stock", {
        method: "POST",
        body: JSON.stringify({ p_order_id: orderId })
      });
      stockDeducted = deduction === true || deduction?.[0] === true;
    }

    const firstApproval = payment.status === "approved" && existingOrder.payment_status !== "approved";
    if (firstApproval && order?.buyer?.email) {
      await sendEmail({
        to: order.buyer.email,
        subject: `Compra confirmada - ${order.book_title || "MBLab"}`,
        html: `<h1>Compra confirmada</h1><p>Recebemos seu pagamento.</p><p><b>Pedido:</b> ${order.id}</p><p><b>Produto:</b> ${order.book_title}</p><p>Acompanhe em “Minhas compras” no site.</p>`
      }).catch(console.log);
    }

    return json(200, { ok: true, orderId, status: newStatus, stockDeducted });
  } catch (error) {
    return json(200, { ok: false, details: error.message });
  }
};
