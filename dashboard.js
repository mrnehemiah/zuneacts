import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase=createClient("https://rpkogiieegqgxqbzwxwo.supabase.co","sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf",{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const content=document.querySelector("#content");
document.querySelector("#signOut").addEventListener("click",async()=>{await supabase.auth.signOut();location.replace("./index.html")});
async function boot(){
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError||!session){location.replace("./index.html");return}
 const {data:store,error}=await supabase.from("stores").select("store_name,category,logo_url,store_status,region,district").maybeSingle();
 if(error||!store){content.innerHTML='<p class="error">Imeshindikana kuthibitisha taarifa za duka. Tafadhali ingia tena au wasiliana na ZUNE Support.</p>';return}
 const first=(store.store_name||"Z").trim().charAt(0).toUpperCase();
 const logo=store.logo_url?'<img src="'+String(store.logo_url).replace(/"/g,"&quot;")+'" alt="">':first;
 content.className="";
 content.innerHTML='<div class="welcome"><span class="eyebrow">ZUNE SELLER PORTAL</span><h1>Karibu kwenye Seller Dashboard</h1><p>Umeingia kwa utambulisho maalum wa duka lako. Password ya Marketplace haijabadilishwa.</p></div><section class="store-card"><div class="store-logo">'+logo+'</div><div class="store-meta"><h2>'+escapeHtml(store.store_name)+'</h2><p>'+escapeHtml([store.category,store.district,store.region].filter(Boolean).join(" · "))+'</p><span class="status">'+escapeHtml(store.store_status||"Open")+'</span></div></section><div class="notice">Akaunti yako ya Seller Dashboard imetenganishwa na akaunti ya ZUNE Marketplace. Hapa ndipo tutakapoongeza vipengele vya kusimamia bidhaa, oda na taarifa za duka.</div>';
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
boot();
