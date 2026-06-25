
const SUPABASE_URL=String(process.env.SUPABASE_URL||"").trim().replace(/\/rest\/v1\/?$/i,"").replace(/\/+$/g,"");
const SUPABASE_KEY=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
function json(statusCode,body){return{statusCode,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS"},body:JSON.stringify(body)}}
async function supabase(path,opt={}){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error("Supabase não configurado");const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...opt,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json",Prefer:opt.prefer||"return=representation",...(opt.headers||{})}});const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(typeof d==="string"?d:JSON.stringify(d));return d}
async function sendEmail({to,subject,html}){if(!process.env.RESEND_API_KEY||!to)return;const from=process.env.FROM_EMAIL||"MBLab <onboarding@resend.dev>";const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from,to,subject,html})});if(!r.ok)console.log(await r.text())}
module.exports={json,supabase,sendEmail};
