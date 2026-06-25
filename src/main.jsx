
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Menu, Plus, Pencil, Trash2, Eye, EyeOff, ShoppingCart } from "lucide-react";
import "./style.css";

const ADMIN_EMAIL = "mateusbpugli@gmail.com";
const ADMIN_PASSWORD = "Mateus Buarque 1101";
const CUSTOMER_KEY = "mblab_customer";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function slug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || Math.random().toString(36).slice(2, 9);
}

function calculateShipping(cep, state, total) {
  const clean = String(cep || "").replace(/\D/g, "");
  if (clean.length < 8) return null;

  let uf = String(state || "").toUpperCase().trim();
  const prefix = Number(clean.slice(0, 2));

  if (!uf) {
    if (prefix >= 1 && prefix <= 19) uf = "SP";
    else if (prefix >= 20 && prefix <= 28) uf = "RJ";
    else if (prefix === 29) uf = "ES";
    else if (prefix >= 30 && prefix <= 39) uf = "MG";
    else if (prefix >= 40 && prefix <= 48) uf = "BA";
    else if (prefix === 49) uf = "SE";
    else if (prefix >= 50 && prefix <= 56) uf = "PE";
    else if (prefix === 57) uf = "AL";
    else if (prefix === 58) uf = "PB";
    else if (prefix === 59) uf = "RN";
    else if (prefix >= 60 && prefix <= 63) uf = "CE";
    else if (prefix === 64) uf = "PI";
    else if (prefix === 65) uf = "MA";
    else if (prefix >= 66 && prefix <= 68) uf = "PA";
    else if (prefix === 69) uf = "AM";
    else if (prefix >= 70 && prefix <= 72) uf = "DF";
    else if (prefix >= 73 && prefix <= 76) uf = "GO";
    else if (prefix === 77) uf = "TO";
    else if (prefix === 78) uf = "MT";
    else if (prefix === 79) uf = "MS";
    else if (prefix >= 80 && prefix <= 87) uf = "PR";
    else if (prefix >= 88 && prefix <= 89) uf = "SC";
    else if (prefix >= 90 && prefix <= 99) uf = "RS";
  }

  const sudeste = ["SP", "RJ", "MG", "ES"];
  const sul = ["PR", "SC", "RS"];
  const centro = ["DF", "GO", "MT", "MS"];
  const nordeste = ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"];
  const norte = ["AM", "PA", "AC", "RO", "RR", "AP", "TO"];

  let price = 24, min = 6, max = 10;

  if (uf === "SP") { price = 14; min = 2; max = 5; }
  else if (sudeste.includes(uf)) { price = 19; min = 4; max = 8; }
  else if (sul.includes(uf)) { price = 23; min = 5; max = 9; }
  else if (centro.includes(uf)) { price = 28; min = 6; max = 11; }
  else if (nordeste.includes(uf)) { price = 34; min = 8; max = 14; }
  else if (norte.includes(uf)) { price = 42; min = 10; max = 18; }

  if (Number(total || 0) >= 120) price = 0;

  return {
    price,
    uf: uf || "BR",
    service: "Correios PAC",
    days: `${min} a ${max} dias úteis após o envio`
  };
}

async function api(path, options = {}) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.details || data.error || "Erro");
  return data;
}

function bookToDb(book) {
  return {
    id: book.id || slug(book.title),
    title: book.title,
    description: book.description,
    long_description: book.longDescription,
    price: Number(book.price || 0),
    old_price: Number(book.oldPrice || 0),
    type: book.type,
    stock: Number(book.stock || 0),
    cover: book.cover || "/logo.jpeg",
    active: Boolean(book.active)
  };
}

function useRoute() {
  const [route, setRoute] = useState(location.hash.replace("#", "") || "/");
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#", "") || "/");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

function useData() {
  const [data, setData] = useState({ books: [], coupons: [], orders: [], customers: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await api("/.netlify/functions/store-data");
      setData({
        books: response.books || [],
        coupons: response.coupons || [],
        orders: response.orders || [],
        customers: response.customers || []
      });
    } catch (error) {
      alert("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  return { data, loading, load };
}

function useCustomer() {
  const [customer, setCustomer] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null"); }
    catch { return null; }
  });

  function save(customerData) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customerData));
    setCustomer(customerData);
  }

  function logout() {
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
  }

  return { customer, save, logout };
}

function useCart(customer) {
  const key = `mblab_cart_${customer?.email || "anon"}`;
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(key) || "[]")); }
    catch { setCart([]); }
  }, [key]);

  function persist(next) {
    setCart(next);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function add(book) {
    if (!customer) {
      location.hash = "/login";
      return;
    }
    persist([{ bookId: book.id, qty: 1 }, ...cart.filter(item => item.bookId !== book.id)]);
    location.hash = "/carrinho";
  }

  function remove(bookId) {
    persist(cart.filter(item => item.bookId !== bookId));
  }

  function clear() {
    persist([]);
  }

  return { cart, add, remove, clear };
}

function Header({ adminLogged, customer, customerLogout, cartCount }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header>
        <button onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button>
        <a className="brand" href="#/"><img src="/logo.jpeg" alt="MBLab" />MBLab</a>
        <nav className={open ? "open" : ""}>
          <a href="#/">Início</a>
          <a href="#/loja">Livros</a>
          <a href="#/carrinho">Carrinho ({cartCount})</a>
          <a href="#/minhas-compras">Minhas compras</a>
          {adminLogged && <a href="#/admin">Admin</a>}
          {customer ? <button onClick={customerLogout}>Sair cliente</button> : <a href="#/login">Entrar</a>}
        </nav>
      </header>

      <div className="cat">
        <a href="#/loja">Todos</a>
        <a href="#/loja/fisicos">Livros físicos</a>
        <a href="#/loja/digitais">Livros digitais</a>
        <a href="#/loja/promocoes">Promoções</a>
      </div>

      <div className="mobileBottomNav">
        <a href="#/">Início</a>
        <a href="#/loja">Livros</a>
        <a href="#/carrinho">Carrinho {cartCount ? `(${cartCount})` : ""}</a>
        <a href="#/minhas-compras">Compras</a>
      </div>
    </>
  );
}

function Home({ data }) {
  const books = data.books.filter(book => book.active);
  const first = books[0];

  return (
    <>
      <div className="desktopOnlyHome">
        <section className="hero">
          <div>
            <p>Loja oficial</p>
            <h1>MBLab</h1>
            <h2>Trabalhamos com o politicamente f****</h2>
            <a className="btn red" href="#/loja">Comprar livros</a>
          </div>
          <img src="/logo.jpeg" alt="MBLab" />
        </section>
        <Section title="Livros em destaque"><Grid books={books} /></Section>
      </div>

      <main className="mobileOnlyHome">
        <section className="mHero">
          <img src="/logo.jpeg" alt="MBLab" />
          <p>Loja oficial MBLab</p>
          <h1>Livros sem mimimi.</h1>
          <a className="btn red" href="#/loja">Comprar agora</a>
        </section>

        <div className="mSearch" onClick={() => location.hash = "/loja"}>Pesquisar livros</div>

        <div className="mChips">
          <a href="#/loja">Todos</a>
          <a href="#/loja/fisicos">Físicos</a>
          <a href="#/loja/digitais">Digitais</a>
          <a href="#/loja/promocoes">Promoções</a>
        </div>

        {first && (
          <section className="mFeature">
            <span>Destaque</span>
            <img src={first.cover || "/logo.jpeg"} alt={first.title} />
            <h2>{first.title}</h2>
            <b>{money(first.price)}</b>
            <a className="btn red" href={`#/livro/${first.id}`}>Ver livro</a>
          </section>
        )}

        <section className="mShelf">
          <h2>Livros disponíveis</h2>
          <div>
            {books.slice(0, 8).map(book => (
              <a className="mBook" href={`#/livro/${book.id}`} key={book.id}>
                <img src={book.cover || "/logo.jpeg"} alt={book.title} />
                <strong>{book.title}</strong>
                <small>{money(book.price)}</small>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Section({ title, children }) {
  return <section className="section"><h1>{title}</h1>{children}</section>;
}

function Grid({ books }) {
  if (!books.length) return <div className="empty">Nenhum livro ativo.</div>;
  return <div className="grid">{books.map(book => <BookCard key={book.id} book={book} />)}</div>;
}

function BookCard({ book }) {
  return (
    <article className="prod">
      <a href={`#/livro/${book.id}`}><img src={book.cover || "/logo.jpeg"} alt={book.title} /></a>
      <h2>{book.title}</h2>
      <p>{book.description}</p>
      {Number(book.old_price || 0) > 0 && <del>{money(book.old_price)}</del>}
      <b>{money(book.price)}</b>
      <a className="btn" href={`#/livro/${book.id}`}>Ver detalhes</a>
    </article>
  );
}

function Store({ data, category = "todos" }) {
  let books = data.books.filter(book => book.active);

  if (category === "fisicos") books = books.filter(book => String(book.type).toLowerCase().includes("físico") || String(book.type).toLowerCase().includes("fisico"));
  if (category === "digitais") books = books.filter(book => String(book.type).toLowerCase().includes("digital"));
  if (category === "promocoes") books = books.filter(book => Number(book.old_price || 0) > Number(book.price || 0));

  return <Section title={category === "todos" ? "Todos os livros" : category === "fisicos" ? "Livros físicos" : category === "digitais" ? "Livros digitais" : "Promoções"}><Grid books={books} /></Section>;
}

function BookPage({ data, cart }) {
  const book = data.books.find(item => item.id === location.hash.split("/")[2]);
  if (!book) return <Section title="Livro não encontrado" />;

  return (
    <section className="detail">
      <img src={book.cover || "/logo.jpeg"} alt={book.title} />
      <div>
        <h1>{book.title}</h1>
        <p>{book.long_description || book.description}</p>
        <b>{money(book.price)}</b>
        <button className="btn red" onClick={() => cart.add(book)}><ShoppingCart /> Adicionar ao carrinho</button>
      </div>
    </section>
  );
}

function Login({ data, customerSave, adminLogin }) {
  const [mode, setMode] = useState("login");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", cpf: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: ""
  });

  async function submit(event) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) return alert("Preencha e-mail e senha.");

    if (mode === "login") {
      if (email === ADMIN_EMAIL.toLowerCase() && form.password === ADMIN_PASSWORD) {
        adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
        return;
      }

      const user = (data.customers || []).find(customer => customer.email === email && customer.password === form.password);
      if (!user) return alert("Login incorreto ou cadastro não encontrado.");
      customerSave(user);
      location.hash = "/loja";
      return;
    }

    if (!form.name) return alert("Preencha seu nome.");
    const customer = { ...form, id: email, email };
    await api("/.netlify/functions/store-data?table=customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer)
    });
    customerSave(customer);
    location.hash = "/loja";
  }

  return (
    <section className="login">
      <form className="box" onSubmit={submit}>
        <h1>{mode === "login" ? "Entrar" : "Criar cadastro"}</h1>
        {mode === "register" && <input placeholder="Nome completo" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />}
        <input placeholder="E-mail" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} />
        <div className="pass">
          <input placeholder="Senha" type={show ? "text" : "password"} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
          <button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button>
        </div>

        {mode === "register" && (
          <>
            <input placeholder="WhatsApp" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} />
            <input placeholder="CPF opcional" value={form.cpf} onChange={event => setForm({ ...form, cpf: event.target.value })} />
            <h3>Endereço</h3>
            <div className="shippingGrid">
              <input placeholder="CEP" value={form.cep} onChange={event => setForm({ ...form, cep: event.target.value })} />
              <input placeholder="UF" maxLength={2} value={form.state} onChange={event => setForm({ ...form, state: event.target.value.toUpperCase() })} />
              <input placeholder="Rua" value={form.street} onChange={event => setForm({ ...form, street: event.target.value })} />
              <input placeholder="Número" value={form.number} onChange={event => setForm({ ...form, number: event.target.value })} />
              <input placeholder="Complemento" value={form.complement} onChange={event => setForm({ ...form, complement: event.target.value })} />
              <input placeholder="Bairro" value={form.neighborhood} onChange={event => setForm({ ...form, neighborhood: event.target.value })} />
              <input placeholder="Cidade" value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} />
            </div>
          </>
        )}

        <button className="btn red full">{mode === "login" ? "Entrar" : "Cadastrar e entrar"}</button>
        <button className="linkBtn" type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Criar cadastro" : "Já tenho cadastro"}</button>
      </form>
    </section>
  );
}

function Cart({ data, cart, customer }) {
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [shippingCep, setShippingCep] = useState(customer?.cep || "");
  const [shippingState, setShippingState] = useState(customer?.state || "");
  const [shipping, setShipping] = useState(null);

  const items = cart.cart.map(item => ({
    book: data.books.find(book => book.id === item.bookId),
    qty: item.qty
  })).filter(item => item.book);

  const activeCoupon = data.coupons.find(couponItem => couponItem.active && couponItem.code?.toLowerCase() === coupon.toLowerCase());

  let productsTotal = items.reduce((sum, item) => sum + Number(item.book.price) * item.qty, 0);
  if (activeCoupon) {
    if (activeCoupon.type === "percent") productsTotal -= productsTotal * Number(activeCoupon.value) / 100;
    else productsTotal -= Number(activeCoupon.value);
  }
  productsTotal = Math.max(0.01, Number(productsTotal.toFixed(2)));

  const shippingValue = shipping ? Number(shipping.price || 0) : 0;
  const total = Number((productsTotal + shippingValue).toFixed(2));

  function simulateShipping() {
    const result = calculateShipping(shippingCep, shippingState, productsTotal);
    if (!result) return alert("Preencha CEP com 8 números.");
    setShipping(result);
  }

  async function pay() {
    if (!customer) {
      location.hash = "/login";
      return;
    }

    if (!items.length) return alert("Carrinho vazio.");

    let currentShipping = shipping;
    if (!currentShipping) {
      currentShipping = calculateShipping(shippingCep, shippingState, productsTotal);
      if (!currentShipping) return alert("Preencha CEP com 8 números para calcular o frete.");
      setShipping(currentShipping);
    }

    setLoading(true);

    try {
      const title = items.map(item => item.book.title).join(", ");
      const finalTotal = Number((productsTotal + Number(currentShipping.price || 0)).toFixed(2));
      const buyer = { ...customer, cep: shippingCep, state: currentShipping.uf || shippingState };

      const order = {
        id: `PED-${Date.now()}`,
        status: "Aguardando pagamento",
        tracking_code: "",
        book_title: title,
        final_price: finalTotal,
        coupon: activeCoupon?.code || "",
        buyer,
        shipping: currentShipping
      };

      await api("/.netlify/functions/store-data?table=orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      const response = await api("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${title} - ${order.id} (com frete)`, price: finalTotal, email: customer.email, orderId: order.id })
      });

      cart.clear();
      location.href = response.init_point || response.sandbox_init_point;
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <h1>Carrinho</h1>
      {!items.length && <div className="empty">Seu carrinho está vazio.</div>}

      {items.map(item => (
        <div className="cart" key={item.book.id}>
          <img src={item.book.cover || "/logo.jpeg"} alt={item.book.title} />
          <div>
            <h3>{item.book.title}</h3>
            <p>{money(item.book.price)}</p>
          </div>
          <button onClick={() => cart.remove(item.book.id)}>Remover</button>
        </div>
      ))}

      {!!items.length && (
        <div className="box checkout">
          <input placeholder="Cupom" value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} />

          <h3>Frete e prazo pelos Correios</h3>
          <div className="shippingGrid">
            <input placeholder="CEP" value={shippingCep} onChange={event => { setShippingCep(event.target.value); setShipping(null); }} />
            <input placeholder="UF opcional" maxLength={2} value={shippingState} onChange={event => { setShippingState(event.target.value.toUpperCase()); setShipping(null); }} />
          </div>
          <button type="button" className="btn full" onClick={simulateShipping}>Calcular frete</button>

          {shipping && (
            <div className="shippingResult">
              <b>{shipping.service}</b>
              <span>{shipping.price === 0 ? "Frete grátis" : money(shipping.price)}</span>
              <small>Prazo: {shipping.days}</small>
              <small>Destino estimado: {shipping.uf}</small>
            </div>
          )}

          <div className="total"><span>Produtos</span><b>{money(productsTotal)}</b></div>
          {shipping && <div className="total"><span>Frete</span><b>{shipping.price === 0 ? "Grátis" : money(shipping.price)}</b></div>}
          <div className="total grand"><span>Total</span><b>{money(total)}</b></div>

          <button className="btn red full" onClick={pay} disabled={loading}>{loading ? "Abrindo Mercado Pago..." : "Comprar com Pix ou Cartão"}</button>
        </div>
      )}
    </section>
  );
}

function MyPurchases({ customer }) {
  const [orders, setOrders] = useState([]);

  async function refresh() {
    if (!customer) {
      location.hash = "/login";
      return;
    }
    const response = await api(`/.netlify/functions/store-data?table=orders&email=${encodeURIComponent(customer.email)}`);
    setOrders(response.orders || []);
  }

  useEffect(() => { refresh(); }, [customer?.email]);

  return (
    <Section title="Minhas compras">
      <button className="btn" onClick={refresh}>Atualizar</button>
      {!orders.length && <div className="empty">Nenhuma compra encontrada.</div>}
      <div className="ordersList">
        {orders.map(order => (
          <div className="order" key={order.id}>
            <h3>{order.book_title}</h3>
            <p><b>Código:</b> {order.id}</p>
            <p><b>Status:</b> {order.status}</p>
            <p><b>Valor:</b> {money(order.final_price)}</p>
            <p><b>Rastreio:</b> {order.tracking_code || "Ainda não enviado"}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Admin({ data, load, logged, login, logout }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  if (!logged) {
    return (
      <section className="login">
        <form className="box" onSubmit={event => { event.preventDefault(); login(email, password); }}>
          <h1>Admin</h1>
          <input value={email} onChange={event => setEmail(event.target.value)} />
          <div className="pass">
            <input placeholder="Senha" type={show ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button>
          </div>
          <button className="btn red full">Entrar</button>
        </form>
      </section>
    );
  }

  return (
    <Section title="Painel Admin">
      <button className="btn" onClick={logout}>Sair</button>
      <div className="adminGrid">
        <BooksAdmin data={data} load={load} />
        <CouponsAdmin data={data} load={load} />
      </div>
      <OrdersAdmin data={data} load={load} />
    </Section>
  );
}

function BooksAdmin({ data, load }) {
  const empty = { id: "", title: "", description: "", longDescription: "", price: 0, oldPrice: 0, type: "Físico", stock: 0, cover: "", active: true };
  const [form, setForm] = useState(empty);

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, cover: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!form.title) return alert("Título obrigatório.");
    await api("/.netlify/functions/store-data?table=books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookToDb(form))
    });
    setForm(empty);
    load();
  }

  async function remove(id) {
    if (!confirm("Apagar livro?")) return;
    await api(`/.netlify/functions/store-data?table=books&id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="box adminBox">
      <h2>Livros</h2>
      <input placeholder="Título" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
      <input placeholder="Descrição curta" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
      <textarea placeholder="Descrição completa" value={form.longDescription} onChange={event => setForm({ ...form, longDescription: event.target.value })} />
      <input placeholder="Preço" type="number" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} />
      <input placeholder="Preço antigo" type="number" value={form.oldPrice} onChange={event => setForm({ ...form, oldPrice: event.target.value })} />
      <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option>Físico</option><option>Digital</option></select>
      <input placeholder="Estoque" type="number" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} />
      <input type="file" accept="image/*" onChange={upload} />
      {form.cover && <img className="preview" src={form.cover} alt="Prévia" />}
      <label><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Ativo</label>
      <button className="btn red full" onClick={save}><Plus /> Salvar livro</button>

      <div className="list">
        {data.books.map(book => (
          <div className="row" key={book.id}>
            <span>{book.title}</span>
            <button onClick={() => setForm({ id: book.id, title: book.title, description: book.description, longDescription: book.long_description, price: book.price, oldPrice: book.old_price, type: book.type, stock: book.stock, cover: book.cover, active: book.active })}><Pencil size={16} /></button>
            <button onClick={() => remove(book.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouponsAdmin({ data, load }) {
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, active: true });

  async function save() {
    if (!form.code) return alert("Código obrigatório.");
    await api("/.netlify/functions/store-data?table=coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: form.code.toUpperCase(), code: form.code.toUpperCase(), type: form.type, value: Number(form.value), active: form.active })
    });
    setForm({ code: "", type: "percent", value: 10, active: true });
    load();
  }

  async function remove(id) {
    await api(`/.netlify/functions/store-data?table=coupons&id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="box adminBox">
      <h2>Cupons</h2>
      <input placeholder="Código" value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} />
      <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="percent">Porcentagem %</option><option value="fixed">Valor fixo R$</option></select>
      <input type="number" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} />
      <label><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Ativo</label>
      <button className="btn red full" onClick={save}>Salvar cupom</button>

      <div className="list">
        {data.coupons.map(coupon => (
          <div className="row" key={coupon.id}>
            <span>{coupon.code}</span>
            <button onClick={() => setForm(coupon)}><Pencil size={16} /></button>
            <button onClick={() => remove(coupon.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersAdmin({ data, load }) {
  const [tab, setTab] = useState("ativos");

  const cancelledStatuses = ["Cancelado", "Cancelado pelo cliente", "Pagamento recusado", "Estornado", "Chargeback"];
  const orders = tab === "cancelados"
    ? data.orders.filter(order => cancelledStatuses.includes(order.status))
    : data.orders.filter(order => !cancelledStatuses.includes(order.status));

  async function update(id, body) {
    await api(`/.netlify/functions/store-data?table=orders&id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    load();
  }

  return (
    <div className="box adminBox">
      <div className="adminOrdersHead">
        <h2>Pedidos</h2>
        <button className={tab === "ativos" ? "btn red" : "btn"} onClick={() => setTab("ativos")}>Ativos</button>
        <button className={tab === "cancelados" ? "btn red" : "btn"} onClick={() => setTab("cancelados")}>Cancelados</button>
      </div>

      {!orders.length && <p>Nenhum pedido nesta aba.</p>}

      {orders.map(order => (
        <div className="order" key={order.id}>
          <h3>{order.book_title}</h3>
          <p><b>Código:</b> {order.id}</p>
          <p><b>Cliente:</b> {order.buyer?.name}</p>
          <p><b>Email:</b> {order.buyer?.email}</p>
          <p><b>Valor:</b> {money(order.final_price)}</p>
          <p><b>Endereço:</b> {order.buyer?.street}, {order.buyer?.number} - {order.buyer?.city}/{order.buyer?.state}</p>
          {order.shipping && <p><b>Frete:</b> {order.shipping.service} - {money(order.shipping.price)} - {order.shipping.days}</p>}

          <select value={order.status || "Aguardando pagamento"} onChange={event => update(order.id, { status: event.target.value })}>
            <option>Aguardando pagamento</option>
            <option>Pago</option>
            <option>Separando pedido</option>
            <option>Enviado</option>
            <option>Entregue</option>
            <option>Cancelado pelo cliente</option>
            <option>Pagamento recusado</option>
            <option>Estornado</option>
            <option>Chargeback</option>
          </select>

          <input placeholder="Código de rastreio" defaultValue={order.tracking_code || ""} onBlur={event => update(order.id, { tracking_code: event.target.value })} />
        </div>
      ))}
    </div>
  );
}

function StatusPage() {
  return (
    <Section title="Status do pagamento">
      <p>Veja o status em Minhas compras.</p>
      <a className="btn red" href="#/minhas-compras">Ir para minhas compras</a>
    </Section>
  );
}

function App() {
  const route = useRoute();
  const { data, loading, load } = useData();
  const { customer, save: saveCustomer, logout: customerLogout } = useCustomer();
  const cart = useCart(customer);
  const [adminLogged, setAdminLogged] = useState(() => localStorage.getItem("mblab_admin") === "yes");

  function adminLogin(email, password) {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("mblab_admin", "yes");
      setAdminLogged(true);
      location.hash = "/admin";
    } else {
      alert("Login incorreto.");
    }
  }

  function adminLogout() {
    localStorage.removeItem("mblab_admin");
    setAdminLogged(false);
    location.hash = "/";
  }

  let page = <Home data={data} />;

  if (loading) page = <Section title="Carregando..." />;
  else if (route === "/loja") page = <Store data={data} />;
  else if (route === "/loja/fisicos") page = <Store data={data} category="fisicos" />;
  else if (route === "/loja/digitais") page = <Store data={data} category="digitais" />;
  else if (route === "/loja/promocoes") page = <Store data={data} category="promocoes" />;
  else if (route.startsWith("/livro/")) page = <BookPage data={data} cart={cart} />;
  else if (route === "/login") page = <Login data={data} customerSave={saveCustomer} adminLogin={adminLogin} />;
  else if (route === "/carrinho") page = <Cart data={data} cart={cart} customer={customer} />;
  else if (route === "/minhas-compras") page = <MyPurchases customer={customer} />;
  else if (route === "/admin") page = <Admin data={data} load={load} logged={adminLogged} login={adminLogin} logout={adminLogout} />;
  else if (route.startsWith("/pagamento/")) page = <StatusPage />;

  return (
    <>
      <Header adminLogged={adminLogged} customer={customer} customerLogout={customerLogout} cartCount={cart.cart.length} />
      {page}
      <footer><b>MBLab</b><span>Loja oficial de livros</span></footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
