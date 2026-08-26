import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  Menu,
  Pencil,
  Plus,
  Save,
  Share2,
  ShoppingCart,
  Star,
  Trash2,
  X
} from "lucide-react";
import "./style.css";

const ADMIN_EMAIL = "mateusbpugli@gmail.com";
const ADMIN_PASSWORD = "Mateus Buarque 1101";
const CUSTOMER_KEY = "mblab_customer";
const PAID_STATUSES = ["Aguardando envio", "Pago", "Separando pedido", "Enviado", "Entregue"];

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

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function getPricing(book) {
  const basePrice = Math.max(0, Number(book?.price || 0));
  const promotionalPrice = Math.max(0, Number(book?.promotional_price || 0));
  const legacyOldPrice = Math.max(0, Number(book?.old_price || 0));
  const now = Date.now();
  const startsAt = book?.promotion_start ? new Date(book.promotion_start).getTime() : null;
  const endsAt = book?.promotion_end ? new Date(book.promotion_end).getTime() : null;
  const validDates = (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);
  const scheduledPromotion = promotionalPrice > 0 && promotionalPrice < basePrice && validDates;

  if (scheduledPromotion) {
    const percent = Math.round(((basePrice - promotionalPrice) / basePrice) * 100);
    return {
      current: promotionalPrice,
      normal: basePrice,
      savings: basePrice - promotionalPrice,
      percent,
      active: true,
      scheduled: true
    };
  }

  if (legacyOldPrice > basePrice && basePrice > 0) {
    const percent = Math.round(((legacyOldPrice - basePrice) / legacyOldPrice) * 100);
    return {
      current: basePrice,
      normal: legacyOldPrice,
      savings: legacyOldPrice - basePrice,
      percent,
      active: true,
      scheduled: false
    };
  }

  return { current: basePrice, normal: basePrice, savings: 0, percent: 0, active: false, scheduled: false };
}

function getBookImages(book) {
  let images = book?.images;
  if (typeof images === "string") {
    try { images = JSON.parse(images); } catch { images = []; }
  }
  if (!Array.isArray(images)) images = [];
  const clean = images.filter(Boolean).map(String).slice(0, 10);
  if (book?.cover && !clean.includes(book.cover)) clean.unshift(book.cover);
  return [...new Set(clean)].slice(0, 10).length ? [...new Set(clean)].slice(0, 10) : ["/logo.jpeg"];
}

function getStock(book) {
  return Math.max(0, Number(book?.stock || 0));
}

function isPreorder(book) {
  return Boolean(book?.is_preorder);
}

function preorderDateLabel(book) {
  const value = book?.preorder_shipping_date;
  if (!value) return "data a confirmar";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "data a confirmar";
  return date.toLocaleDateString("pt-BR");
}

function getPurchaseLimit(book) {
  const stock = getStock(book);
  if (isPreorder(book) && stock <= 0) return 99;
  return stock;
}

function stockLabel(book) {
  if (isPreorder(book)) {
    return {
      text: book?.preorder_shipping_date
        ? `Pré-venda • lançamento previsto ${preorderDateLabel(book)}`
        : "Disponível para pré-venda",
      className: "preorder"
    };
  }
  const stock = getStock(book);
  if (stock <= 0) return { text: "Esgotado", className: "out" };
  if (stock <= 5) return { text: `Restam apenas ${stock} ${stock === 1 ? "unidade" : "unidades"}`, className: "low" };
  return { text: "Em estoque", className: "available" };
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

  let price = 24;
  let min = 6;
  let max = 10;

  if (uf === "SP") { price = 14; min = 2; max = 5; }
  else if (sudeste.includes(uf)) { price = 19; min = 4; max = 8; }
  else if (sul.includes(uf)) { price = 23; min = 5; max = 9; }
  else if (centro.includes(uf)) { price = 28; min = 6; max = 11; }
  else if (nordeste.includes(uf)) { price = 34; min = 8; max = 14; }
  else if (norte.includes(uf)) { price = 42; min = 10; max = 18; }

  if (Number(total || 0) >= 120) price = 0;

  return {
    price,
    min,
    max,
    uf: uf || "BR",
    service: "Simulação de frete",
    days: `${min} a ${max} dias úteis após o envio`
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.details || data.error || "Erro inesperado.");
  return data;
}

function bookToDb(book) {
  const images = Array.isArray(book.images) ? book.images.filter(Boolean).slice(0, 10) : [];
  const promotionalPrice = Number(book.promotionalPrice || 0);
  return {
    id: book.id || slug(book.title),
    title: String(book.title || "").trim(),
    description: String(book.description || "").trim(),
    long_description: String(book.longDescription || "").trim(),
    author: String(book.author || "").trim(),
    isbn: String(book.isbn || "").trim() || null,
    page_count: book.pageCount === "" ? null : Math.max(0, Number(book.pageCount || 0)),
    price: Math.max(0, Number(book.price || 0)),
    promotional_price: promotionalPrice > 0 ? promotionalPrice : null,
    promotion_start: toIsoDate(book.promotionStart),
    promotion_end: toIsoDate(book.promotionEnd),
    old_price: promotionalPrice > 0 ? 0 : Math.max(0, Number(book.oldPrice || 0)),
    type: book.type || "Físico",
    stock: Math.max(0, Number(book.stock || 0)),
    is_preorder: Boolean(book.isPreorder),
    preorder_shipping_date: book.isPreorder && book.preorderShippingDate ? String(book.preorderShippingDate).slice(0, 10) : null,
    cover: images[0] || book.cover || "/logo.jpeg",
    images,
    active: Boolean(book.active)
  };
}

function orderContainsBook(order, book) {
  if (Array.isArray(order?.items) && order.items.some(item => item.book_id === book.id)) return true;
  return normalizeText(order?.book_title).includes(normalizeText(book?.title));
}

function orderIsPaid(order) {
  return order?.payment_status === "approved" || PAID_STATUSES.includes(order?.status);
}

function ratingSummary(reviews) {
  if (!reviews.length) return { average: 0, count: 0 };
  const average = reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
  return { average, count: reviews.length };
}

function useRoute() {
  const [route, setRoute] = useState(location.hash.replace("#", "") || "/");
  useEffect(() => {
    const onHash = () => {
      setRoute(location.hash.replace("#", "") || "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

function useNotifications() {
  const [items, setItems] = useState([]);

  function notify(message, type = "success") {
    const id = `${Date.now()}-${Math.random()}`;
    setItems(current => [...current, { id, message, type }]);
    setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 3600);
  }

  function remove(id) {
    setItems(current => current.filter(item => item.id !== id));
  }

  return { items, notify, remove };
}

function Notifications({ items, remove }) {
  return (
    <div className="toastStack" aria-live="polite">
      {items.map(item => (
        <div className={`toast ${item.type}`} key={item.id}>
          {item.type === "error" ? <AlertCircle /> : <CheckCircle2 />}
          <span>{item.message}</span>
          <button onClick={() => remove(item.id)} aria-label="Fechar"><X size={17} /></button>
        </div>
      ))}
    </div>
  );
}

function useData(notify) {
  const [data, setData] = useState({ books: [], coupons: [], orders: [], customers: [], reviews: [] });
  const [loading, setLoading] = useState(true);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const response = await api("/.netlify/functions/store-data");
      setData({
        books: response.books || [],
        coupons: response.coupons || [],
        orders: response.orders || [],
        customers: response.customers || [],
        reviews: response.reviews || []
      });
    } catch (error) {
      notify(`Erro ao carregar dados: ${error.message}`, "error");
    } finally {
      if (!silent) setLoading(false);
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

function useCart(customer, books, notify) {
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

  function add(book, { goToCart = false } = {}) {
    if (!customer) {
      location.hash = "/login";
      return false;
    }
    const limit = getPurchaseLimit(book);
    if (limit <= 0) {
      notify("Este produto está esgotado.", "error");
      return false;
    }
    const existing = cart.find(item => item.bookId === book.id);
    const nextQty = Math.min((existing?.qty || 0) + 1, limit);
    persist(existing
      ? cart.map(item => item.bookId === book.id ? { ...item, qty: nextQty } : item)
      : [{ bookId: book.id, qty: 1 }, ...cart]);
    notify(isPreorder(book) ? "Livro adicionado à pré-venda." : "Livro adicionado ao carrinho.");
    if (goToCart) location.hash = "/carrinho";
    return true;
  }

  function updateQty(bookId, qty) {
    const book = books.find(item => item.id === bookId);
    if (!book) return;
    const safeQty = Math.max(1, Math.min(Number(qty || 1), getPurchaseLimit(book)));
    persist(cart.map(item => item.bookId === bookId ? { ...item, qty: safeQty } : item));
  }

  function remove(bookId) {
    persist(cart.filter(item => item.bookId !== bookId));
    notify("Item removido do carrinho.");
  }

  function clear() {
    persist([]);
  }

  return { cart, add, updateQty, remove, clear };
}

function useWishlist(customer, notify) {
  const key = `mblab_wishlist_${customer?.email || "anon"}`;
  const [ids, setIds] = useState([]);

  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(key) || "[]")); }
    catch { setIds([]); }
  }, [key]);

  function toggle(bookId) {
    const exists = ids.includes(bookId);
    const next = exists ? ids.filter(id => id !== bookId) : [...ids, bookId];
    setIds(next);
    localStorage.setItem(key, JSON.stringify(next));
    notify(exists ? "Removido dos favoritos." : "Adicionado aos favoritos.");
  }

  return { ids, toggle, has: bookId => ids.includes(bookId) };
}

function Header({ customer, customerLogout, cartCount, favoriteCount }) {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <header>
        <button onClick={() => setOpen(!open)} aria-label="Menu"><Menu /></button>
        <a className="brand" href="#/" onClick={closeMenu}><img src="/logo.jpeg" alt="MBLab" />MBLab</a>
        <nav className={open ? "open" : ""}>
          <a href="#/" onClick={closeMenu}>Início</a>
          <a href="#/loja" onClick={closeMenu}>Livros</a>
          <a href="#/favoritos" onClick={closeMenu}>Favoritos ({favoriteCount})</a>
          <a href="#/carrinho" onClick={closeMenu}>Carrinho ({cartCount})</a>
          <a href="#/minhas-compras" onClick={closeMenu}>Minhas compras</a>
          {customer ? <button onClick={() => { customerLogout(); closeMenu(); }}>Sair cliente</button> : <a href="#/login" onClick={closeMenu}>Entrar</a>}
        </nav>
      </header>

      <div className="cat">
        <a href="#/loja">Todos</a>
        <a href="#/loja/fisicos">Livros</a>
        <a href="#/loja/promocoes">Promoções</a>
      </div>

      <div className="mobileBottomNav">
        <a href="#/">Início</a>
        <a href="#/loja">Livros</a>
        <a href="#/favoritos">Favoritos</a>
        <a href="#/carrinho">Carrinho{cartCount ? ` (${cartCount})` : ""}</a>
        <a href="#/minhas-compras">Compras</a>
      </div>
    </>
  );
}

function PriceBlock({ book, compact = false }) {
  const price = getPricing(book);
  return (
    <div className={compact ? "priceBlock compact" : "priceBlock"}>
      {price.active && (
        <div className="pricePromoLine">
          <span className="discountBadge">-{price.percent}%</span>
          <del>{money(price.normal)}</del>
        </div>
      )}
      <strong>{money(price.current)}</strong>
      {price.active && <small>Economize {money(price.savings)}</small>}
    </div>
  );
}

function Stars({ value, onChange, size = 18 }) {
  return (
    <div className={onChange ? "stars interactive" : "stars"} aria-label={`${Number(value || 0).toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(star => {
        const active = Number(value || 0) >= star - 0.25;
        return onChange ? (
          <button type="button" key={star} onClick={() => onChange(star)} aria-label={`${star} estrelas`}>
            <Star size={size} fill={active ? "currentColor" : "none"} />
          </button>
        ) : <Star key={star} size={size} fill={active ? "currentColor" : "none"} />;
      })}
    </div>
  );
}

function RatingInline({ reviews }) {
  const summary = ratingSummary(reviews);
  if (!summary.count) return <span className="ratingEmpty">Ainda sem avaliações</span>;
  return (
    <span className="ratingInline">
      <Stars value={summary.average} size={15} />
      <b>{summary.average.toFixed(1)}</b>
      <span>({summary.count})</span>
    </span>
  );
}

function Home({ data, wishlist }) {
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
        <Section title="Livros em destaque">
          <Grid books={books} reviews={data.reviews} wishlist={wishlist} />
        </Section>
      </div>

      <main className="mobileOnlyHome">
        <section className="mHero">
          <img src="/logo.jpeg" alt="MBLab" />
          <p>Loja oficial MBLab</p>
          <h1>Livros sem mimimi.</h1>
          <a className="btn red" href="#/loja">Comprar agora</a>
        </section>

        <div className="mSearch" onClick={() => { location.hash = "/loja"; }}>Pesquisar livros</div>

        <div className="mChips">
          <a href="#/loja">Todos</a>
          <a href="#/loja/fisicos">Físicos</a>
          <a href="#/loja/promocoes">Promoções</a>
        </div>

        {first && (
          <section className="mFeature">
            <span>Destaque</span>
            <img src={getBookImages(first)[0]} alt={first.title} />
            <h2>{first.title}</h2>
            <PriceBlock book={first} compact />
            <a className="btn red" href={`#/livro/${first.id}`}>Ver livro</a>
          </section>
        )}

        <section className="mShelf">
          <h2>Livros disponíveis</h2>
          <div>
            {books.slice(0, 8).map(book => (
              <a className="mBook" href={`#/livro/${book.id}`} key={book.id}>
                <img src={getBookImages(book)[0]} alt={book.title} />
                <strong>{book.title}</strong>
                <PriceBlock book={book} compact />
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Section({ title, children, className = "" }) {
  return <section className={`section ${className}`}><h1>{title}</h1>{children}</section>;
}

function Grid({ books, reviews = [], wishlist }) {
  if (!books.length) return <div className="empty">Nenhum livro encontrado.</div>;
  return (
    <div className="grid">
      {books.map(book => (
        <BookCard
          key={book.id}
          book={book}
          reviews={reviews.filter(review => review.book_id === book.id)}
          wishlist={wishlist}
        />
      ))}
    </div>
  );
}

function BookCard({ book, reviews, wishlist }) {
  const stock = stockLabel(book);
  return (
    <article className="prod">
      <div className="productImageWrap">
        <a href={`#/livro/${book.id}`}><img src={getBookImages(book)[0]} alt={book.title} /></a>
        {getPricing(book).active && <span className="cardDiscount">-{getPricing(book).percent}%</span>}
        {isPreorder(book) && <span className="preorderBadge">PRÉ-VENDA</span>}
        {wishlist && (
          <button className={wishlist.has(book.id) ? "wishButton active" : "wishButton"} onClick={() => wishlist.toggle(book.id)} aria-label="Favoritar">
            <Heart fill={wishlist.has(book.id) ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="prodBody">
        <h2>{book.title}</h2>
        <p>{book.description}</p>
        <RatingInline reviews={reviews} />
        <PriceBlock book={book} compact />
        <p className={`stock ${stock.className}`}>{stock.text}</p>
        <a className="btn" href={`#/livro/${book.id}`}>Ver detalhes</a>
      </div>
    </article>
  );
}

function Store({ data, wishlist, category = "todos" }) {
  const [search, setSearch] = useState("");
  let books = data.books.filter(book => book.active);

  if (category === "fisicos") books = books.filter(book => normalizeText(book.type).includes("fisico"));
  if (category === "promocoes") books = books.filter(book => getPricing(book).active);
  if (search.trim()) {
    const term = normalizeText(search);
    books = books.filter(book => [book.title, book.author, book.description].some(value => normalizeText(value).includes(term)));
  }

  const title = category === "todos" ? "Todos os livros" : category === "fisicos" ? "Livros" : "Promoções";

  return (
    <Section title={title}>
      <div className="storeToolbar">
        <input placeholder="Buscar por título ou autor" value={search} onChange={event => setSearch(event.target.value)} />
        <span>{books.length} {books.length === 1 ? "livro" : "livros"}</span>
      </div>
      <Grid books={books} reviews={data.reviews} wishlist={wishlist} />
    </Section>
  );
}

function Gallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);

  useEffect(() => { setIndex(0); }, [images.join("|")]);

  function previous() {
    setIndex(current => (current - 1 + images.length) % images.length);
  }

  function next() {
    setIndex(current => (current + 1) % images.length);
  }

  function onTouchEnd(event) {
    if (touchStart.current === null) return;
    const end = event.changedTouches?.[0]?.clientX || 0;
    const distance = touchStart.current - end;
    if (Math.abs(distance) > 45) distance > 0 ? next() : previous();
    touchStart.current = null;
  }

  return (
    <div className="gallery">
      <div
        className="mainImage"
        onTouchStart={event => { touchStart.current = event.touches?.[0]?.clientX || 0; }}
        onTouchEnd={onTouchEnd}
      >
        <img src={images[index]} alt={`${title} - imagem ${index + 1}`} />
        {images.length > 1 && (
          <>
            <button className="galleryArrow left" onClick={previous} aria-label="Imagem anterior"><ChevronLeft /></button>
            <button className="galleryArrow right" onClick={next} aria-label="Próxima imagem"><ChevronRight /></button>
            <span className="galleryCounter">{index + 1}/{images.length}</span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="thumbnails">
          {images.map((image, imageIndex) => (
            <button className={imageIndex === index ? "active" : ""} onClick={() => setIndex(imageIndex)} key={`${image}-${imageIndex}`}>
              <img src={image} alt={`Miniatura ${imageIndex + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BookPage({ data, cart, customer, wishlist, notify, load }) {
  const bookId = location.hash.split("/")[2];
  const book = data.books.find(item => item.id === bookId);
  const [shippingCep, setShippingCep] = useState(customer?.cep || "");
  const [shippingResult, setShippingResult] = useState(null);
  const reviews = data.reviews.filter(review => review.book_id === bookId);
  const existingReview = reviews.find(review => review.customer_email === customer?.email?.toLowerCase());
  const [reviewForm, setReviewForm] = useState({ rating: existingReview?.rating || 5, comment: existingReview?.comment || "" });
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    setReviewForm({ rating: existingReview?.rating || 5, comment: existingReview?.comment || "" });
  }, [existingReview?.id, customer?.email]);

  if (!book) return <Section title="Livro não encontrado" />;

  const images = getBookImages(book);
  const stock = stockLabel(book);
  const summary = ratingSummary(reviews);
  const hasPurchased = Boolean(customer && data.orders.some(order =>
    String(order?.buyer?.email || "").toLowerCase() === String(customer.email || "").toLowerCase()
    && orderIsPaid(order)
    && orderContainsBook(order, book)
  ));
  const digital = normalizeText(book.type).includes("digital");

  function calculateBookShipping() {
    if (digital) {
      setShippingResult([{ id: "DIGITAL", name: "Entrega digital", price: 0, days: "Acesso liberado após a confirmação do pagamento" }]);
      return;
    }

    const local = calculateShipping(shippingCep, customer?.state, getPricing(book).current);
    if (!local) {
      notify("Digite um CEP válido com 8 números.", "error");
      return;
    }

    const basePrice = Number(local.price || 18);
    const baseDays = Number(local.max || 8);
    const simpleLetterPrice = Number(Math.max(6.5, basePrice * 0.48).toFixed(2));

    setShippingResult([
      {
        id: "SEDEX-FIXO",
        name: "SEDEX",
        price: Number((basePrice + 9.9).toFixed(2)),
        days: `${Math.max(2, Math.ceil(baseDays / 2))} dias úteis após o envio`
      },
      {
        id: "CARTA-SIMPLES",
        name: "Carta Simples",
        price: simpleLetterPrice,
        days: `${Math.max(5, baseDays + 2)} dias úteis após o envio`
      },
      {
        id: "CARTA-REGISTRADA",
        name: "Carta Registrada",
        price: Number((simpleLetterPrice + 7.5).toFixed(2)),
        days: `${Math.max(4, baseDays + 1)} dias úteis após o envio`
      }
    ]);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      notify("Link copiado.");
    } catch {
      notify("Não foi possível copiar o link.", "error");
    }
  }

  async function nativeShare() {
    const shareData = { title: book.title, text: `Confira o livro ${book.title} na MBLab`, url: location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      copyLink();
    }
  }

  async function saveReview(event) {
    event.preventDefault();
    if (!customer) {
      location.hash = "/login";
      return;
    }
    if (!hasPurchased) {
      notify("Apenas clientes que compraram este livro podem avaliar.", "error");
      return;
    }
    if (!reviewForm.comment.trim()) {
      notify("Escreva um comentário para publicar a avaliação.", "error");
      return;
    }

    setSavingReview(true);
    try {
      await api("/.netlify/functions/store-data?action=save-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          customerEmail: customer.email,
          customerPassword: customer.password,
          customerName: customer.name,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment.trim()
        })
      });
      notify(existingReview ? "Avaliação atualizada." : "Avaliação publicada.");
      await load({ silent: true });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <main className="productPage">
      <section className="productTop">
        <Gallery images={images} title={book.title} />

        <div className="productInfo">
          <p className="productAuthor">por {book.author || "MBLab"}</p>
          <h1>{book.title}</h1>
          <RatingInline reviews={reviews} />
          <p className="shortDescription">{book.description}</p>
          <PriceBlock book={book} />
          <p className={`stock large ${stock.className}`}>{stock.text}</p>

          {isPreorder(book) && (
            <div className="preorderNotice">
              <strong>Comprar na pré-venda</strong>
              <span>O pagamento é feito agora e o lançamento está previsto para {preorderDateLabel(book)}.</span>
            </div>
          )}

          <div className="deliveryBox">
            <h3>Prazo de entrega</h3>
            <div className="deliveryForm">
              <input placeholder="Digite seu CEP" inputMode="numeric" value={shippingCep} onChange={event => setShippingCep(event.target.value)} />
              <button className="btn" onClick={calculateBookShipping}>Calcular</button>
            </div>
            {Array.isArray(shippingResult) && shippingResult.length > 0 && (
              <div className="deliveryResults">
                {shippingResult.map(option => (
                  <div className="deliveryResult" key={option.id}>
                    <strong>{option.name}</strong>
                    <b>{Number(option.price) === 0 ? "Grátis" : money(option.price)}</b>
                    <span>{option.days}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {getPurchaseLimit(book) > 0 ? (
            <div className="purchaseButtons">
              <button className="btn red buyNow" onClick={() => cart.add(book, { goToCart: true })}>
                {isPreorder(book) ? "Comprar na pré-venda" : "Comprar agora"}
              </button>
              <button className="btn addCart" onClick={() => cart.add(book)}><ShoppingCart /> {isPreorder(book) ? "Adicionar pré-venda ao carrinho" : "Adicionar ao carrinho"}</button>
            </div>
          ) : <div className="unavailable">Produto indisponível</div>}

          <div className="secondaryActions">
            <button className={wishlist.has(book.id) ? "active" : ""} onClick={() => wishlist.toggle(book.id)}>
              <Heart fill={wishlist.has(book.id) ? "currentColor" : "none"} />
              {wishlist.has(book.id) ? "Salvo nos favoritos" : "Adicionar aos favoritos"}
            </button>
            <button onClick={nativeShare}><Share2 /> Compartilhar</button>
          </div>

          <div className="shareLinks">
            <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Confira ${book.title}: ${location.href}`)}`}>WhatsApp</a>
            <button onClick={nativeShare}>Instagram</button>
            <button onClick={copyLink}><Copy size={16} /> Copiar link</button>
          </div>
        </div>
      </section>

      <section className="productContent">
        <article className="descriptionPanel">
          <h2>Descrição completa</h2>
          <p>{book.long_description || book.description || "Informações em breve."}</p>
        </article>

        <aside className="specPanel">
          <h2>Informações do produto</h2>
          <dl>
            <div><dt>Autor</dt><dd>{book.author || "Não informado"}</dd></div>
            <div><dt>Formato</dt><dd>{book.type || "Não informado"}</dd></div>
            {book.isbn && <div><dt>ISBN</dt><dd>{book.isbn}</dd></div>}
            {Number(book.page_count || 0) > 0 && <div><dt>Número de páginas</dt><dd>{book.page_count}</dd></div>}
          </dl>
        </aside>
      </section>

      <section className="reviewsSection">
        <div className="reviewsHeader">
          <div>
            <h2>Avaliações dos clientes</h2>
            <p>{summary.count ? `${summary.count} ${summary.count === 1 ? "avaliação" : "avaliações"}` : "Ainda não há avaliações"}</p>
          </div>
          <div className="reviewScore">
            <strong>{summary.count ? summary.average.toFixed(1) : "—"}</strong>
            <Stars value={summary.average} size={22} />
          </div>
        </div>

        {customer && hasPurchased && (
          <form className="reviewForm" onSubmit={saveReview}>
            <h3>{existingReview ? "Editar sua avaliação" : "Avaliar este livro"}</h3>
            <Stars value={reviewForm.rating} onChange={rating => setReviewForm({ ...reviewForm, rating })} size={28} />
            <textarea rows="5" placeholder="Conte o que achou do livro" value={reviewForm.comment} onChange={event => setReviewForm({ ...reviewForm, comment: event.target.value })} />
            <button className="btn red" disabled={savingReview}>{savingReview ? "Salvando..." : existingReview ? "Atualizar avaliação" : "Publicar avaliação"}</button>
          </form>
        )}

        {!customer && <p className="reviewNotice"><a href="#/login">Entre na sua conta</a> para avaliar uma compra.</p>}
        {customer && !hasPurchased && <p className="reviewNotice">A avaliação é liberada depois que a compra deste livro for confirmada.</p>}

        <div className="reviewList">
          {reviews.map(review => (
            <article className="reviewCard" key={review.id}>
              <div>
                <strong>{review.customer_name || "Cliente MBLab"}</strong>
                <Stars value={review.rating} />
              </div>
              <p>{review.comment}</p>
              <small>{new Date(review.updated_at || review.created_at).toLocaleDateString("pt-BR")}</small>
            </article>
          ))}
          {!reviews.length && <div className="empty small">Seja o primeiro comprador a avaliar este livro.</div>}
        </div>
      </section>
    </main>
  );
}

function Login({ data, customerSave, adminLogin, notify }) {
  const [mode, setMode] = useState("login");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", cpf: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: ""
  });

  async function submit(event) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) return notify("Preencha e-mail e senha.", "error");

    if (mode === "login") {
      if (email === ADMIN_EMAIL.toLowerCase() && form.password === ADMIN_PASSWORD) {
        adminLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
        return;
      }

      const user = (data.customers || []).find(customer => customer.email === email && customer.password === form.password);
      if (!user) return notify("Login incorreto ou cadastro não encontrado.", "error");
      customerSave(user);
      notify("Login realizado com sucesso.");
      location.hash = "/loja";
      return;
    }

    if (!form.name.trim()) return notify("Preencha seu nome.", "error");
    if ((data.customers || []).some(customer => customer.email === email)) return notify("Este e-mail já está cadastrado.", "error");

    try {
      const customer = { ...form, id: email, email };
      await api("/.netlify/functions/store-data?table=customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer)
      });
      customerSave(customer);
      notify("Cadastro criado com sucesso.");
      location.hash = "/loja";
    } catch (error) {
      notify(error.message, "error");
    }
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
            <input placeholder="CPF obrigatório" value={form.cpf} onChange={event => setForm({ ...form, cpf: event.target.value })} />
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


function calculateCouponDiscount(items, coupon) {
  if (!coupon) return { valid: false, discount: 0, message: "" };

  const allowedProductIds = Array.isArray(coupon.product_ids) ? coupon.product_ids.map(String) : [];
  const eligibleItems = allowedProductIds.length
    ? items.filter(item => allowedProductIds.includes(String(item.book.id)))
    : items;
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + getPricing(item.book).current * item.qty, 0);
  const totalQuantity = eligibleItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  if (!eligibleItems.length) {
    return { valid: false, discount: 0, message: "Este cupom não é válido para os produtos do carrinho." };
  }

  if (coupon.type === "buy_pay") {
    const buyQuantity = Math.max(2, Number(coupon.buy_quantity || 2));
    const payQuantity = Math.max(1, Math.min(buyQuantity - 1, Number(coupon.pay_quantity || 1)));

    if (totalQuantity < buyQuantity) {
      return {
        valid: false,
        discount: 0,
        message: `Este cupom exige pelo menos ${buyQuantity} livros no carrinho.`
      };
    }

    const freePerGroup = buyQuantity - payQuantity;
    const completeGroups = Math.floor(totalQuantity / buyQuantity);
    const freeQuantity = completeGroups * freePerGroup;
    const unitPrices = eligibleItems
      .flatMap(item => Array.from({ length: Number(item.qty || 0) }, () => getPricing(item.book).current))
      .sort((a, b) => a - b);
    const discount = unitPrices.slice(0, freeQuantity).reduce((sum, price) => sum + price, 0);

    return {
      valid: true,
      discount: Number(discount.toFixed(2)),
      message: `${freeQuantity} ${freeQuantity === 1 ? "livro grátis" : "livros grátis"}`
    };
  }

  if (coupon.type === "percent") {
    return { valid: true, discount: Number((eligibleSubtotal * Number(coupon.value || 0) / 100).toFixed(2)), message: "" };
  }

  return { valid: true, discount: Math.min(eligibleSubtotal, Number(coupon.value || 0)), message: "" };
}

function Cart({ data, cart, customer, notify }) {
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);
  const [shippingCep, setShippingCep] = useState(customer?.cep || "");
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const items = cart.cart.map(item => ({
    book: data.books.find(book => book.id === item.bookId),
    qty: item.qty
  })).filter(item => item.book);

  const foundCoupon = data.coupons.find(couponItem => couponItem.active && couponItem.code?.toLowerCase() === coupon.toLowerCase());
  const couponResult = calculateCouponDiscount(items, foundCoupon);
  const activeCoupon = foundCoupon && couponResult.valid ? foundCoupon : null;
  const onlyDigital = items.length > 0 && items.every(item => normalizeText(item.book.type).includes("digital"));

  const subtotal = items.reduce((sum, item) => sum + getPricing(item.book).current * item.qty, 0);
  const productsTotal = Math.max(0.01, Number((subtotal - couponResult.discount).toFixed(2)));

  const shippingValue = onlyDigital ? 0 : selectedShipping ? Number(selectedShipping.price || 0) : 0;
  const total = Number((productsTotal + shippingValue).toFixed(2));

  useEffect(() => {
    if (onlyDigital) {
      setSelectedShipping({ id: "DIGITAL", name: "Entrega digital", company: "MBLab", price: 0, delivery_time: 0, service_id: "DIGITAL" });
      setShippingOptions([]);
    }
  }, [onlyDigital]);

  function calculateRealShipping() {
    const cep = String(shippingCep || "").replace(/\D/g, "");
    if (cep.length !== 8) return notify("Preencha o CEP com 8 números.", "error");
    if (!items.length) return notify("Carrinho vazio.", "error");

    setShippingLoading(true);
    setSelectedShipping(null);
    setShippingOptions([]);

    try {
      const local = calculateShipping(cep, customer?.state, productsTotal);
      const basePrice = Number(local?.price || 18);
      const baseDays = Number(local?.max || 8);
      const sedexPrice = Number((basePrice + 9.9).toFixed(2));
      const sedexDays = Math.max(2, Math.ceil(baseDays / 2));
      const simpleLetterPrice = Number(Math.max(6.5, basePrice * 0.48).toFixed(2));
      const simpleLetterDays = Math.max(5, baseDays + 2);
      const registeredLetterPrice = Number((simpleLetterPrice + 7.5).toFixed(2));
      const registeredLetterDays = Math.max(4, baseDays + 1);

      const services = [
        { id: "SEDEX-FIXO", name: "SEDEX", company: "Correios", price: sedexPrice, delivery_time: sedexDays, custom_delivery_time: sedexDays, service_id: "SEDEX-FIXO" },
        { id: "CARTA-SIMPLES", name: "Carta Simples", company: "Correios", price: simpleLetterPrice, delivery_time: simpleLetterDays, custom_delivery_time: simpleLetterDays, service_id: "CARTA-SIMPLES" },
        { id: "CARTA-REGISTRADA", name: "Carta Registrada", company: "Correios", price: registeredLetterPrice, delivery_time: registeredLetterDays, custom_delivery_time: registeredLetterDays, service_id: "CARTA-REGISTRADA" }
      ];

      setShippingOptions(services);
      setSelectedShipping(services[0]);
    } finally {
      setShippingLoading(false);
    }
  }

  async function pay() {
    if (!customer) {
      location.hash = "/login";
      return;
    }
    if (!items.length) return notify("Carrinho vazio.", "error");
    if (!selectedShipping) return notify("Calcule e selecione o frete antes de pagar.", "error");

    const unavailable = items.find(item => getPurchaseLimit(item.book) < item.qty);
    if (unavailable) return notify(`Estoque insuficiente para ${unavailable.book.title}.`, "error");

    setLoading(true);
    try {
      const title = items.map(item => item.book.title).join(", ");
      const buyer = { ...customer, cep: shippingCep || customer.cep };
      const orderNumberResponse = await api("/.netlify/functions/store-data?action=next-order-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });

      const order = {
        id: orderNumberResponse.orderId,
        status: "Aguardando pagamento",
        tracking_code: "",
        book_title: title,
        final_price: total,
        coupon: activeCoupon?.code || "",
        buyer,
        shipping: selectedShipping,
        items: items.map(item => ({
          book_id: item.book.id,
          title: item.book.title,
          qty: item.qty,
          unit_price: getPricing(item.book).current,
          type: item.book.type,
          is_preorder: isPreorder(item.book),
          preorder_shipping_date: item.book.preorder_shipping_date || null
        })),
        stock_deducted: false,
        melhor_envio_service_id: String(selectedShipping.service_id || selectedShipping.id)
      };

      await api("/.netlify/functions/store-data?table=orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      const response = await api("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${title} - ${order.id} (produto + frete)`, price: total, email: customer.email, orderId: order.id })
      });

      cart.clear();
      location.href = response.init_point || response.sandbox_init_point;
    } catch (error) {
      notify(`Erro: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Carrinho" className="cartSection">
      {!items.length && (
        <div className="empty cartEmpty">
          <ShoppingCart size={42} />
          <h2>Seu carrinho está vazio</h2>
          <a className="btn red" href="#/loja">Continuar comprando</a>
        </div>
      )}

      <div className="cartLayout">
        <div>
          {items.map(item => {
            const pricing = getPricing(item.book);
            const maxStock = getPurchaseLimit(item.book);
            return (
              <div className="cart" key={item.book.id}>
                <a href={`#/livro/${item.book.id}`}><img src={getBookImages(item.book)[0]} alt={item.book.title} /></a>
                <div className="cartInfo">
                  <h3>{item.book.title}</h3>
                  {isPreorder(item.book) && <span className="cartPreorder">Pré-venda • lançamento previsto {preorderDateLabel(item.book)}</span>}
                  <p>{money(pricing.current)}</p>
                  <span className={`stock ${stockLabel(item.book).className}`}>{stockLabel(item.book).text}</span>
                  <div className="quantity">
                    <button onClick={() => cart.updateQty(item.book.id, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => cart.updateQty(item.book.id, item.qty + 1)} disabled={item.qty >= maxStock}>+</button>
                  </div>
                </div>
                <div className="cartItemActions">
                  <b>{money(pricing.current * item.qty)}</b>
                  <button onClick={() => cart.remove(item.book.id)}>Remover</button>
                </div>
              </div>
            );
          })}
          {!!items.length && <a className="continueShopping" href="#/loja"><ChevronLeft size={18} /> Continuar comprando</a>}
        </div>

        {!!items.length && (
          <div className="box checkout">
            <h2>Resumo do pedido</h2>
            <label>Cupom</label>
            <input placeholder="Digite o cupom" value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} />
            {coupon && (
              <small className={activeCoupon ? "couponOk" : "couponInvalid"}>
                {activeCoupon
                  ? `Cupom ${activeCoupon.code} aplicado${couponResult.message ? ` • ${couponResult.message}` : ""}`
                  : foundCoupon
                    ? couponResult.message
                    : "Cupom não encontrado"}
              </small>
            )}

            <button
type="button"
className="btn full"
onClick={() => {
setSelectedShipping({
id: "RETIRADA",
name: "Retirada",
company: "MBLab",
price: 0,
delivery_time: 0,
service_id: "RETIRADA"
});
setShippingOptions([]);
}}
>
<label>
  Retirada
  <br />
  <small> Retire pessoalmente no show </small> </label>
</button>

            {!onlyDigital && (
              <>
                <h3>Frete e prazo de entrega</h3>
                <input placeholder="CEP de entrega" value={shippingCep} onChange={event => { setShippingCep(event.target.value); setShippingOptions([]); setSelectedShipping(null); }} />
                <button type="button" className="btn full" onClick={calculateRealShipping} disabled={shippingLoading}>
                  {shippingLoading ? "Calculando..." : "Calcular frete"}
                </button>
              </>
            )}

            {onlyDigital && <div className="digitalDelivery"><b>Entrega digital</b><span>Acesso após a confirmação do pagamento</span></div>}

            {!!shippingOptions.length && (
              <div className="shippingOptions">
                {shippingOptions.map(option => (
                  <label className={selectedShipping?.id === option.id ? "shippingOption active" : "shippingOption"} key={option.id}>
                    <input type="radio" name="shipping" checked={selectedShipping?.id === option.id} onChange={() => setSelectedShipping(option)} />
                    <strong>{option.company} - {option.name}</strong>
                    <span>{Number(option.price) === 0 ? "Grátis" : money(option.price)}</span>
                    <small>{option.custom_delivery_time || option.delivery_time} dias úteis após o envio</small>
                  </label>
                ))}
              </div>
            )}

            <div className="total"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            {activeCoupon && <div className="total discount"><span>Desconto do cupom</span><b>-{money(subtotal - productsTotal)}</b></div>}
            {selectedShipping && <div className="total"><span>Frete</span><b>{Number(selectedShipping.price) === 0 ? "Grátis" : money(selectedShipping.price)}</b></div>}
            <div className="total grand"><span>Total</span><b>{money(total)}</b></div>

            <button className="btn red full" onClick={pay} disabled={loading}>{loading ? "Abrindo Mercado Pago..." : "Comprar com Pix ou Cartão"}</button>
          </div>
        )}
      </div>
    </Section>
  );
}

function MyPurchases({ customer, notify }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!customer) {
      location.hash = "/login";
      return;
    }
    setLoading(true);
    try {
      const response = await api(`/.netlify/functions/store-data?table=orders&email=${encodeURIComponent(customer.email)}`);
      setOrders(response.orders || []);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [customer?.email]);

  return (
    <Section title="Minhas compras">
      <button className="btn" onClick={refresh} disabled={loading}>{loading ? "Atualizando..." : "Atualizar"}</button>
      {!orders.length && !loading && <div className="empty">Nenhuma compra encontrada.</div>}
      <div className="ordersList">
        {orders.map(order => (
          <div className="order" key={order.id}>
            <div className="orderTop"><h3>{order.book_title}</h3><span>{order.status}</span></div>
            <p><b>Código:</b> {order.id}</p>
            <p><b>Valor:</b> {money(order.final_price)}</p>
            <p><b>Rastreio:</b> {order.tracking_code || "Ainda não enviado"}</p>
            {order.shipping && <p><b>Frete:</b> {order.shipping.company || "Correios"} - {order.shipping.name} - {Number(order.shipping.price) === 0 ? "Grátis" : money(order.shipping.price)}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Favorites({ data, wishlist }) {
  const books = data.books.filter(book => book.active && wishlist.ids.includes(book.id));
  return (
    <Section title="Favoritos">
      <Grid books={books} reviews={data.reviews} wishlist={wishlist} />
      {!books.length && <a className="btn red favoritesCta" href="#/loja">Conhecer os livros</a>}
    </Section>
  );
}

function Admin({ data, load, logged, login, logout, notify }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [tab, setTab] = useState("livros");

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
    <Section title="Painel Admin" className="adminSection">
      <div className="adminHeader">
        <div className="adminTabs">
          <button className={tab === "livros" ? "active" : ""} onClick={() => setTab("livros")}>Livros</button>
          <button className={tab === "cupons" ? "active" : ""} onClick={() => setTab("cupons")}>Cupons</button>
          <button className={tab === "pedidos" ? "active" : ""} onClick={() => setTab("pedidos")}>Pedidos</button>
        </div>
        <button className="btn" onClick={logout}>Sair</button>
      </div>

      {tab === "livros" && <BooksAdmin data={data} load={load} notify={notify} />}
      {tab === "cupons" && <CouponsAdmin data={data} load={load} notify={notify} />}
      {tab === "pedidos" && <OrdersAdmin data={data} load={load} notify={notify} />}
    </Section>
  );
}

async function compressImage(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = dataUrl;
  });

  const maxSize = 1800;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function BooksAdmin({ data, load, notify }) {
  const empty = {
    id: "", title: "", description: "", longDescription: "", author: "", isbn: "", pageCount: "",
    price: 0, promotionalPrice: "", promotionStart: "", promotionEnd: "", oldPrice: 0,
    type: "Físico", stock: 0, isPreorder: false, preorderShippingDate: "", cover: "", images: [], active: true
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const formRef = useRef(null);

  const normalPreviewPrice = Number(form.price || 0);
  const promotionalPreviewPrice = Number(form.promotionalPrice || 0);
  const promotionPercent = normalPreviewPrice > 0 && promotionalPreviewPrice > 0 && promotionalPreviewPrice < normalPreviewPrice
    ? Math.round(((normalPreviewPrice - promotionalPreviewPrice) / normalPreviewPrice) * 100)
    : 0;

  async function upload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const available = 10 - form.images.length;
    if (available <= 0) return notify("O limite é de 10 imagens por livro.", "error");
    const selected = files.slice(0, available);
    if (files.length > available) notify(`Somente ${available} imagens foram selecionadas para completar o limite.`, "error");

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (let index = 0; index < selected.length; index += 1) {
        setUploadProgress(`Enviando imagem ${index + 1} de ${selected.length}...`);
        const dataUrl = await compressImage(selected[index]);
        const response = await api("/.netlify/functions/store-data?action=upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: selected[index].name, dataUrl })
        });
        uploadedUrls.push(response.url);
      }
      setForm(current => ({
        ...current,
        images: [...current.images, ...uploadedUrls].slice(0, 10),
        cover: current.cover || uploadedUrls[0] || ""
      }));
      notify(`${uploadedUrls.length} ${uploadedUrls.length === 1 ? "imagem enviada" : "imagens enviadas"}.`);
    } catch (error) {
      notify(`Erro no upload: ${error.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function removeImage(index) {
    setForm(current => {
      const images = current.images.filter((_, imageIndex) => imageIndex !== index);
      return { ...current, images, cover: images[0] || "" };
    });
  }

  function makeMain(index) {
    setForm(current => {
      const selected = current.images[index];
      const images = [selected, ...current.images.filter((_, imageIndex) => imageIndex !== index)];
      return { ...current, images, cover: selected };
    });
  }

  async function save() {
    if (!form.title.trim()) return notify("Título obrigatório.", "error");
    if (Number(form.price) <= 0) return notify("Informe um preço normal válido.", "error");
    if (Number(form.promotionalPrice || 0) > 0 && Number(form.promotionalPrice) >= Number(form.price)) {
      return notify("O preço promocional precisa ser menor que o preço normal.", "error");
    }
    if (form.promotionStart && form.promotionEnd && new Date(form.promotionEnd) <= new Date(form.promotionStart)) {
      return notify("A data final da promoção precisa ser posterior à data inicial.", "error");
    }
    if (form.isPreorder && !form.preorderShippingDate) {
      return notify("Informe a data prevista de lançamento do livro na pré-venda.", "error");
    }

    setSaving(true);
    try {
      await api("/.netlify/functions/store-data?table=books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookToDb(form))
      });
      notify(form.id ? "Livro atualizado." : "Livro cadastrado.");
      setForm(empty);
      await load({ silent: true });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Apagar este livro? Os pedidos antigos continuarão preservados.")) return;
    try {
      await api(`/.netlify/functions/store-data?table=books&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      notify("Livro apagado.");
      await load({ silent: true });
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function edit(book) {
    const images = getBookImages(book).filter(image => image !== "/logo.jpeg" || book.cover === "/logo.jpeg");
    setForm({
      id: book.id,
      title: book.title || "",
      description: book.description || "",
      longDescription: book.long_description || "",
      author: book.author || "",
      isbn: book.isbn || "",
      pageCount: book.page_count ?? "",
      price: book.price || 0,
      promotionalPrice: book.promotional_price || "",
      promotionStart: toDateTimeInput(book.promotion_start),
      promotionEnd: toDateTimeInput(book.promotion_end),
      oldPrice: book.old_price || 0,
      type: book.type || "Físico",
      stock: book.stock || 0,
      isPreorder: Boolean(book.is_preorder),
      preorderShippingDate: book.preorder_shipping_date ? String(book.preorder_shipping_date).slice(0, 10) : "",
      cover: book.cover || "",
      images,
      active: Boolean(book.active)
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="adminBooksLayout" ref={formRef}>
      <div className="box adminBox bookForm">
        <div className="adminBoxTitle">
          <div><h2>{form.id ? "Editar livro" : "Novo livro"}</h2><p>Preencha os dados que serão exibidos na página do produto.</p></div>
          {form.id && <button className="btn" onClick={() => setForm(empty)}>Novo cadastro</button>}
        </div>

        <fieldset>
          <legend>Informações principais</legend>
          <div className="adminFormGrid">
            <label className="span2">Título<input placeholder="Título do livro" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
            <label className="span2">Descrição curta<input placeholder="Resumo para a vitrine" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
            <label className="span2">Descrição completa<textarea rows="7" placeholder="Texto completo da página do livro" value={form.longDescription} onChange={event => setForm({ ...form, longDescription: event.target.value })} /></label>
            <label>Autor<input placeholder="Nome do autor" value={form.author} onChange={event => setForm({ ...form, author: event.target.value })} /></label>
            <label>Formato<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option>Físico</option></select></label>
            <label>ISBN opcional<input placeholder="ISBN" value={form.isbn} onChange={event => setForm({ ...form, isbn: event.target.value })} /></label>
            <label>Número de páginas<input type="number" min="0" placeholder="Ex.: 120" value={form.pageCount} onChange={event => setForm({ ...form, pageCount: event.target.value })} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Preço e promoção automática</legend>
          <div className="adminFormGrid">
            <label>Preço normal<input type="number" min="0" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></label>
            <label>Preço promocional<input type="number" min="0" step="0.01" placeholder="Deixe vazio sem promoção" value={form.promotionalPrice} onChange={event => setForm({ ...form, promotionalPrice: event.target.value })} /></label>
            <label>Início da promoção<input type="datetime-local" value={form.promotionStart} onChange={event => setForm({ ...form, promotionStart: event.target.value })} /></label>
            <label>Fim da promoção<input type="datetime-local" value={form.promotionEnd} onChange={event => setForm({ ...form, promotionEnd: event.target.value })} /></label>
          </div>
          {Number(form.promotionalPrice || 0) > 0 && (
            <div className="promotionPreview">
              <span>Desconto calculado: <b>{promotionPercent}%</b></span>
              <span>Economia: <b>{money(Math.max(0, Number(form.price || 0) - Number(form.promotionalPrice || 0)))}</b></span>
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Estoque e publicação</legend>
          <div className="adminFormGrid">
            <label>Estoque<input type="number" min="0" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} /></label>
            <label className="checkLabel"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Produto ativo na loja</label>
            <label className="checkLabel"><input type="checkbox" checked={form.isPreorder} onChange={event => setForm({ ...form, isPreorder: event.target.checked })} /> Vender este livro em pré-venda</label>
            {form.isPreorder && <label>Lançamento previsto do livro na pré-venda<input type="date" value={form.preorderShippingDate} onChange={event => setForm({ ...form, preorderShippingDate: event.target.value })} /></label>}
          </div>
        </fieldset>

        <fieldset>
          <legend>Galeria de imagens</legend>
          <p className="fieldHelp">Envie até 10 imagens. A primeira será a imagem principal.</p>
          <label className={uploading ? "uploadButton disabled" : "uploadButton"}>
            <ImagePlus />
            <span>{uploading ? uploadProgress : `Selecionar imagens (${form.images.length}/10)`}</span>
            <input type="file" accept="image/*" multiple disabled={uploading || form.images.length >= 10} onChange={upload} />
          </label>
          {!!form.images.length && (
            <div className="adminImageGrid">
              {form.images.map((image, index) => (
                <div className={index === 0 ? "adminImage main" : "adminImage"} key={`${image}-${index}`}>
                  <img src={image} alt={`Imagem ${index + 1}`} />
                  {index === 0 ? <span>Principal</span> : <button onClick={() => makeMain(index)}>Tornar principal</button>}
                  <button className="removeImage" onClick={() => removeImage(index)} aria-label="Remover imagem"><X size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <button className="btn red full saveBook" onClick={save} disabled={saving || uploading}><Save /> {saving ? "Salvando..." : "Salvar livro"}</button>
      </div>

      <div className="box adminBox bookListPanel">
        <h2>Livros cadastrados</h2>
        <div className="adminBookList">
          {data.books.map(book => (
            <article key={book.id}>
              <img src={getBookImages(book)[0]} alt={book.title} />
              <div>
                <h3>{book.title}</h3>
                <p>{book.active ? "Ativo" : "Inativo"} • {isPreorder(book) ? `Pré-venda: lançamento ${preorderDateLabel(book)}` : `Estoque: ${getStock(book)}`}</p>
                <PriceBlock book={book} compact />
              </div>
              <button onClick={() => edit(book)} aria-label="Editar"><Pencil size={18} /></button>
              <button onClick={() => remove(book.id)} aria-label="Apagar"><Trash2 size={18} /></button>
            </article>
          ))}
          {!data.books.length && <div className="empty small">Nenhum livro cadastrado.</div>}
        </div>
      </div>
    </div>
  );
}

function CouponsAdmin({ data, load, notify }) {
  const emptyForm = { code: "", type: "percent", value: 10, buy_quantity: 2, pay_quantity: 1, product_ids: [], active: true };
  const [form, setForm] = useState(emptyForm);

  async function save() {
    if (!form.code.trim()) return notify("Código obrigatório.", "error");
    if (form.type === "buy_pay") {
      const buyQuantity = Number(form.buy_quantity || 0);
      const payQuantity = Number(form.pay_quantity || 0);
      if (buyQuantity < 2) return notify("A quantidade em Leve deve ser pelo menos 2.", "error");
      if (payQuantity < 1 || payQuantity >= buyQuantity) return notify("A quantidade em Pague deve ser menor que a quantidade em Leve.", "error");
    }

    try {
      await api("/.netlify/functions/store-data?table=coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.code.toUpperCase(),
          code: form.code.toUpperCase(),
          type: form.type,
          value: form.type === "buy_pay" ? 0 : Number(form.value),
          buy_quantity: form.type === "buy_pay" ? Number(form.buy_quantity) : null,
          pay_quantity: form.type === "buy_pay" ? Number(form.pay_quantity) : null,
          product_ids: Array.isArray(form.product_ids) ? form.product_ids : [],
          active: form.active
        })
      });
      setForm(emptyForm);
      notify("Cupom salvo.");
      await load({ silent: true });
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function remove(id) {
    try {
      await api(`/.netlify/functions/store-data?table=coupons&id=${encodeURIComponent(id)}`, { method: "DELETE" });
      notify("Cupom removido.");
      await load({ silent: true });
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function couponDescription(coupon) {
    if (coupon.type === "buy_pay") return `Leve ${coupon.buy_quantity || 2}, pague ${coupon.pay_quantity || 1}`;
    if (coupon.type === "percent") return `${coupon.value}%`;
    return money(coupon.value);
  }

  return (
    <div className="adminSimpleGrid">
      <div className="box adminBox">
        <h2>Novo cupom</h2>
        <label>Código<input placeholder="Código" value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} /></label>
        <label>Tipo
          <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>
            <option value="percent">Porcentagem %</option>
            <option value="fixed">Valor fixo R$</option>
            <option value="buy_pay">Leve X, pague Y</option>
          </select>
        </label>

        {form.type === "buy_pay" ? (
          <div className="shippingGrid">
            <label>Leve<input type="number" min="2" value={form.buy_quantity} onChange={event => setForm({ ...form, buy_quantity: event.target.value })} /></label>
            <label>Pague<input type="number" min="1" value={form.pay_quantity} onChange={event => setForm({ ...form, pay_quantity: event.target.value })} /></label>
          </div>
        ) : (
          <label>Valor<input type="number" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} /></label>
        )}


        <div className="couponProductsBox">
          <b>Produtos permitidos</b>
          <label className="checkLabel">
            <input
              type="checkbox"
              checked={!Array.isArray(form.product_ids) || form.product_ids.length === 0}
              onChange={event => setForm({ ...form, product_ids: event.target.checked ? [] : (data.books[0] ? [String(data.books[0].id)] : []) })}
            />
            Todos os produtos
          </label>
          <div className="couponProductsList">
            {data.books.map(book => {
              const selected = Array.isArray(form.product_ids) && form.product_ids.map(String).includes(String(book.id));
              return (
                <label className="checkLabel" key={book.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={event => {
                      const current = Array.isArray(form.product_ids) ? form.product_ids.map(String) : [];
                      const next = event.target.checked
                        ? [...new Set([...current, String(book.id)])]
                        : current.filter(id => id !== String(book.id));
                      setForm({ ...form, product_ids: next });
                    }}
                  />
                  {book.title}
                </label>
              );
            })}
          </div>
          <small>Deixe “Todos os produtos” marcado para o cupom funcionar na loja inteira.</small>
        </div>

        <label className="checkLabel"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })} /> Ativo</label>
        <button className="btn red full" onClick={save}>Salvar cupom</button>
      </div>

      <div className="box adminBox">
        <h2>Cupons cadastrados</h2>
        <div className="list">
          {data.coupons.map(coupon => (
            <div className="row" key={coupon.id}>
              <span><b>{coupon.code}</b><small>{couponDescription(coupon)} • {Array.isArray(coupon.product_ids) && coupon.product_ids.length ? `${coupon.product_ids.length} produto(s)` : "Todos os produtos"} • {coupon.active ? "Ativo" : "Inativo"}</small></span>
              <button onClick={() => setForm({ ...emptyForm, ...coupon })}><Pencil size={16} /></button>
              <button onClick={() => remove(coupon.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrdersAdmin({ data, load, notify }) {
  const [tab, setTab] = useState("ativos");
  const cancelledStatuses = ["Cancelado", "Cancelado pelo cliente", "Pagamento recusado", "Estornado", "Chargeback"];
  const orders = tab === "cancelados"
    ? data.orders.filter(order => cancelledStatuses.includes(order.status))
    : tab === "entregues"
      ? data.orders.filter(order => order.status === "Entregue")
      : data.orders.filter(order =>
          !cancelledStatuses.includes(order.status) && order.status !== "Entregue"
        );

  async function update(id, body) {
    try {
      await api(`/.netlify/functions/store-data?table=orders&id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      notify("Pedido atualizado.");
      await load({ silent: true });
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function generateLabel(order) {
    location.hash = `/imprimir-etiqueta/${order.id}`;
  }

  return (
    <div className="box adminBox ordersAdmin">
      <div className="adminOrdersHead">
        <h2>Pedidos</h2>
        <button className={tab === "ativos" ? "btn red" : "btn"} onClick={() => setTab("ativos")}>Ativos</button>
        <button className={tab === "entregues" ? "btn red" : "btn"} onClick={() => setTab("entregues")}>Entregues</button>
        <button className={tab === "cancelados" ? "btn red" : "btn"} onClick={() => setTab("cancelados")}>Cancelados</button>
      </div>

      {!orders.length && <p>Nenhum pedido nesta aba.</p>}

      <div className="adminOrdersGrid">
        {orders.map(order => (
          <div className="order" key={order.id}>
            <div className="orderTop"><h3>{order.book_title}</h3><span>{order.status}</span></div>
            <p><b>Código:</b> {order.id}</p>
            <p><b>Cliente:</b> {order.buyer?.name}</p>
            <p><b>Email:</b> {order.buyer?.email}</p>
            <p><b>Valor:</b> {money(order.final_price)}</p>
            <p><b>Endereço:</b> {order.buyer?.street}, {order.buyer?.number} - {order.buyer?.city}/{order.buyer?.state}</p>
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="orderItems">
                {order.items.map((item, index) => <span key={`${item.book_id}-${index}`}>{item.qty}x {item.title}</span>)}
              </div>
            )}
            {order.shipping && <p><b>Frete:</b> {order.shipping.company || "Correios"} - {order.shipping.name} - {Number(order.shipping.price) === 0 ? "Grátis" : money(order.shipping.price)}</p>}

            <label>Status<select value={order.status || "Aguardando pagamento"} onChange={event => update(order.id, { status: event.target.value })}>
              <option>Aguardando pagamento</option>
              <option>Aguardando envio</option>
              <option>Pago</option>
              <option>Separando pedido</option>
              <option>Enviado</option>
              <option>Entregue</option>
              <option>Cancelado</option>
              <option>Cancelado pelo cliente</option>
              <option>Pagamento recusado</option>
              <option>Estornado</option>
              <option>Chargeback</option>
            </select></label>

            <label>CEP<input placeholder="CEP do cliente" defaultValue={order.buyer?.cep || ""} onBlur={event => update(order.id, { buyer: { ...(order.buyer || {}), cep: event.target.value } })} /></label>
            <label>CPF<input placeholder="CPF do cliente" defaultValue={order.buyer?.cpf || ""} onBlur={event => update(order.id, { buyer: { ...(order.buyer || {}), cpf: event.target.value } })} /></label>
            <label>Rastreio<input placeholder="Código de rastreio" defaultValue={order.tracking_code || ""} onBlur={event => update(order.id, { tracking_code: event.target.value })} /></label>
            <button className="btn red full" onClick={() => generateLabel(order)}>🖨️ Imprimir etiqueta</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function createLabelCode(orderId) {
  const orderPart = String(orderId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase()
    .padStart(8, "0");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MBL${orderPart}${randomPart}`;
}

const CODE128_PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212",
  "112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131",
  "311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321",
  "112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121",
  "313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114",
  "122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212",
  "124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113",
  "114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"
];

function Code128Barcode({ value }) {
  const barcode = useMemo(() => {
    const safe = String(value || "")
      .toUpperCase()
      .split("")
      .filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) <= 126)
      .join("") || "MBLAB";
    const values = [...safe].map(character => character.charCodeAt(0) - 32);
    const checksum = (104 + values.reduce((total, item, index) => total + item * (index + 1), 0)) % 103;
    const encoded = [104, ...values, checksum, 106];
    const bars = [];
    let x = 10;

    encoded.forEach(code => {
      const pattern = CODE128_PATTERNS[code];
      [...pattern].forEach((width, index) => {
        const size = Number(width);
        if (index % 2 === 0) bars.push({ x, width: size });
        x += size;
      });
    });

    return { safe, bars, width: x + 10 };
  }, [value]);

  return (
    <div className="labelBarcode">
      <svg viewBox={`0 0 ${barcode.width} 48`} preserveAspectRatio="none" role="img" aria-label={`Código de barras ${barcode.safe}`}>
        {barcode.bars.map((bar, index) => <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height="39" />)}
      </svg>
      <strong>{barcode.safe}</strong>
    </div>
  );
}

function labelDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("pt-BR");
  return date.toLocaleDateString("pt-BR");
}

function ShippingLabel({ order }) {
  const buyer = order.buyer || {};
  const service = order.shipping?.name || order.shipping_service || "";
  const tracking = order.tracking_code || "";
  const freightValue = order.shipping?.price ?? order.shipping_value;
  const address = buyer.street || buyer.address || buyer.endereco || "";
  const number = buyer.number || buyer.numero || "";
  const complement = buyer.complement || buyer.complemento || "";
  const neighborhood = buyer.neighborhood || buyer.bairro || "";
  const city = buyer.city || buyer.cidade || "";
  const state = buyer.state || buyer.uf || "";
  const cep = buyer.cep || buyer.zip_code || "";
  const phone = buyer.phone || buyer.telefone || "";

  return (
    <article className="shippingLabelSheet">
      <div className="shippingLabelTitle">ETIQUETA DE ENVIO - MBLab</div>

      <section className="shippingLabelSummary">
        <div><b>SERVIÇO:</b><span>{service}</span></div>
        <div><b>RASTREIO:</b><span>{tracking}</span></div>
        <div><b>PEDIDO:</b><span>#{order.id}</span></div>
      </section>

      <section className="shippingLabelRecipient">
        <h2>DESTINATÁRIO</h2>
        <dl>
          <div><dt>Nome:</dt><dd>{buyer.name || ""}</dd></div>
          <div><dt>Endereço:</dt><dd>{address}</dd></div>
          <div><dt>Número / complemento:</dt><dd>{[number, complement].filter(Boolean).join(" - ")}</dd></div>
          <div><dt>Bairro:</dt><dd>{neighborhood}</dd></div>
          <div><dt>Cidade / UF:</dt><dd>{[city, state].filter(Boolean).join(" / ")}</dd></div>
          <div><dt>CEP:</dt><dd>{cep}</dd></div>
          <div><dt>Telefone:</dt><dd>{phone}</dd></div>
        </dl>
      </section>

      <section className="shippingLabelBottom">
        <div className="shippingSender">
          <h2>REMETENTE</h2>
          <p>MBLab</p>
          <p>Alameda Sobreiro, 121</p>
          <p>Osasco - SP | CEP 06030-304</p>
          <p>mateusbuarquepugli@gmail.com</p>
        </div>
        <div className="shippingNotes">
          <h2>OBSERVAÇÕES</h2>
          <p><b>Peso:</b> {order.shipping_weight || "________"}</p>
          <p><b>Valor frete:</b> {freightValue === undefined || freightValue === null || freightValue === "" ? "________" : money(freightValue)}</p>
          <p><b>Data:</b> {labelDate(order.shipping_date || order.label_created_at)}</p>
        </div>
      </section>
    </article>
  );
}

function ShippingLabelPage({ data }) {
  const id = location.hash.split("/").pop();
  const order = data.orders.find(item => String(item.id) === String(id));

  async function save(orderId, body) {
    await api(`/.netlify/functions/store-data?table=orders&id=${encodeURIComponent(orderId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  if (!order) return <Section title="Etiqueta">Pedido não encontrado.</Section>;

  return (
    <main className="shippingPrintPage">
      <div className="labelScreenActions printHide">
        <button className="btn" onClick={() => history.back()}>Voltar</button>
        <button className="btn red" onClick={() => window.print()}>Imprimir etiqueta</button>
      </div>
      <ShippingLabel order={order} save={save} />
    </main>
  );
}

function SkeletonLoading() {
  return (
    <Section title="Carregando livros">
      <div className="grid skeletonGrid">
        {[1, 2, 3, 4, 5, 6].map(item => (
          <div className="skeletonCard" key={item}>
            <div className="skeleton image" />
            <div className="skeleton line long" />
            <div className="skeleton line" />
            <div className="skeleton line short" />
          </div>
        ))}
      </div>
    </Section>
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
  const notifications = useNotifications();
  const { data, loading, load } = useData(notifications.notify);
  const { customer, save: saveCustomer, logout: customerLogout } = useCustomer();
  const cart = useCart(customer, data.books, notifications.notify);
  const wishlist = useWishlist(customer, notifications.notify);
  const [adminLogged, setAdminLogged] = useState(() => localStorage.getItem("mblab_admin") === "yes");

  function adminLogin(email, password) {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem("mblab_admin", "yes");
      setAdminLogged(true);
      notifications.notify("Acesso administrativo liberado.");
      location.hash = "/admin";
    } else {
      notifications.notify("Login incorreto.", "error");
    }
  }

  function adminLogout() {
    localStorage.removeItem("mblab_admin");
    setAdminLogged(false);
    location.hash = "/";
  }

  let page = <Home data={data} wishlist={wishlist} />;

  if (loading) page = <SkeletonLoading />;
  else if (route === "/loja") page = <Store data={data} wishlist={wishlist} />;
  else if (route === "/loja/fisicos") page = <Store data={data} wishlist={wishlist} category="fisicos" />;
  else if (route === "/loja/promocoes") page = <Store data={data} wishlist={wishlist} category="promocoes" />;
  else if (route.startsWith("/livro/")) page = <BookPage data={data} cart={cart} customer={customer} wishlist={wishlist} notify={notifications.notify} load={load} />;
  else if (route === "/login") page = <Login data={data} customerSave={saveCustomer} adminLogin={adminLogin} notify={notifications.notify} />;
  else if (route === "/carrinho") page = <Cart data={data} cart={cart} customer={customer} notify={notifications.notify} />;
  else if (route === "/favoritos") page = <Favorites data={data} wishlist={wishlist} />;
  else if (route === "/minhas-compras") page = <MyPurchases customer={customer} notify={notifications.notify} />;
  else if (route === "/admin") page = <Admin data={data} load={load} logged={adminLogged} login={adminLogin} logout={adminLogout} notify={notifications.notify} />;
  else if (route.startsWith("/imprimir-etiqueta/")) page = <ShippingLabelPage data={data} />;
  else if (route.startsWith("/pagamento/")) page = <StatusPage />;

  return (
    <>
      <Header customer={customer} customerLogout={customerLogout} cartCount={cart.cart.reduce((total, item) => total + Number(item.qty || 1), 0)} favoriteCount={wishlist.ids.length} />
      {page}
      <footer>
        <b>MBLab</b>
        <span>Loja oficial de livros • suporte: <a href="mailto:mateusbuarquepugli@gmail.com">mateusbuarquepugli@gmail.com</a></span>
      </footer>
      <Notifications items={notifications.items} remove={notifications.remove} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
