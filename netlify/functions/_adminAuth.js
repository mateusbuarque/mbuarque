const crypto = require("crypto");

const COOKIE_NAME = "mblab_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function sessionSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
}

function adminConfigurationStatus() {
  const missing = [];
  if (!String(process.env.ADMIN_EMAIL || "").trim()) missing.push("ADMIN_EMAIL");
  if (!String(process.env.ADMIN_PASSWORD || "")) missing.push("ADMIN_PASSWORD");
  if (!sessionSecret()) missing.push("ADMIN_SESSION_SECRET");
  return { configured: missing.length === 0, missing };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function parseCookies(event) {
  const raw = String(event?.headers?.cookie || event?.headers?.Cookie || "");
  return raw.split(";").reduce((cookies, item) => {
    const index = item.indexOf("=");
    if (index === -1) return cookies;
    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function sign(value) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createAdminToken(email) {
  const payload = Buffer.from(JSON.stringify({
    role: "admin",
    email: String(email || "").trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyAdminToken(token) {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const configuredEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    return data?.role === "admin"
      && Number(data?.exp || 0) > Math.floor(Date.now() / 1000)
      && Boolean(configuredEmail)
      && safeEqual(String(data?.email || "").toLowerCase(), configuredEmail);
  } catch {
    return false;
  }
}

function isAdminRequest(event) {
  const cookies = parseCookies(event);
  return verifyAdminToken(cookies[COOKIE_NAME]);
}

function adminCredentialsAreValid(email, password) {
  const configuredEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || "");
  if (!configuredEmail || !configuredPassword || !sessionSecret()) return false;
  return safeEqual(String(email || "").trim().toLowerCase(), configuredEmail)
    && safeEqual(String(password || ""), configuredPassword);
}

function adminCookie(token) {
  const secure = String(process.env.CONTEXT || "").toLowerCase() === "dev" ? "" : "; Secure";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`;
}

function clearAdminCookie() {
  const secure = String(process.env.CONTEXT || "").toLowerCase() === "dev" ? "" : "; Secure";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

module.exports = {
  adminConfigurationStatus,
  adminCredentialsAreValid,
  adminCookie,
  clearAdminCookie,
  createAdminToken,
  isAdminRequest
};
