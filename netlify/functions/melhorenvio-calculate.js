const { json, melhorEnvio, packageDefaults } = require("./_helpers");

function normalize(service) {
  const price = Number(service.price || service.custom_price || 0);
  return {
    id: service.id,
    name: service.name,
    company: service.company?.name || "Correios",
    price,
    delivery_time: service.delivery_time,
    custom_delivery_time: service.custom_delivery_time || service.delivery_time,
    service_id: service.id,
    raw: service
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

  try {
    const body = JSON.parse(event.body || "{}");
    const toCep = String(body.toCep || body.cep || "").replace(/\D/g, "");
    if (toCep.length !== 8) return json(400, { error: "CEP de destino inválido." });

    const fromCep = String(process.env.CEP_ORIGEM || "").replace(/\D/g, "");
    if (fromCep.length !== 8) return json(500, { error: "CEP_ORIGEM não configurado no Netlify." });

    const items = Array.isArray(body.items) && body.items.length ? body.items : [{ quantity: 1, price: Number(body.total || 0) }];
    const total = Number(body.total || items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0));
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const pack = packageDefaults(quantity, total);

    const payload = {
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      services: "1,2",
      products: items.map((item, index) => ({
        id: String(item.id || index + 1),
        width: Number(process.env.PACKAGE_WIDTH_CM || 12),
        height: Number(process.env.PACKAGE_HEIGHT_CM || 2),
        length: Number(process.env.PACKAGE_LENGTH_CM || 17),
        weight: Number(process.env.PACKAGE_WEIGHT_KG || 0.5),
        insurance_value: Number(item.price || total || 0),
        quantity: Number(item.quantity || 1)
      })),
      options: {
        receipt: false,
        own_hand: false,
        insurance_value: total
      }
    };

    const response = await melhorEnvio("/api/v2/me/shipment/calculate", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const services = (Array.isArray(response) ? response : [])
      .filter(item => !item.error)
      .filter(item => String(item.company?.name || "").toLowerCase().includes("correios") || [1, 2].includes(Number(item.id)))
      .map(normalize);

    return json(200, { services, raw: response, package: pack });
  } catch (error) {
    return json(500, { error: "Erro ao calcular frete no Melhor Envio.", details: error.message });
  }
};