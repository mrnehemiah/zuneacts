import{boot,$,tr}from"./store-tools-core.js";
const money=n=>new Intl.NumberFormat("sw-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(Number(n)||0);
let ctx,customers=[];
function customerSegment(c){if(c.orders>=5||c.sales>=100000)return"vip";if(c.lastOrderAt&&Date.now()-new Date(c.lastOrderAt).getTime()>30*86400000)return"at_risk";if(c.orders>1)return"repeat";return"new"}
function segmentLabel(key){return({vip:tr("VIP","VIP"),at_risk:tr("Inahitaji uangalizi","At risk"),repeat:tr("Anarudia","Repeat"),new:tr("Mpya","New")})[key]||key}
function render(){
 const q=$("#search").value.trim().toLowerCase(),filter=$("#segmentFilter").value;
 const list=customers.filter(c=>[c.name,c.phone,c.email,c.location].join(" ").toLowerCase().includes(q)&&(filter==="all"||customerSegment(c)===filter));
 const body=$("#customerRows");body.replaceChildren();
 if(!list.length){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=7;cell.className="empty-note";cell.textContent=customers.length?tr("Hakuna mteja anayelingana na kichujio hiki.","No customers match these filters."):tr("Bado hakuna oda za kutengeneza orodha ya wateja.","No orders yet, so there are no customers to list.");row.append(cell);body.append(row);return}
 list.forEach(c=>{
  const row=document.createElement("tr");
  for(const v of [c.name,[c.phone,c.email].filter(Boolean).join(" · ")||"—",String(c.orders),money(c.sales),c.lastOrderAt?new Date(c.lastOrderAt).toLocaleDateString("sw-TZ"):"—"]){const td=document.createElement("td");td.textContent=v;row.append(td)}
  const segment=document.createElement("td"),pill=document.createElement("span"),key=customerSegment(c);pill.className="customer-segment "+key;pill.textContent=segmentLabel(key);segment.append(pill);row.append(segment);
  const action=document.createElement("td");if(c.phone){const a=document.createElement("a");a.href="https://wa.me/"+c.phone.replace(/[^0-9]/g,"");a.target="_blank";a.rel="noopener noreferrer";a.textContent="WhatsApp";a.style.color="#168568";a.style.fontWeight="800";a.style.fontSize="10px";action.append(a)}else action.textContent="—";row.append(action);body.append(row)
 })
}
async function load(){
 const b=$("#refresh");b.disabled=true;
 try{
  const{data:products,error:productError}=await ctx.supabase.from("products").select("id").eq("vendor_id",ctx.store.owner_id).limit(2000);if(productError)throw productError;
  const ids=(products||[]).map(p=>p.id);let data=[];
  if(ids.length){const{data:orders,error}=await ctx.supabase.from("orders").select("id,checkout_id,buyer_id,quantity,total_price,status,created_at,recipient_name,recipient_phone,recipient_email,delivery_region,delivery_district,product_id").in("product_id",ids).order("created_at",{ascending:false}).limit(2000);if(error)throw error;data=orders||[]}
  const map=new Map();
  for(const o of data){const key=o.buyer_id||o.recipient_phone||o.recipient_email||o.recipient_name||o.id;let c=map.get(key);if(!c){c={name:o.recipient_name||tr("Mteja","Customer"),phone:o.recipient_phone||"",email:o.recipient_email||"",location:[o.delivery_district,o.delivery_region].filter(Boolean).join(", "),orders:0,orderKeys:new Set(),sales:0,lastOrderAt:o.created_at};map.set(key,c)}if(o.created_at&&(!c.lastOrderAt||new Date(o.created_at)>new Date(c.lastOrderAt)))c.lastOrderAt=o.created_at;const orderKey=o.checkout_id||o.id;if(!c.orderKeys.has(orderKey)){c.orderKeys.add(orderKey);c.orders++}if(o.status==="completed")c.sales+=Number(o.total_price||0)}
  customers=[...map.values()].sort((a,b)=>b.orders-a.orders);
  const repeat=customers.filter(c=>c.orders>1).length,totalSales=customers.reduce((n,c)=>n+c.sales,0);
  $("#customersCount").textContent=customers.length.toLocaleString();$("#ordersCount").textContent=customers.reduce((n,c)=>n+c.orders,0).toLocaleString();$("#repeatCount").textContent=repeat.toLocaleString();$("#salesTotal").textContent=money(totalSales);$("#repeatRate").textContent=(customers.length?repeat/customers.length*100:0).toFixed(1)+"%";$("#averageCustomerSales").textContent=money(customers.length?totalSales/customers.length:0);render()
 }catch(e){console.error(e);const m=$("#message");m.textContent=tr("Imeshindikana kupakia wateja. Hakikisha ruhusa za oda zipo.","Could not load customers. Check seller order access.");m.classList.add("show")}
 finally{b.disabled=false}
}
async function init(){try{ctx=await boot();$("#search").addEventListener("input",render);$("#segmentFilter").addEventListener("change",render);$("#refresh").addEventListener("click",load);await load()}catch(e){console.error(e)}}
init();