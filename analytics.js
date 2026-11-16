import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);let lang="sw";
const money=n=>"TSh "+Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
function t(sw,en){return lang==="sw"?sw:en}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
async function load(){const days=Number($("#period").value)||30;$("#periodLabel").textContent=t("Siku "+days+" zilizopita", "Last "+days+" days");$("#chart").innerHTML='<p class="muted">'+t("Inapakia takwimu...","Loading analytics...")+'</p>';
const{data:{session},error:authError}=await db.auth.getSession();if(authError||!session){location.replace("index.html");return}
const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");if(ownerError||!owner){toast(t("Imeshindikana kuthibitisha duka.","Could not verify seller store."));return}
const since=new Date(Date.now()-days*86400000).toISOString();
const [p,o]=await Promise.all([db.from("products").select("id",{count:"exact",head:true}).eq("vendor_id",owner),db.from("orders").select("id,buyer_id,total_price,status,created_at").gte("created_at",since).order("created_at",{ascending:true})]);
if(p.error)console.warn("Analytics products:",p.error);if(o.error){console.error("Analytics orders:",o.error);toast(t("Imeshindikana kusoma oda.","Could not load orders."));return}
const orders=o.data||[],completed=orders.filter(x=>x.status==="completed"),sales=completed.reduce((s,x)=>s+Number(x.total_price||0),0),buyers=new Set(orders.map(x=>x.buyer_id).filter(Boolean));
$("#sales").textContent=money(sales);$("#orders").textContent=orders.length.toLocaleString();$("#products").textContent=p.count??"—";$("#customers").textContent=buyers.size.toLocaleString();
const buckets=Array.from({length:7},(_,i)=>({label:days<=7?["J1","J2","J3","J4","J5","J6","J7"][i]:["1","2","3","4","5","6","7"][i],value:0}));
for(const row of completed){const d=new Date(row.created_at),idx=Math.min(6,Math.floor((d.getTime()-(Date.now()-days*86400000))/(days*86400000/7)));if(idx>=0)buckets[idx].value+=Number(row.total_price||0)}
const max=Math.max(1,...buckets.map(x=>x.value));$("#chart").innerHTML=buckets.map(b=>'<div class="bar-group"><div class="bar" title="'+money(b.value)+'" style="height:'+Math.max(2,b.value/max*100)+'%"></div><span class="bar-label">'+b.label+'</span></div>').join("");
$("#insightText").textContent=orders.length?t("Umepokea oda "+orders.length+" katika kipindi hiki. "+completed.length+" zimekamilika na mauzo yaliyokamilika ni "+money(sales)+".","You received "+orders.length+" orders in this period. "+completed.length+" were completed, generating "+money(sales)+"."):t("Bado hakuna oda katika kipindi hiki. Takwimu zitaanza kuonekana oda zitakapopokelewa.","No orders in this period yet. Analytics will populate as orders arrive.");
}
$("#period").addEventListener("change",load);$("#refreshBtn").addEventListener("click",load);
document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>{lang=b.dataset.lang;document.querySelectorAll("[data-lang]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll("[data-sw]").forEach(x=>x.textContent=lang==="sw"?x.dataset.sw:x.dataset.en||x.dataset.sw);load()}));
load();