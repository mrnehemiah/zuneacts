import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let drivers=[],deliveries=[];
const labels={pending:"Inasubiri",assigned:"Dereva amechaguliwa",ready_for_pickup:"Muuzaji amekabidhi mzigo",picked_up:"Dereva amepokea mzigo",in_transit:"Mzigo uko njiani",delivered:"Dereva amefikisha",completed:"Mnunuzi amethibitisha kupokea",cancelled:"Imeghairiwa",disputed:"Ina uchunguzi"};
function toast(message,error=false){const el=$("#deliveryToast");el.className=error?"delivery-error":"";el.textContent=message;setTimeout(()=>{el.textContent="";el.className=""},4500)}
function money(v,c="TSh"){return c+" "+Number(v||0).toLocaleString("en-TZ")}
function render(){
 $("#countAll").textContent=deliveries.length;
 $("#countTransit").textContent=deliveries.filter(d=>["picked_up","in_transit","ready_for_pickup"].includes(d.delivery_status)).length;
 $("#countDone").textContent=deliveries.filter(d=>d.delivery_status==="completed").length;
 const root=$("#deliveryList");
 if(!deliveries.length){root.innerHTML='<div class="delivery-empty">Hakuna delivery zilizorekodiwa kwa oda za duka lako bado.</div>';return}
 root.innerHTML=deliveries.map(d=>{
 const driver=drivers.find(x=>x.driver_id===d.assigned_driver_id);
 const canAssign=["pending","assigned"].includes(d.delivery_status)&&!d.seller_handover_confirmed_at;
 const canHandover=d.delivery_status==="assigned"&&!d.seller_handover_confirmed_at;
 const map=d.latitude!=null&&d.longitude!=null?'<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat='+d.latitude+'&mlon='+d.longitude+'#map=16/'+d.latitude+'/'+d.longitude+'">Ramani ya eneo ↗</a>':"";
 const assign=canAssign?'<div class="delivery-actions"><select class="delivery-select" data-driver-select="'+d.delivery_id+'"><option value="">Chagua dereva aliyeidhinishwa</option>'+drivers.map(x=>'<option value="'+x.driver_id+'" '+(x.driver_id===d.assigned_driver_id?'selected':'')+'>'+esc(x.full_name)+' · '+esc(x.vehicle_type||"")+' · '+esc(x.phone_number||"")+'</option>').join("")+'</select><button data-assign="'+d.delivery_id+'">Panga dereva</button></div>':"";
 const handover=canHandover?'<div class="delivery-actions"><button data-handover="'+d.delivery_id+'">Thibitisha nimemkabidhi dereva mzigo</button></div>':"";
 return '<article class="delivery-card"><div class="delivery-card-top"><div><h3>Oda #'+d.delivery_id.slice(0,8).toUpperCase()+'</h3><div class="delivery-meta">'+esc(d.recipient_name||"Mnunuzi")+' · '+esc(d.recipient_phone||"")+'<br>'+esc([d.delivery_address,d.district,d.region].filter(Boolean).join(", ")||"Anwani haijawekwa")+'<br>Gharama ya delivery: '+money(d.delivery_fee,d.currency)+'</div></div><span class="delivery-status">'+esc(labels[d.delivery_status]||d.delivery_status)+'</span></div><div class="delivery-meta">Dereva: '+(driver?esc(driver.full_name)+" · "+esc(driver.phone_number||""):"Hajapangiwa")+(d.seller_handover_confirmed_at?"<br>Makabidhiano: "+new Date(d.seller_handover_confirmed_at).toLocaleString("sw-TZ"):"")+(d.driver_pickup_confirmed_at?"<br>Dereva amepokea: "+new Date(d.driver_pickup_confirmed_at).toLocaleString("sw-TZ"):"")+(d.driver_delivered_at?"<br>Dereva amefikisha: "+new Date(d.driver_delivered_at).toLocaleString("sw-TZ"):"")+(d.buyer_confirmed_at?"<br>Mnunuzi amepokea: "+new Date(d.buyer_confirmed_at).toLocaleString("sw-TZ"):"")+'</div><div class="delivery-links">'+map+'</div>'+assign+handover+'</article>';
 }).join("");
 root.querySelectorAll("[data-assign]").forEach(btn=>btn.addEventListener("click",async()=>{const select=root.querySelector('[data-driver-select="'+btn.dataset.assign+'"]');if(!select.value){toast("Chagua dereva kwanza.",true);return}btn.disabled=true;const{error}=await db.rpc("zune_delivery_assign_driver",{p_delivery_id:btn.dataset.assign,p_driver_id:select.value});btn.disabled=false;if(error){toast(error.message,true);return}toast("Dereva amepangiwa oda.");await load()}));
 root.querySelectorAll("[data-handover]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Unathibitisha kuwa umemkabidhi dereva mzigo wa oda hii?"))return;btn.disabled=true;const{error}=await db.rpc("zune_delivery_seller_handover",{p_delivery_id:btn.dataset.handover,p_note:"Muuzaji amethibitisha kumkabidhi dereva mzigo."});btn.disabled=false;if(error){toast(error.message,true);return}toast("Makabidhiano yamethibitishwa.");await load()}));
}
async function load(){
 $("#deliveryList").innerHTML='<div class="delivery-empty">Inapakia delivery...</div>';
 const{data:driverRows,error:driverError}=await db.rpc("zune_delivery_active_drivers");if(driverError)throw driverError;drivers=driverRows||[];
 const{data:deliveryRows,error}=await db.rpc("zune_delivery_seller_queue");if(error)throw error;deliveries=deliveryRows||[];render();
}
async function init(){
 const{data:{session},error}=await db.auth.getSession();if(error||!session){location.replace("./index.html");return}
 $("#avatar").textContent=(session.user.email||"Z").charAt(0).toUpperCase();
 document.querySelectorAll(".lang-btn").forEach(btn=>btn.addEventListener("click",()=>{localStorage.setItem("zune-seller-language",btn.dataset.lang);document.documentElement.lang=btn.dataset.lang;toast(btn.dataset.lang==="en"?"English selected; delivery labels will be translated in the next language pass.":"Lugha ya Kiswahili imechaguliwa.")}));
 $("#refreshDelivery").addEventListener("click",()=>load().catch(e=>toast(e.message,true)));
 await load();
}
init().catch(error=>{console.error(error);$("#deliveryList").innerHTML='<div class="delivery-error">'+esc(error.message)+'</div>'});