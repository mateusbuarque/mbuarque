exports.handler = async function () {
  const token = process.env.MELHOR_ENVIO_TOKEN || "";
  const env = process.env.MELHOR_ENVIO_ENV || "";
  const ua = process.env.MELHOR_ENVIO_USER_AGENT || "MBLab Loja (mateusbpugli@gmail.com)";

  const safe = {
    token_exists: !!token,
    token_length: token.length,
    token_starts_with: token.slice(0, 3),
    token_has_spaces: token !== token.trim(),
    env,
    user_agent: ua
  };

  async function testBase(baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/v2/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": ua
        }
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      return { base: baseUrl, status: res.status, ok: res.ok, response: data };
    } catch (e) {
      return { base: baseUrl, error: e.message };
    }
  }

  const tests = await Promise.all([
    testBase("https://www.melhorenvio.com.br"),
    testBase("https://melhorenvio.com.br"),
    testBase("https://api.melhorenvio.com.br")
  ]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ safe, tests }, null, 2)
  };
};