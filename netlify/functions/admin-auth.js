const { json } = require("./_helpers");
const {
  adminConfigurationStatus,
  adminCredentialsAreValid,
  adminCookie,
  clearAdminCookie,
  createAdminToken,
  isAdminRequest
} = require("./_adminAuth");

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  if (event.httpMethod === "GET") {
    const config = adminConfigurationStatus();
    return json(200, {
      authenticated: isAdminRequest(event),
      adminConfigured: config.configured,
      missing: config.missing
    });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });

  try {
    const body = JSON.parse(event.body || "{}");
    const action = String(body.action || "login");

    if (action === "logout") {
      return json(200, { authenticated: false }, { "Set-Cookie": clearAdminCookie() });
    }

    const config = adminConfigurationStatus();
    if (!config.configured) {
      return json(503, {
        error: `Configuração do admin incompleta no Netlify: ${config.missing.join(", ")}. Faça um novo deploy após salvar as variáveis.`
      });
    }

    if (!adminCredentialsAreValid(body.email, body.password)) {
      return json(401, { error: "Login incorreto." });
    }

    const token = createAdminToken(body.email);
    return json(200, { authenticated: true }, { "Set-Cookie": adminCookie(token) });
  } catch (error) {
    return json(500, { error: error.message || "Erro ao autenticar administrador." });
  }
};
