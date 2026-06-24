
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Menu, ShoppingBag, Trash2, Pencil, Plus, TicketPercent, Eye, EyeOff } from "lucide-react";
import "./style.css";

const ADMIN_EMAIL = "mateusbpugli@gmail.com";
const ADMIN_PASSWORD = "Mateus Buarque 1101";

function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function id(){return Math.random().toString(36).slice(2,9)}
function slug(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")||id()}

function dbBookToForm(b){
  return {
    id:b.id,title:b.title||"",description:b.description||"",longDescription:b.long_description||"",
    price:Number(b.price||0),oldPrice:Number(b.old_price||0),type:b.type||"Físico",
    stock:Number(b.stock||0),cover:b.cover||"",active:b.active!==false
  }
}
function formBookToDb(b){
  return {
    id:b.id||slug(b.title),title:b.title,description:b.description,long_description:b.longDescription,
    price:Number(b.price||0),old_price:Number(b.oldPrice||0),type:b.type,stock:Number(b.stock||0),
    cover:b.cover||"/logo.jpeg",active:!!b.active
  }
}
function dbCouponToForm(c){return {id:c.id,code:c.code||"",type:c.type||"percent",value:Number(c.value||0),active:c.active!==false}}
function formCouponToDb(c){return {id:(c.code||c.id).toUpperCase(),code:(c.code||c.id).toUpperCase(),type:c.type,value:Number(c.value||0),active:!!c.active}}

async function api(path, options={}){
  const res = await fetch(path, options);
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.details || data.error || "Erro");
  return data;
}

function useData(){
  const [data,setData]=useState({books:[],coupons:[],orders:[]});
  const [loading,setLoading]=useState(true);
  async function load(){
    setLoading(true);
    try{
      const res=await api("/.netlify/functions/store-data");
      setData({books:res.books||[],coupons:res.coupons||[],orders:res.orders||[]});
    }catch(e){alert("Erro ao carregar Supabase: "+e.message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);
  return {data,setData,loading,load};
}

function Header({logged,logout}){
  const [open,setOpen]=useState(false);
  return <>
    <header className="header">
      <button className="iconBtn" onClick={()=>setOpen(!open)}><Menu /></button>
      <a className="brand" href="#/"><img src="/logo.jpeg"/><span>MBLab</span></a>
      <nav className={open?"nav open":"nav"}>
        <a href="#/">Início</a><a href="#/loja">Livros</a><a href="#/pedido">Minha compra</a><a href="#/admin">{logged?"Admin":"Login"}</a>
        {logged&&<button onClick={logout}>Sair</button>}
      </nav>
    </header>
    <div className="categoryBar">
      <a href="#/loja">Todos</a><a href="#/loja/fisicos">Livros físicos</a><a href="#/loja/digitais">Livros digitais</a><a href="#/loja/promocoes">Promoções</a>
    </div>
  </>
}

function Home({data}) {
  const books=data.books.filter(b=>b.active);
  return <>
    <section className="hero">
      <div className="heroText"><p className="eyebrow">Loja oficial</p><h1>MBLab</h1><p>Trabalhamos com o politicamente f****</p><a className="btn red" href="#/loja">Comprar livros</a></div>
      <div className="heroLogo"><img src="/logo.jpeg"/></div>
    </section>
    <section className="section"><div className="sectionHead"><h2>Livros em destaque</h2><a href="#/loja">Ver todos</a></div><BookGrid books={books}/></section>
    <section className="banner"><h2>Humor, livro e zero frescura.</h2><p>Compre direto pela loja oficial da MBLab.</p></section>
  </>
}

function Store({data,category="todos"}){
  let books=data.books.filter(b=>b.active);
  if(category==="fisicos")books=books.filter(b=>String(b.type).toLowerCase().includes("físico")||String(b.type).toLowerCase().includes("fisico"));
  if(category==="digitais")books=books.filter(b=>String(b.type).toLowerCase().includes("digital"));
  if(category==="promocoes")books=books.filter(b=>Number(b.old_price||0)>Number(b.price||0));
  return <section className="section"><h1>{category==="todos"?"Todos os livros":category==="fisicos"?"Livros físicos":category==="digitais"?"Livros digitais":"Promoções"}</h1><BookGrid books={books}/></section>
}
function BookGrid({books}){return books.length?<div className="grid">{books.map(b=><BookCard key={b.id} book={b}/>)}</div>:<div className="empty">Nenhum livro ativo.</div>}
function BookCard({book}){return <article className="product"><a href={`#/livro/${book.id}`} className="cover"><span>{book.type}</span><img src={book.cover||"/logo.jpeg"}/></a><div className="productInfo"><h3>{book.title}</h3><p>{book.description}</p>{Number(book.old_price)>0&&<del>{money(book.old_price)}</del>}<strong>{money(book.price)}</strong><small>{book.stock>0?`Só restam ${book.stock} em estoque`:"Esgotado"}</small><a className="btn outline" href={`#/livro/${book.id}`}>Ver detalhes</a></div></article>}

function BookPage({data,load}){
  const book=data.books.find(b=>b.id===location.hash.split("/")[2]);
  if(!book)return <section className="section"><h1>Livro não encontrado</h1></section>;
  return <section className="detail"><a className="back" href="#/loja">← voltar</a><div className="detailGrid"><img className="detailCover" src={book.cover||"/logo.jpeg"}/><div className="detailInfo"><span className="pill">{book.type}</span><h1>{book.title}</h1><p>{book.long_description||book.description}</p>{Number(book.old_price)>0&&<del>{money(book.old_price)}</del>}<strong className="bigPrice">{money(book.price)}</strong><small>{book.stock>0?`${book.stock} em estoque`:"Esgotado"}</small><Checkout book={book} coupons={data.coupons} load={load}/></div></div></section>
}

function Checkout({book,coupons,load}){
  const [buyer,setBuyer]=useState({name:"",email:"",phone:"",cpf:"",cep:"",street:"",number:"",complement:"",neighborhood:"",city:"",state:""});
  const [coupon,setCoupon]=useState("");
  const [loading,setLoading]=useState(false);
  const activeCoupon=useMemo(()=>coupons.find(c=>c.active&&c.code?.toLowerCase()===coupon.trim().toLowerCase()),[coupon,coupons]);
  const finalPrice=useMemo(()=>{let p=Number(book.price||0);if(activeCoupon){if(activeCoupon.type==="percent")p-=p*Number(activeCoupon.value||0)/100;if(activeCoupon.type==="fixed")p-=Number(activeCoupon.value||0)}return Math.max(.01,Number(p.toFixed(2)))},[book.price,activeCoupon]);
  async function pay(e){
    e.preventDefault();
    for(const f of [["name","nome"],["email","email"],["phone","WhatsApp"],["cep","CEP"],["street","rua"],["number","número"],["neighborhood","bairro"],["city","cidade"],["state","estado"]]){if(!buyer[f[0]])return alert("Preencha "+f[1])}
    setLoading(true);
    try{
      const order={id:`PED-${Date.now()}`,status:"Aguardando pagamento",tracking_code:"",book_title:book.title,final_price:finalPrice,coupon:activeCoupon?.code||"",buyer};
      await api("/.netlify/functions/store-data?table=orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(order)});
      localStorage.setItem("mblab_last_order",JSON.stringify(order));
      const res=await api("/.netlify/functions/create-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:`${book.title} - ${order.id}`,price:finalPrice,email:buyer.email,orderId:order.id})});
      window.location.href=res.init_point||res.sandbox_init_point;
    }catch(err){alert("Erro: "+err.message)}finally{setLoading(false)}
  }
  return <form className="checkout" onSubmit={pay}><h2>Comprar agora</h2><input placeholder="Nome completo" value={buyer.name} onChange={e=>setBuyer({...buyer,name:e.target.value})}/><input placeholder="E-mail" type="email" value={buyer.email} onChange={e=>setBuyer({...buyer,email:e.target.value})}/><input placeholder="WhatsApp" value={buyer.phone} onChange={e=>setBuyer({...buyer,phone:e.target.value})}/><input placeholder="CPF (opcional)" value={buyer.cpf} onChange={e=>setBuyer({...buyer,cpf:e.target.value})}/><h3 className="shippingTitle">Informações de envio</h3><div className="shippingGrid"><input placeholder="CEP" value={buyer.cep} onChange={e=>setBuyer({...buyer,cep:e.target.value})}/><input placeholder="Estado" maxLength={2} value={buyer.state} onChange={e=>setBuyer({...buyer,state:e.target.value.toUpperCase()})}/><input placeholder="Rua / Avenida" value={buyer.street} onChange={e=>setBuyer({...buyer,street:e.target.value})}/><input placeholder="Número" value={buyer.number} onChange={e=>setBuyer({...buyer,number:e.target.value})}/><input placeholder="Complemento" value={buyer.complement} onChange={e=>setBuyer({...buyer,complement:e.target.value})}/><input placeholder="Bairro" value={buyer.neighborhood} onChange={e=>setBuyer({...buyer,neighborhood:e.target.value})}/><input placeholder="Cidade" value={buyer.city} onChange={e=>setBuyer({...buyer,city:e.target.value})}/></div><div className="couponLine"><input placeholder="Cupom de desconto" value={coupon} onChange={e=>setCoupon(e.target.value.toUpperCase())}/><span>{activeCoupon?"Cupom aplicado":coupon?"Cupom inválido":""}</span></div><div className="total"><span>Total</span><b>{money(finalPrice)}</b></div><button className="btn red full" disabled={loading||book.stock<=0}>{loading?"Abrindo...":"Comprar com Pix ou Cartão"}</button></form>
}

function Admin({data,load,logged,login,logout}){
  const [email,setEmail]=useState(ADMIN_EMAIL),[password,setPassword]=useState(""),[show,setShow]=useState(false);
  if(!logged)return <section className="login"><form className="card" onSubmit={e=>{e.preventDefault();login(email,password)}}><h1>Admin</h1><input value={email} onChange={e=>setEmail(e.target.value)}/><div className="pass"><input placeholder="Senha" type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div><button className="btn red full">Entrar</button></form></section>;
  return <section className="section"><div className="adminTop"><h1>Painel Admin</h1><button className="btn black" onClick={logout}>Sair</button></div><div className="adminGrid"><BooksAdmin data={data} load={load}/><CouponsAdmin data={data} load={load}/></div><OrdersAdmin data={data} load={load}/></section>
}

function BooksAdmin({data,load}){
  const empty={id:"",title:"",description:"",longDescription:"",price:0,oldPrice:0,type:"Físico",stock:0,cover:"",active:true};
  const [form,setForm]=useState(empty);
  function upload(e){const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>setForm({...form,cover:String(r.result)});r.readAsDataURL(file)}
  async function save(){if(!form.title)return alert("Coloque o título");try{await api("/.netlify/functions/store-data?table=books",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formBookToDb(form))});setForm(empty);load()}catch(e){alert(e.message)}}
  async function remove(bookId){if(!confirm("Apagar livro?"))return;await api(`/.netlify/functions/store-data?table=books&id=${bookId}`,{method:"DELETE"});load()}
  return <div className="card adminBox"><h2>Livros</h2><input placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="Descrição curta" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><textarea placeholder="Descrição completa" value={form.longDescription} onChange={e=>setForm({...form,longDescription:e.target.value})}/><input placeholder="Preço" type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><input placeholder="Preço antigo opcional" type="number" value={form.oldPrice} onChange={e=>setForm({...form,oldPrice:e.target.value})}/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Físico</option><option>Digital</option></select><input placeholder="Estoque" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/><label className="uploadLabel">Capa do livro<input type="file" accept="image/*" onChange={upload}/></label>{form.cover&&<div className="coverPreview"><img src={form.cover}/><button type="button" onClick={()=>setForm({...form,cover:""})}>Remover capa</button></div>}<label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Ativo</label><button className="btn red full" onClick={save}><Plus/> Salvar livro</button><div className="list">{data.books.map(b=><div className="row" key={b.id}><span>{b.title}</span><button onClick={()=>setForm(dbBookToForm(b))}><Pencil size={16}/></button><button onClick={()=>remove(b.id)}><Trash2 size={16}/></button></div>)}</div></div>
}

function CouponsAdmin({data,load}){
  const [form,setForm]=useState({code:"",type:"percent",value:10,active:true});
  async function save(){if(!form.code)return alert("Coloque o código");try{await api("/.netlify/functions/store-data?table=coupons",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(formCouponToDb(form))});setForm({code:"",type:"percent",value:10,active:true});load()}catch(e){alert(e.message)}}
  async function remove(couponId){await api(`/.netlify/functions/store-data?table=coupons&id=${couponId}`,{method:"DELETE"});load()}
  return <div className="card adminBox"><h2>Cupons</h2><input placeholder="Código" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="percent">Porcentagem %</option><option value="fixed">Valor fixo R$</option></select><input type="number" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Ativo</label><button className="btn red full" onClick={save}><TicketPercent/> Salvar cupom</button><div className="list">{data.coupons.map(c=><div className="row" key={c.id}><span>{c.code} - {c.type==="percent"?`${c.value}%`:money(c.value)}</span><button onClick={()=>setForm(dbCouponToForm(c))}><Pencil size={16}/></button><button onClick={()=>remove(c.id)}><Trash2 size={16}/></button></div>)}</div></div>
}

function OrdersAdmin({data,load}) {
  async function updateOrder(orderId, changes) {
    try {
      await api(`/.netlify/functions/store-data?table=orders&id=${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(changes)
      });
      load();
    } catch (e) {
      alert("Erro ao atualizar pedido: " + e.message);
    }
  }

  return (
    <div className="card adminBox ordersBox">
      <div className="adminTop">
        <h2>Pedidos</h2>
        <button className="btn outline" onClick={load}>Atualizar pedidos</button>
      </div>
      {!data.orders.length && <p>Nenhum pedido ainda.</p>}
      <div className="ordersList">
        {data.orders.map(o => (
          <div className="orderCard" key={o.id}>
            <div>
              <h3>{o.book_title}</h3>
              <p><b>Código:</b> {o.id}</p>
              <p><b>Status:</b> {o.status}</p>
              <p><b>Valor:</b> {money(o.final_price)}</p>
              <p><b>Cupom:</b> {o.coupon || "Nenhum"}</p>
              <p><b>Pagamento:</b> {o.payment_status || "Aguardando retorno do Mercado Pago"}</p>
              <hr/>
              <p><b>Cliente:</b> {o.buyer?.name}</p>
              <p><b>E-mail:</b> {o.buyer?.email}</p>
              <p><b>WhatsApp:</b> {o.buyer?.phone}</p>
              {o.buyer?.cpf && <p><b>CPF:</b> {o.buyer.cpf}</p>}
              <hr/>
              <p><b>Endereço:</b> {o.buyer?.street}, {o.buyer?.number}</p>
              {o.buyer?.complement && <p><b>Complemento:</b> {o.buyer.complement}</p>}
              <p><b>Bairro:</b> {o.buyer?.neighborhood}</p>
              <p><b>Cidade/UF:</b> {o.buyer?.city} - {o.buyer?.state}</p>
              <p><b>CEP:</b> {o.buyer?.cep}</p>
            </div>
            <div className="orderActions">
              <label>Status do pedido</label>
              <select value={o.status || "Aguardando pagamento"} onChange={e => updateOrder(o.id, { status: e.target.value })}>
                <option>Aguardando pagamento</option>
                <option>Pago</option>
                <option>Separando pedido</option>
                <option>Enviado</option>
                <option>Entregue</option>
                <option>Cancelado</option>
              </select>

              <label>Código de rastreio</label>
              <input
                defaultValue={o.tracking_code || ""}
                placeholder="Ex: BR123456789BR"
                onBlur={e => updateOrder(o.id, { tracking_code: e.target.value })}
              />
              <small>O rastreio salva quando você sai do campo.</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function MyOrder({data}) {
  const [email,setEmail] = useState("");
  const [found,setFound] = useState([]);

  function search(e) {
    e.preventDefault();
    const results = (data.orders || []).filter(o => String(o.buyer?.email || "").toLowerCase() === email.trim().toLowerCase());
    setFound(results);
    if (!results.length) alert("Nenhum pedido encontrado para este e-mail.");
  }

  return (
    <section className="section">
      <h1>Minha compra</h1>
      <form className="card trackingForm" onSubmit={search}>
        <p>Digite o mesmo e-mail usado na compra para acompanhar o status.</p>
        <input placeholder="Seu e-mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn red">Buscar pedido</button>
      </form>

      <div className="ordersList">
        {found.map(o => (
          <div className="orderCard" key={o.id}>
            <div>
              <h3>{o.book_title}</h3>
              <p><b>Código:</b> {o.id}</p>
              <p><b>Status:</b> {o.status}</p>
              <p><b>Valor:</b> {money(o.final_price)}</p>
              <p><b>Rastreio:</b> {o.tracking_code || "Ainda não enviado"}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPage({type}){const map={sucesso:["Pagamento aprovado","Seu pagamento foi aprovado."],erro:["Pagamento não concluído","O pagamento foi cancelado ou recusado."],pendente:["Pagamento pendente","Aguardando confirmação."]};const [title,text]=map[type]||map.pendente;return <section className="section center"><ShoppingBag size={54}/><h1>{title}</h1><p>{text}</p><a className="btn red" href="#/loja">Voltar para loja</a></section>}

function App(){
  const {data,loading,load}=useData();
  const [logged,setLogged]=useState(()=>localStorage.getItem("mblab_admin")==="yes");
  const [route,setRoute]=useState(location.hash.replace("#","")||"/");
  useEffect(()=>{const fn=()=>setRoute(location.hash.replace("#","")||"/");addEventListener("hashchange",fn);return()=>removeEventListener("hashchange",fn)},[]);
  function login(email,password){if(email===ADMIN_EMAIL&&password===ADMIN_PASSWORD){localStorage.setItem("mblab_admin","yes");setLogged(true);location.hash="/admin"}else alert("Login incorreto")}
  function logout(){localStorage.removeItem("mblab_admin");setLogged(false);location.hash="/"}
  let page=<Home data={data}/>;
  if(loading) page=<section className="section center"><h1>Carregando...</h1></section>;
  else if(route==="/loja") page=<Store data={data} category="todos"/>;
  else if(route==="/loja/fisicos") page=<Store data={data} category="fisicos"/>;
  else if(route==="/loja/digitais") page=<Store data={data} category="digitais"/>;
  else if(route==="/loja/promocoes") page=<Store data={data} category="promocoes"/>;
  else if(route.startsWith("/livro/")) page=<BookPage data={data} load={load}/>;
  else if(route==="/admin") page=<Admin data={data} load={load} logged={logged} login={login} logout={logout}/>;
  else if(route==="/pedido") page=<MyOrder data={data}/>;
  else if(route.startsWith("/pagamento/")) page=<StatusPage type={route.split("/")[2]}/>;
  return <><Header logged={logged} logout={logout}/>{page}<footer><b>MBLab</b><span>Loja oficial de livros</span></footer></>
}
createRoot(document.getElementById("root")).render(<App/>);
