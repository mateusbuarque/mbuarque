const { json, supabase, melhorEnvio, packageDefaults, sendEmail } = require("./_helpers");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurado no Netlify.`);
  return value;
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function fromEnv() {
  return {
    name: requireEnv("ME_FROM_NAME"),
    phone: onlyNumbers(requireEnv("ME_FROM_PHONE")),
    email: requireEnv("ME_FROM_EMAIL"),
    document: onlyNumbers(requireEnv("ME_FROM_DOCUMENT")),
    address: requireEnv("ME_FROM_ADDRESS"),
    number: requireEnv("ME_FROM_NUMBER"),
    complement: process.env.ME_FROM_COMPLEMENT || "",
    district: requireEnv("ME_FROM_DISTRICT"),
    city: requireEnv("ME_FROM_CITY"),
    state_abbr: requireEnv("ME_FROM_STATE").toUpperCase(),
    country_id: "BR",
    postal_code: onlyNumbers(requireEnv("CEP_ORIGEM"))
  };
}

function isValidCpf(cpf) {
  cpf = onlyNumbers(cpf);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  d1 = d1 >= 10 ? 0 : d1;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  d2 = d2 >= 10 ? 0 : d2;
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

function toFromBuyer(buyer) {
  const document = onlyNumbers(buyer.cpf || buyer.document || "");
  if (!isValidCpf(document)) {
    throw new Error("CPF do cliente inválido ou ausente. Edite o pedido no admin e preencha um CPF válido antes de gerar a etiqueta.");
  }

  return {
    name: buyer.name || "Cliente",
    phone: onlyNumbers(buyer.phone || ""),
    email: buyer.email || "",
    document,
    address: buyer.street || "",
    number: buyer.number || "S/N",
    complement: buyer.complement || "",
    district: buyer.neighborhood || "",
    city: buyer.city || "",
    state_abbr: String(buyer.state || "").toUpperCase(),
    country_id: "BR",
    postal_code: onlyNumbers(buyer.cep || "")
  };
}

function extractOrderId(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.id) return data.id;
  if (data.order_id) return data.order_id;
  if (data.orders?.[0]?.id) return data.orders[0].id;
  if (Array.isArray(data) && data[0]?.id) return data[0].id;
  return "";
}

function extractPrintUrl(data) {
  if (!data) return "";
  if (typeof data === "string" && data.startsWith("http")) return data;
  if (data.url) return data.url;
  if (data.link) return data.link;
  if (data.print_url) return data.print_url;
  if (Array.isArray(data) && data[0]?.url) return data[0].url;
  return "";
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

  try {
    const body = JSON.parse(event.body || "{}");
    const orderId = body.orderId;
    if (!orderId) return json(400, { error: "orderId obrigatório." });

    const rows = await supabase(`orders?id=eq.${encodeURIComponent(orderId)}&select=*`, { method: "GET" });
    const order = rows?.[0];
    if (!order) return json(404, { error: "Pedido não encontrado." });

    if (order.melhor_envio_order_id) {
      return json(200, { ok: true, alreadyCreated: true, order });
    }

    const serviceId = Number(order.shipping?.service_id || order.shipping?.id || order.melhor_envio_service_id || 1);
    const finalPrice = Number(order.final_price || 0);
    const shippingPrice = Number(order.shipping?.price || 0);
    const productsValue = Math.max(1, finalPrice - shippingPrice);
    const pack = packageDefaults(1, productsValue);

    const productTitle = order.book_title || "Livro MBLab";

    const cartPayload = {
      service: serviceId,
      from: fromEnv(),
      to: toFromBuyer(order.buyer || {}),
      products: [{
        name: productTitle,
        quantity: 1,
        unitary_value: productsValue
      }],
      volumes: [{
        height: pack.height,
        width: pack.width,
        length: pack.length,
        weight: pack.weight
      }],
      options: {
        insurance_value: productsValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        platform: "MBLab"
      }
    };

    const cart = await melhorEnvio("/api/v2/me/cart", {
      method: "POST",
      body: JSON.stringify(cartPayload)
    });

    const meOrderId = extractOrderId(cart);
    if (!meOrderId) throw new Error("Não foi possível identificar o ID do pedido no carrinho do Melhor Envio.");

    const checkout = await melhorEnvio("/api/v2/me/shipment/checkout", {
      method: "POST",
      body: JSON.stringify({ orders: [meOrderId] })
    });

    const generated = await melhorEnvio("/api/v2/me/shipment/generate", {
      method: "POST",
      body: JSON.stringify({ orders: [meOrderId] })
    });

    const printed = await melhorEnvio("/api/v2/me/shipment/print", {
      method: "POST",
      body: JSON.stringify({ mode: "public", orders: [meOrderId] })
    });

    const labelUrl = extractPrintUrl(printed);
    const tracking = await melhorEnvio("/api/v2/me/shipment/tracking", {
      method: "POST",
      body: JSON.stringify({ orders: [meOrderId] })
    }).catch(error => ({ error: error.message }));

    const trackingCode =
      tracking?.[0]?.tracking ||
      tracking?.[0]?.tracking_code ||
      tracking?.tracking ||
      tracking?.tracking_code ||
      order.tracking_code ||
      "";

    const updated = await supabase(`orders?id=eq.${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "Enviado",
        tracking_code: trackingCode,
        melhor_envio_order_id: String(meOrderId),
        melhor_envio_service_id: String(serviceId),
        melhor_envio_label_url: labelUrl,
        melhor_envio_raw: { cart, checkout, generated, printed, tracking }
      })
    });

    const updatedOrder = updated?.[0];

    if (updatedOrder?.buyer?.email) {
      await sendEmail({
        to: updatedOrder.buyer.email,
        subject: `Seu pedido foi enviado - ${updatedOrder.book_title || "MBLab"}`,
        html: `<h1>Pedido enviado</h1><p>Seu pedido foi enviado.</p><p><b>Pedido:</b> ${updatedOrder.id}</p><p><b>Rastreio:</b> ${trackingCode || "em processamento"}</p>${labelUrl ? `<p><a href="${labelUrl}">Ver etiqueta</a></p>` : ""}`
      }).catch(console.log);
    }

    return json(200, { ok: true, order: updatedOrder, labelUrl, trackingCode, raw: { cart, checkout, generated, printed, tracking } });
  } catch (error) {
    return json(500, { error: "Erro ao gerar etiqueta no Melhor Envio.", details: error.message });
  }
};