const { json, melhorEnvio } = require("./_helpers");

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    const data = await melhorEnvio("/api/v2/me", { method: "GET" });
    return json(200, { ok: true, user: data });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};