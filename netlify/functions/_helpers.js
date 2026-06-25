const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/g, "");
const SUPABASE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

async function supabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase não configurado no Netlify.");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return { skipped: true };
  const from = process.env.FROM_EMAIL || "MBLab <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html })
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = { json, supabase, sendEmail };

function melhorEnvioBase() {
  const env = String(process.env.MELHOR_ENVIO_ENV || "production").toLowerCase();
  return env === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://www.melhorenvio.com.br";
}

async function getSetting(key) {
  try {
    const data = await supabase(`app_settings?key=eq.${encodeURIComponent(key)}&select=value`, { method: "GET" });
    return data?.[0]?.value || null;
  } catch {
    return null;
  }
}

async function setSetting(key, value) {
  await supabase(`app_settings?on_conflict=key`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() })
  });
}

async function exchangeMelhorEnvioToken({ grantType, code, refreshToken }) {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  const redirectUri = process.env.MELHOR_ENVIO_REDIRECT_URI || process.env.SITE_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Configure MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REDIRECT_URI no Netlify.");
  }

  const body = { grant_type: grantType, client_id: clientId, client_secret: clientSecret };
  if (grantType === "authorization_code") { body.code = code; body.redirect_uri = redirectUri; }
  if (grantType === "refresh_token") { body.refresh_token = refreshToken; }

  const res = await fetch(`${melhorEnvioBase()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": process.env.MELHOR_ENVIO_USER_AGENT || "MBLab Loja (mateusbpugli@gmail.com)"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));

  const expiresIn = Number(data.expires_in || 0);
  const saved = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken || "",
    token_type: data.token_type || "Bearer",
    expires_at: Date.now() + Math.max(expiresIn - 300, 60) * 1000
  };
  await setSetting("melhor_envio_oauth", saved);
  return saved.access_token;
}

async function getMelhorEnvioToken() {
  if (process.env.MELHOR_ENVIO_TOKEN) return process.env.MELHOR_ENVIO_TOKEN;
  const saved = await getSetting("melhor_envio_oauth");
  if (saved?.access_token && saved?.expires_at && Number(saved.expires_at) > Date.now()) return saved.access_token;
  if (saved?.refresh_token) return exchangeMelhorEnvioToken({ grantType: "refresh_token", refreshToken: saved.refresh_token });
  const code = process.env.MELHOR_ENVIO_AUTH_CODE;
  if (!code) throw new Error("Configure MELHOR_ENVIO_TOKEN ou MELHOR_ENVIO_AUTH_CODE no Netlify.");
  return exchangeMelhorEnvioToken({ grantType: "authorization_code", code });
}

async function melhorEnvio(path, options = {}) {
  const token = await getMelhorEnvioToken();
  const res = await fetch(`${melhorEnvioBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": process.env.MELHOR_ENVIO_USER_AGENT || "MBLab Loja (mateusbpugli@gmail.com)",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

function packageDefaults(quantity = 1, total = 0) {
  return {
    height: Number(process.env.PACKAGE_HEIGHT_CM || 2),
    width: Number(process.env.PACKAGE_WIDTH_CM || 12),
    length: Number(process.env.PACKAGE_LENGTH_CM || 17),
    weight: Number(process.env.PACKAGE_WEIGHT_KG || 0.5) * Number(quantity || 1),
    insurance_value: Number(total || 0)
  };
}

module.exports.melhorEnvio = melhorEnvio;
module.exports.packageDefaults = packageDefaults;
