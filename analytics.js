import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);let lang=localStorage.getItem("zune-seller-language")==="en"?"en":"sw";
const money=n=>"TSh "+Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0}),t=(sw,en)=>lang==="sw"?sw:en;
function toast(msg){const el=$("#toast");if(!el)return;el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
async function load(){const days=Number($("#period").value)||30;$("#periodLabel").textContent=t("Siku "+days+" zilizopita","Last "+days+" days");$("#chart").innerHTML='<p class="muted">'+t("Inapakia takwimu...","Loading analytics...")+'</p>';
try{const{data:{session},error:authError}=await db.auth.getSession();if(authError)throw authError;if(!session){location.replace("index.html");return}
const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");if(ownerError)throw ownerError;if(!owner)throw new Error(t("Duka halijathibitishwa.","Seller store could not be verified."));
const since=new Date(Date.now()-days*86400000).toISOString();
const{data:products,error:productError,count:productCount}=await db.from("products").select("id",{count:"exact"}).eq("vendor_id",owner).is("removed_at",null).limit(2000);if(productError)throw productError;
const ids=(products||[]).map(p=>p.id);let orders=[];
if(ids.length){const{data,error}=await db.from("orders").select("id,buyer_id,product_id,total_price,status,created_at").in("product_id",ids).gte("created_at",since).order("created_at",{ascending:true}).limit(2000);if(error)throw error;orders=data||[]}
const completed=orders.filter(x=>x.status==="completed"),sales=completed.reduce((s,x)=>s+Number(x.total_price||0),0),buyers=new Set(orders.map(x=>x.buyer_id).filter(Boolean));
$("#sales").textContent=money(sales);$("#orders").textContent=orders.length.toLocaleString();$("#products").textContent=productCount??0;$("#customers").textContent=buyers.size.toLocaleString();
const start=Date.now()-days*86400000,buckets=Array.from({length:7},(_,i)=>({label:days<=7?new Intl.DateTimeFormat(lang==="sw"?"sw-TZ":"en-TZ",{weekday:"short"}).format(new Date(start+(i+.5)*days*86400000/7)):String(i+1),value:0}));
for(const row of completed){const idx=Math.min(6,Math.floor((new Date(row.created_at).getTime()-start)/(days*86400000/7)));if(idx>=0)buckets[idx].value+=Number(row.total_price||0)}
const max=Math.max(1,...buckets.map(x=>x.value));$("#chart").innerHTML=buckets.map(b=>'<div class="bar-group"><div class="bar" title="'+money(b.value)+'" style="height:'+Math.max(2,b.value/max*100)+'%"></div><span class="bar-label">'+b.label+'</span></div>').join("");
$("#insightText").textContent=orders.length?t("Umepokea oda "+orders.length+" katika kipindi hiki. "+completed.length+" zimekamilika na mauzo yaliyokamilika ni "+money(sales)+".","You received "+orders.length+" orders in this period. "+completed.length+" were completed, generating "+money(sales)+"."):t("Bado hakuna oda katika kipindi hiki.","No orders in this period yet.");
}catch(e){console.error("Analytics load:",e);toast(e.message||t("Imeshindikana kupakia analytics.","Could not load analytics."));$("#chart").textContent=e.message||t("Imeshindikana kupakia takwimu.","Could not load analytics.")}}
$("#period").addEventListener("change",load);$("#refreshBtn").addEventListener("click",load);
document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>{lang=b.dataset.lang;try{localStorage.setItem("zune-seller-language",lang)}catch{}document.querySelectorAll("[data-lang]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll("[data-sw]").forEach(x=>x.textContent=lang==="sw"?x.dataset.sw:x.dataset.en||x.dataset.sw);load()}));
load();