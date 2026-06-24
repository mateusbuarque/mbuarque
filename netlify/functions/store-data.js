const { json, supabase } = require("./_helpers");

const tables = {
  books: "books",
  coupons: "coupons",
  orders: "orders"
};

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    const query = event.queryStringParameters || {};
    const table = tables[query.table];

    if (event.httpMethod === "GET") {
      const [books, coupons, orders] = await Promise.all([
        supabase("books?select=*&order=created_at.desc", { method: "GET" }),
        supabase("coupons?select=*&order=created_at.desc", { method: "GET" }),
        supabase("orders?select=*&order=created_at.desc", { method: "GET" })
      ]);
      return json(200, { books, coupons, orders });
    }

    if (!table) return json(400, { error: "Tabela inválida." });

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
      const data = await supabase(`${table}?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(body)
      });
      return json(200, { item: data?.[0] || body });
    }

    if (event.httpMethod === "PATCH") {
      if (!query.id) return json(400, { error: "ID obrigatório." });
      const data = await supabase(`${table}?id=eq.${encodeURIComponent(query.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      return json(200, { item: data?.[0] || body });
    }

    if (event.httpMethod === "DELETE") {
      if (!query.id) return json(400, { error: "ID obrigatório." });
      await supabase(`${table}?id=eq.${encodeURIComponent(query.id)}`, { method: "DELETE" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Método não permitido." });
  } catch (error) {
    return json(500, { error: "Erro no banco.", details: error.message });
  }
};