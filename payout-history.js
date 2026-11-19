import{boot,$}from"./store-tools-core.js";
const money=n=>"TSh "+Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status={available:"Inapatikana",paid:"Imelipwa",reversed:"Imebatilishwa"};
async function init(){
 try{
  const ctx=await boot();
  const{data,error}=await ctx.supabase.from("zune_seller_earnings_ledger")
   .select("id,order_id,seller_id,gross_amount,commission_rate,commission_amount,net_amount,currency,status,created_at")
   .eq("seller_id",ctx.store.owner_id).order("created_at",{ascending:false}).limit(200);
  if(error)throw error;
  const rows=data||[],sum=k=>rows.reduce((a,r)=>a+Number(r[k]||0),0);
  $("#gross").textContent=money(sum("gross_amount"));
  $("#commission").textContent=money(sum("commission_amount"));
  $("#net").textContent=money(sum("net_amount"));
  if(!rows.length){$("#history").innerHTML='<div class="empty">Bado hakuna mauzo yaliyokamilika yenye mgao wa mapato. Taarifa zitaonekana baada ya oda kukamilika.</div>';return}
  $("#history").innerHTML='<table><thead><tr><th>Tarehe</th><th>Oda</th><th>Mauzo ghafi</th><th>Commission</th><th>Net yako</th><th>Hali</th></tr></thead><tbody>'+
   rows.map(r=>'<tr><td>'+new Date(r.created_at).toLocaleString("sw-TZ")+'</td><td>'+esc(String(r.order_id).slice(0,8).toUpperCase())+'</td><td>'+money(r.gross_amount)+'</td><td>'+money(r.commission_amount)+' <small>('+Number(r.commission_rate*100).toFixed(2)+'%)</small></td><td><strong>'+money(r.net_amount)+'</strong></td><td><span class="finance-status">'+esc(status[r.status]||r.status)+'</span></td></tr>').join("")+
   '</tbody></table>';
 }catch(e){console.error(e);$("#history").innerHTML='<div class="empty">Imeshindikana kupakia historia: '+esc(e.message)+'</div>'}
}
init();
