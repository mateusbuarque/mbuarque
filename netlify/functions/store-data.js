const { json, supabase } = require("./_helpers");
const { isAdminRequest } = require("./_adminAuth");

const tables = {
  books: "books",
  coupons: "coupons",
  orders: "orders",
  customers: "customers"
};

const PAID_STATUSES = ["Aguardando envio", "Pago", "Separando pedido", "Enviado", "Entregue"];
const SUPABASE_URL = String(process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/rest\/v1\/?$/i, "")
  .replace(/\/+$/g, "");
const SUPABASE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function orderIsPaid(order) {
  return order?.payment_status === "approved" || PAID_STATUSES.includes(order?.status);
}

function orderContainsBook(order, bookId, bookTitle) {
  if (Array.isArray(order?.items) && order.items.some(item => item.book_id === bookId)) return true;
  return normalizeText(order?.book_title).includes(normalizeText(bookTitle));
}

async function uploadImage(body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase não configurado no Netlify.");

  const match = String(body.dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Imagem inválida.");

  const mimeType = match[1].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("Formato de imagem não permitido.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    throw new Error("A imagem deve possuir no máximo 5 MB após a otimização.");
  }

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const originalName = String(body.fileName || "imagem")
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "imagem";
  const objectPath = `books/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${originalName}.${extension}`;

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/book-images/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": mimeType,
      "x-upsert": "false"
    },
    body: buffer
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "Erro ao enviar imagem.");

  return `${SUPABASE_URL}/storage/v1/object/public/book-images/${objectPath}`;
}


async function nextOrderId() {
  const result = await supabase("rpc/next_mblab_order_id", {
    method: "POST",
    body: JSON.stringify({})
  });

  const orderId = Array.isArray(result) ? result[0] : result;
  if (!orderId) throw new Error("Não foi possível gerar o número do pedido.");
  return String(orderId);
}

function authError(message = "Acesso não autorizado.") {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

async function validateCustomerCredentials(emailValue, passwordValue) {
  const email = String(emailValue || "").trim().toLowerCase();
  const password = String(passwordValue || "");
  if (!email || !password) throw authError("E-mail e senha são obrigatórios.");

  const customers = await supabase(
    `customers?email=eq.${encodeURIComponent(email)}&select=*`,
    { method: "GET" }
  );
  const customer = customers?.[0];
  if (!customer || String(customer.password || "") !== password) {
    throw authError("Login incorreto ou cadastro não encontrado.");
  }
  return customer;
}

async function registerCustomer(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!email || !password || !name) {
    const error = new Error("Nome, e-mail e senha são obrigatórios.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await supabase(
    `customers?email=eq.${encodeURIComponent(email)}&select=id`,
    { method: "GET" }
  );
  if (existing?.length) {
    const error = new Error("Este e-mail já está cadastrado.");
    error.statusCode = 409;
    throw error;
  }

  const customer = {
    id: email,
    name,
    email,
    password,
    phone: String(body.phone || ""),
    cpf: String(body.cpf || ""),
    cep: String(body.cep || ""),
    street: String(body.street || ""),
    number: String(body.number || ""),
    complement: String(body.complement || ""),
    neighborhood: String(body.neighborhood || ""),
    city: String(body.city || ""),
    state: String(body.state || "").toUpperCase().slice(0, 2)
  };

  const saved = await supabase("customers", {
    method: "POST",
    body: JSON.stringify(customer)
  });
  return saved?.[0] || customer;
}

async function customerOrders(body) {
  const customer = await validateCustomerCredentials(body.email, body.password);
  const orders = await supabase(
    `orders?buyer->>email=eq.${encodeURIComponent(customer.email)}&select=*&order=created_at.desc`,
    { method: "GET" }
  );
  return orders || [];
}

async function saveReview(body) {
  const customerEmail = String(body.customerEmail || "").trim().toLowerCase();
  const customerPassword = String(body.customerPassword || "");
  const bookId = String(body.bookId || "").trim();
  const rating = Number(body.rating || 0);
  const comment = String(body.comment || "").trim();

  if (!customerEmail || !customerPassword || !bookId) throw new Error("Dados da avaliação incompletos.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("A nota deve ser de 1 a 5 estrelas.");
  if (comment.length < 3 || comment.length > 2000) throw new Error("O comentário deve possuir entre 3 e 2000 caracteres.");

  const customers = await supabase(
    `customers?email=eq.${encodeURIComponent(customerEmail)}&select=email,password,name`,
    { method: "GET" }
  );
  const customer = customers?.[0];
  if (!customer || String(customer.password || "") !== customerPassword) {
    const error = new Error("Não foi possível validar sua conta.");
    error.statusCode = 401;
    throw error;
  }

  const books = await supabase(`books?id=eq.${encodeURIComponent(bookId)}&select=id,title`, { method: "GET" });
  const book = books?.[0];
  if (!book) {
    const error = new Error("Livro não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  const orders = await supabase(
    `orders?buyer->>email=eq.${encodeURIComponent(customerEmail)}&select=id,status,payment_status,book_title,items`,
    { method: "GET" }
  );
  const purchased = (orders || []).some(order => orderIsPaid(order) && orderContainsBook(order, book.id, book.title));
  if (!purchased) {
    const error = new Error("Apenas clientes que compraram este livro podem avaliar.");
    error.statusCode = 403;
    throw error;
  }

  const now = new Date().toISOString();
  const review = {
    book_id: book.id,
    customer_email: customerEmail,
    customer_name: String(body.customerName || customer.name || "Cliente MBLab").trim(),
    rating,
    comment,
    updated_at: now
  };

  const saved = await supabase("reviews?on_conflict=book_id,customer_email", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(review)
  });

  return saved?.[0] || review;
}

exports.handler = async function(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  try {
    const query = event.queryStringParameters || {};
    const action = String(query.action || "");
    const admin = isAdminRequest(event);

    if (action === "customer-login") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      const body = JSON.parse(event.body || "{}");
      const customer = await validateCustomerCredentials(body.email, body.password);
      return json(200, { customer });
    }

    if (action === "customer-register") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      const body = JSON.parse(event.body || "{}");
      const customer = await registerCustomer(body);
      return json(200, { customer });
    }

    if (action === "customer-orders") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      const body = JSON.parse(event.body || "{}");
      const orders = await customerOrders(body);
      return json(200, { orders });
    }

    if (action === "next-order-id") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      const orderId = await nextOrderId();
      return json(200, { orderId });
    }

    if (action === "upload-image") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      if (!admin) return json(401, { error: "Acesso administrativo necessário." });
      const body = JSON.parse(event.body || "{}");
      const url = await uploadImage(body);
      return json(200, { url });
    }

    if (action === "save-review") {
      if (event.httpMethod !== "POST") return json(405, { error: "Método não permitido." });
      const body = JSON.parse(event.body || "{}");
      const review = await saveReview(body);
      return json(200, { review });
    }

    const table = tables[query.table];

    if (event.httpMethod === "GET") {
      if (query.table === "reviews" && query.bookId) {
        const reviews = await supabase(
          `reviews?book_id=eq.${encodeURIComponent(query.bookId)}&select=*&order=updated_at.desc`,
          { method: "GET" }
        );
        return json(200, { reviews });
      }

      const [books, coupons, reviews] = await Promise.all([
        supabase("books?select=*&order=created_at.desc", { method: "GET" }),
        supabase("coupons?select=*&order=created_at.desc", { method: "GET" }),
        supabase("reviews?select=*&order=updated_at.desc", { method: "GET" }).catch(() => [])
      ]);

      if (!admin) return json(200, { books, coupons, orders: [], customers: [], reviews });

      const [orders, customers] = await Promise.all([
        supabase("orders?select=*&order=created_at.desc", { method: "GET" }),
        supabase("customers?select=*&order=created_at.desc", { method: "GET" }).catch(() => [])
      ]);
      return json(200, { books, coupons, orders, customers, reviews });
    }

    if (!table) return json(400, { error: "Tabela inválida." });

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
      const publicOrderCreation = query.table === "orders" && event.httpMethod === "POST";
      if (!admin && !publicOrderCreation) return json(401, { error: "Acesso administrativo necessário." });

      const safeBody = publicOrderCreation ? {
        ...body,
        status: "Aguardando pagamento",
        tracking_code: "",
        stock_deducted: false
      } : body;

      const target = publicOrderCreation ? table : `${table}?on_conflict=id`;
      const data = await supabase(target, {
        method: "POST",
        headers: publicOrderCreation ? { Prefer: "return=representation" } : { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(safeBody)
      });
      return json(200, { item: data?.[0] || safeBody });
    }

    if (event.httpMethod === "PATCH") {
      if (!admin) return json(401, { error: "Acesso administrativo necessário." });
      if (!query.id) return json(400, { error: "ID obrigatório." });
      const data = await supabase(`${table}?id=eq.${encodeURIComponent(query.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      return json(200, { item: data?.[0] || body });
    }

    if (event.httpMethod === "DELETE") {
      if (!admin) return json(401, { error: "Acesso administrativo necessário." });
      if (!query.id) return json(400, { error: "ID obrigatório." });
      await supabase(`${table}?id=eq.${encodeURIComponent(query.id)}`, { method: "DELETE" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Método não permitido." });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || "Erro no banco." });
  }
};
