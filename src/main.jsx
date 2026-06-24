import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Menu, ShoppingBag, User, Trash2, Pencil, Plus, TicketPercent, Eye, EyeOff } from "lucide-react";
import "./style.css";

const ADMIN_EMAIL = "mateusbpugli@gmail.com";
const ADMIN_PASSWORD = "Mateus Buarque 1101";

const DEFAULT_DATA = {
  books: [
    {
      id: "o-cancelado",
      title: "O Cancelado",
      description: "Livro de humor ácido, ironia e comédia direta.",
      longDescription: "Uma obra independente da MBLab para quem gosta de humor direto, textos com personalidade e uma pegada politicamente incorreta.",
      price: 10,
      oldPrice: 0,
      type: "Físico",
      stock: 30,
      cover: "/logo.jpeg",
      active: true
    }
  ],
  coupons: [
    { id: "MIMIMI10", code: "MIMIMI10", type: "percent", value: 10, active: true }
  ],
  orders: [],
  store: {
    name: "MBLab",
    tagline: "Trabalhamos com o politicamente f****",
    announcement: "Loja oficial de livros MBLab"
  }
};

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function id() {
  return Math.random().toString(36).slice(2, 9);
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || id();
}

function useLocalData() {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mblab_store_data")) || DEFAULT_DATA;
    } catch {
      return DEFAULT_DATA;
    }
  });

  useEffect(() => {
    localStorage.setItem("mblab_store_data", JSON.stringify(data));
  }, [data]);

  return [data, setData];
}

function useRoute() {
  const [route, setRoute] = useState(window.location.hash.replace("#", "") || "/");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

function Header({ logged, logout }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="header">
        <button className="iconBtn" onClick={() => setOpen(!open)}><Menu /></button>
        <a className="brand" href="#/">
          <img src="/logo.jpeg" alt="MBLab" />
          <span>MBLab</span>
        </a>
        <nav className={open ? "nav open" : "nav"}>
          <a href="#/">Início</a>
          <a href="#/loja">Livros</a>
          <a href="#/admin">{logged ? "Admin" : "Login"}</a>
          {logged && <button onClick={logout}>Sair</button>}
        </nav>
      </header>
      <div className="categoryBar">
        <a href="#/loja">Todos</a>
        <a href="#/loja/fisicos">Livros físicos</a>
        <a href="#/loja/digitais">Livros digitais</a>
        <a href="#/loja/promocoes">Promoções</a>
      </div>
    </>
  );
}

function Home({ data }) {
  const books = data.books.filter((b) => b.active);
  return (
    <>
      <section className="hero">
        <div className="heroText">
          <p className="eyebrow">Loja oficial</p>
          <h1>{data.store.name}</h1>
          <p>{data.store.tagline}</p>
          <a className="btn red" href="#/loja">Comprar livros</a>
        </div>
        <div className="heroLogo">
          <img src="/logo.jpeg" alt="MBLab" />
        </div>
      </section>

      <section className="section">
        <div className="sectionHead">
          <h2>Livros em destaque</h2>
          <a href="#/loja">Ver todos</a>
        </div>
        <BookGrid books={books} />
      </section>

      <section className="banner">
        <h2>Humor, livro e zero frescura.</h2>
        <p>Compre direto pela loja oficial da MBLab.</p>
      </section>
    </>
  );
}

function Store({ data, category = "todos" }) {
  let books = data.books.filter((b) => b.active);

  if (category === "fisicos") {
    books = books.filter((b) => String(b.type).toLowerCase().includes("físico") || String(b.type).toLowerCase().includes("fisico"));
  }

  if (category === "digitais") {
    books = books.filter((b) => String(b.type).toLowerCase().includes("digital"));
  }

  if (category === "promocoes") {
    books = books.filter((b) => Number(b.oldPrice || 0) > Number(b.price || 0));
  }

  const titles = {
    todos: "Todos os livros",
    fisicos: "Livros físicos",
    digitais: "Livros digitais",
    promocoes: "Promoções"
  };

  return (
    <section className="section">
      <h1>{titles[category] || "Livros"}</h1>
      <BookGrid books={books} />
    </section>
  );
}

function BookGrid({ books }) {
  if (!books.length) return <div className="empty">Nenhum livro ativo no momento.</div>;
  return <div className="grid">{books.map((book) => <BookCard key={book.id} book={book} />)}</div>;
}

function BookCard({ book }) {
  return (
    <article className="product">
      <a href={`#/livro/${book.id}`} className="cover">
        <span>{book.type}</span>
        <img src={book.cover || "/logo.jpeg"} alt={book.title} />
      </a>
      <div className="productInfo">
        <h3>{book.title}</h3>
        <p>{book.description}</p>
        {book.oldPrice > 0 && <del>{money(book.oldPrice)}</del>}
        <strong>{money(book.price)}</strong>
        <small>{book.stock > 0 ? `Só restam ${book.stock} em estoque` : "Esgotado"}</small>
        <a className="btn outline" href={`#/livro/${book.id}`}>Ver detalhes</a>
      </div>
    </article>
  );
}

function BookPage({ data, setData }) {
  const bookId = window.location.hash.split("/")[2];
  const book = data.books.find((b) => b.id === bookId);
  if (!book) return <section className="section"><h1>Livro não encontrado</h1></section>;
  return (
    <section className="detail">
      <a className="back" href="#/loja">← voltar</a>
      <div className="detailGrid">
        <img className="detailCover" src={book.cover || "/logo.jpeg"} alt={book.title} />
        <div className="detailInfo">
          <span className="pill">{book.type}</span>
          <h1>{book.title}</h1>
          <p>{book.longDescription || book.description}</p>
          {book.oldPrice > 0 && <del>{money(book.oldPrice)}</del>}
          <strong className="bigPrice">{money(book.price)}</strong>
          <small>{book.stock > 0 ? `${book.stock} em estoque` : "Esgotado"}</small>
          <Checkout book={book} coupons={data.coupons} data={data} setData={setData} />
        </div>
      </div>
    </section>
  );
}

function Checkout({ book, coupons, data, setData }) {
  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);

  const activeCoupon = useMemo(() => {
    return coupons.find((c) => c.active && c.code.trim().toLowerCase() === coupon.trim().toLowerCase());
  }, [coupon, coupons]);

  const finalPrice = useMemo(() => {
    let price = Number(book.price || 0);
    if (activeCoupon) {
      if (activeCoupon.type === "percent") price = price - (price * Number(activeCoupon.value || 0) / 100);
      if (activeCoupon.type === "fixed") price = price - Number(activeCoupon.value || 0);
    }
    return Math.max(0.01, Number(price.toFixed(2)));
  }, [book.price, activeCoupon]);

  async function pay(e) {
    e.preventDefault();

    const required = [
      ["name", "nome completo"],
      ["email", "e-mail"],
      ["phone", "WhatsApp"],
      ["cep", "CEP"],
      ["street", "rua"],
      ["number", "número"],
      ["neighborhood", "bairro"],
      ["city", "cidade"],
      ["state", "estado"]
    ];

    for (const [field, label] of required) {
      if (!String(buyer[field] || "").trim()) {
        alert(`Preencha o campo: ${label}.`);
        return;
      }
    }

    const order = {
      id: `PED-${Date.now()}`,
      createdAt: new Date().toLocaleString("pt-BR"),
      status: "Aguardando pagamento",
      trackingCode: "",
      bookId: book.id,
      bookTitle: book.title,
      bookType: book.type,
      originalPrice: Number(book.price || 0),
      finalPrice,
      coupon: activeCoupon?.code || "",
      buyer: { ...buyer }
    };

    setData({
      ...data,
      orders: [order, ...(data.orders || [])]
    });

    localStorage.setItem("mblab_last_order", JSON.stringify(order));

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${book.title} - ${order.id}`,
          price: finalPrice,
          quantity: 1,
          email: buyer.email,
          coupon: activeCoupon?.code || "",
          orderId: order.id
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao criar pagamento.");
        return;
      }
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch (err) {
      alert("Erro ao conectar com o Mercado Pago.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="checkout" onSubmit={pay}>
      <h2>Comprar agora</h2>
      <input placeholder="Nome completo" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
      <input placeholder="E-mail" type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
      <input placeholder="WhatsApp" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
      <input placeholder="CPF (opcional)" value={buyer.cpf} onChange={(e) => setBuyer({ ...buyer, cpf: e.target.value })} />

      <h3 className="shippingTitle">Informações de envio</h3>
      <div className="shippingGrid">
        <input placeholder="CEP" value={buyer.cep} onChange={(e) => setBuyer({ ...buyer, cep: e.target.value })} />
        <input placeholder="Estado" value={buyer.state} onChange={(e) => setBuyer({ ...buyer, state: e.target.value.toUpperCase() })} maxLength={2} />
        <input placeholder="Rua / Avenida" value={buyer.street} onChange={(e) => setBuyer({ ...buyer, street: e.target.value })} />
        <input placeholder="Número" value={buyer.number} onChange={(e) => setBuyer({ ...buyer, number: e.target.value })} />
        <input placeholder="Complemento" value={buyer.complement} onChange={(e) => setBuyer({ ...buyer, complement: e.target.value })} />
        <input placeholder="Bairro" value={buyer.neighborhood} onChange={(e) => setBuyer({ ...buyer, neighborhood: e.target.value })} />
        <input placeholder="Cidade" value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} />
      </div>

      <div className="couponLine">
        <input placeholder="Cupom de desconto" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
        <span>{activeCoupon ? "Cupom aplicado" : coupon ? "Cupom inválido" : ""}</span>
      </div>
      <div className="total">
        <span>Total</span>
        <b>{money(finalPrice)}</b>
      </div>
      <button className="btn red full" disabled={loading || book.stock <= 0}>{loading ? "Abrindo..." : "Comprar com Pix ou Cartão"}</button>
    </form>
  );
}

function Admin({ data, setData, logged, login, logout }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  if (!logged) {
    return (
      <section className="login">
        <form className="card" onSubmit={(e) => { e.preventDefault(); login(email, password); }}>
          <h1>Admin</h1>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="pass">
            <input placeholder="Senha" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button>
          </div>
          <button className="btn red full">Entrar</button>
        </form>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="adminTop">
        <h1>Painel Admin</h1>
        <button className="btn black" onClick={logout}>Sair</button>
      </div>
      <div className="adminGrid">
        <BooksAdmin data={data} setData={setData} />
        <CouponsAdmin data={data} setData={setData} />
      </div>
      <OrdersAdmin data={data} setData={setData} />
    </section>
  );
}

function BooksAdmin({ data, setData }) {
  const empty = { id: "", title: "", description: "", longDescription: "", price: 0, oldPrice: 0, type: "Físico", stock: 0, cover: "", active: true };
  const [form, setForm] = useState(empty);

  function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Escolha um arquivo de imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, cover: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function save() {
    if (!form.title) return alert("Coloque o título.");
    const book = { ...form, id: form.id || slug(form.title), price: Number(form.price), oldPrice: Number(form.oldPrice), stock: Number(form.stock), active: Boolean(form.active) };
    const exists = data.books.some((b) => b.id === book.id);
    setData({ ...data, books: exists ? data.books.map((b) => b.id === book.id ? book : b) : [...data.books, book] });
    setForm(empty);
  }

  function remove(bookId) {
    if (!confirm("Apagar livro?")) return;
    setData({ ...data, books: data.books.filter((b) => b.id !== bookId) });
  }

  return (
    <div className="card adminBox">
      <h2>Livros</h2>
      <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input placeholder="Descrição curta" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <textarea placeholder="Descrição completa" value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} />
      <input placeholder="Preço" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <input placeholder="Preço antigo opcional" type="number" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Físico</option><option>Digital</option></select>
      <input placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
      <label className="uploadLabel">
        Capa do livro
        <input type="file" accept="image/*" onChange={handleCoverUpload} />
      </label>
      {form.cover && (
        <div className="coverPreview">
          <img src={form.cover} alt="Prévia da capa" />
          <button type="button" onClick={() => setForm({ ...form, cover: "" })}>Remover capa</button>
        </div>
      )}
      <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
      <button className="btn red full" onClick={save}><Plus /> Salvar livro</button>
      <div className="list">
        {data.books.map((b) => (
          <div className="row" key={b.id}>
            <span>{b.title}</span>
            <button onClick={() => setForm(b)}><Pencil size={16} /></button>
            <button onClick={() => remove(b.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponsAdmin({ data, setData }) {
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, active: true });

  function save() {
    if (!form.code) return alert("Coloque o código do cupom.");
    const coupon = { ...form, id: form.code.toUpperCase(), code: form.code.toUpperCase(), value: Number(form.value) };
    const exists = data.coupons.some((c) => c.id === coupon.id);
    setData({ ...data, coupons: exists ? data.coupons.map((c) => c.id === coupon.id ? coupon : c) : [...data.coupons, coupon] });
    setForm({ code: "", type: "percent", value: 10, active: true });
  }

  function remove(couponId) {
    setData({ ...data, coupons: data.coupons.filter((c) => c.id !== couponId) });
  }

  return (
    <div className="card adminBox">
      <h2>Cupons</h2>
      <input placeholder="Código. Ex: MIMIMI10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Porcentagem %</option><option value="fixed">Valor fixo R$</option></select>
      <input placeholder="Valor" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
      <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
      <button className="btn red full" onClick={save}><TicketPercent /> Salvar cupom</button>
      <div className="list">
        {data.coupons.map((c) => (
          <div className="row" key={c.id}>
            <span>{c.code} - {c.type === "percent" ? `${c.value}%` : money(c.value)}</span>
            <button onClick={() => setForm(c)}><Pencil size={16} /></button>
            <button onClick={() => remove(c.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}


function OrdersAdmin({ data, setData }) {
  const orders = data.orders || [];

  function updateOrder(orderId, updates) {
    setData({
      ...data,
      orders: orders.map((order) => order.id === orderId ? { ...order, ...updates } : order)
    });
  }

  function removeOrder(orderId) {
    if (!confirm("Apagar pedido?")) return;
    setData({
      ...data,
      orders: orders.filter((order) => order.id !== orderId)
    });
  }

  return (
    <div className="card adminBox ordersBox">
      <h2>Pedidos</h2>
      {!orders.length && <p className="muted">Nenhum pedido registrado ainda.</p>}

      <div className="ordersList">
        {orders.map((order) => (
          <div className="orderCard" key={order.id}>
            <div>
              <h3>{order.bookTitle}</h3>
              <p><b>Código:</b> {order.id}</p>
              <p><b>Data:</b> {order.createdAt}</p>
              <p><b>Valor:</b> {money(order.finalPrice)}</p>
              <p><b>Cupom:</b> {order.coupon || "Nenhum"}</p>

              <hr />

              <p><b>Cliente:</b> {order.buyer.name}</p>
              <p><b>E-mail:</b> {order.buyer.email}</p>
              <p><b>WhatsApp:</b> {order.buyer.phone}</p>
              {order.buyer.cpf && <p><b>CPF:</b> {order.buyer.cpf}</p>}

              <hr />

              <p><b>Endereço:</b> {order.buyer.street}, {order.buyer.number}</p>
              {order.buyer.complement && <p><b>Complemento:</b> {order.buyer.complement}</p>}
              <p><b>Bairro:</b> {order.buyer.neighborhood}</p>
              <p><b>Cidade/UF:</b> {order.buyer.city} - {order.buyer.state}</p>
              <p><b>CEP:</b> {order.buyer.cep}</p>
            </div>

            <div className="orderActions">
              <label>Status do pedido</label>
              <select value={order.status} onChange={(e) => updateOrder(order.id, { status: e.target.value })}>
                <option>Aguardando pagamento</option>
                <option>Pago</option>
                <option>Separando pedido</option>
                <option>Enviado</option>
                <option>Entregue</option>
                <option>Cancelado</option>
              </select>

              <label>Código de rastreio</label>
              <input value={order.trackingCode || ""} onChange={(e) => updateOrder(order.id, { trackingCode: e.target.value })} placeholder="Ex: BR123456789BR" />

              <button className="btn outline" onClick={() => removeOrder(order.id)}>Apagar pedido</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPage({ type }) {
  const map = {
    sucesso: ["Pagamento aprovado", "Seu pagamento foi aprovado pelo Mercado Pago."],
    erro: ["Pagamento não concluído", "O pagamento foi cancelado ou recusado."],
    pendente: ["Pagamento pendente", "Aguardando confirmação do Mercado Pago."]
  };
  const [title, text] = map[type] || map.pendente;
  let order = null;
  try { order = JSON.parse(localStorage.getItem("mblab_last_order") || "null"); } catch {}

  return (
    <section className="section center">
      <ShoppingBag size={54} />
      <h1>{title}</h1>
      <p>{text}</p>
      {order && (
        <div className="card orderSummary">
          <h2>Resumo do pedido</h2>
          <p><b>Código:</b> {order.id}</p>
          <p><b>Livro:</b> {order.bookTitle}</p>
          <p><b>Cliente:</b> {order.buyer.name}</p>
          <p><b>Entrega:</b> {order.buyer.street}, {order.buyer.number} - {order.buyer.city}/{order.buyer.state}</p>
        </div>
      )}
      <a className="btn red" href="#/loja">Voltar para loja</a>
    </section>
  );
}

function App() {
  const [data, setData] = useLocalData();
  const route = useRoute();
  const [logged, setLogged] = useState(() => localStorage.getItem("mblab_admin") === "yes");

  function login(email, password) {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("mblab_admin", "yes");
      setLogged(true);
      window.location.hash = "/admin";
    } else {
      alert("Login incorreto.");
    }
  }

  function logout() {
    localStorage.removeItem("mblab_admin");
    setLogged(false);
    window.location.hash = "/";
  }

  let page = <Home data={data} />;
  if (route === "/loja") page = <Store data={data} category="todos" />;
  if (route === "/loja/fisicos") page = <Store data={data} category="fisicos" />;
  if (route === "/loja/digitais") page = <Store data={data} category="digitais" />;
  if (route === "/loja/promocoes") page = <Store data={data} category="promocoes" />;
  if (route.startsWith("/livro/")) page = <BookPage data={data} setData={setData} />;
  if (route === "/admin") page = <Admin data={data} setData={setData} logged={logged} login={login} logout={logout} />;
  if (route.startsWith("/pagamento/")) page = <StatusPage type={route.split("/")[2]} />;

  return (
    <>
      <Header logged={logged} logout={logout} />
      {page}
      <footer>
        <b>MBLab</b>
        <span>Loja oficial de livros</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
