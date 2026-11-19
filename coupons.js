import{boot,$,tr}from"./store-tools-core.js";
const money=n=>"TSh "+Number(n||0).toLocaleString("en-US");
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
async function init(){
 let ctx;
 try{
  ctx=await boot();
  const{data:coupons,error}=await ctx.supabase.from("coupons").select("code,description,discount_type,discount_value,min_order_amount,max_discount_amount,expires_at").eq("status","active").lte("starts_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  const box=$("#couponList");box.replaceChildren();
  if(!coupons?.length)box.textContent=tr("Hakuna coupon za umma zinazotumika kwa sasa.","No public coupons are active right now.");
  (coupons||[]).forEach(x=>{const card=node("article");card.style.cssText="padding:13px 0;border-bottom:1px solid #edf1ed";card.append(node("strong",x.code+" · "+(x.discount_type==="percentage"?x.discount_value+"%":money(x.discount_value))));card.append(node("p",(x.description||"Ofa ya ZUNE")+" · Kiwango cha chini: "+money(x.min_order_amount)+(x.expires_at?" · Mwisho: "+new Date(x.expires_at).toLocaleDateString("sw-TZ"):"")));box.append(card)});
  await loadMine(ctx);
  $("#promotionForm").addEventListener("submit",async e=>{
   e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=$("#submitPromotion");btn.disabled=true;btn.textContent=tr("Inatuma...","Submitting...");
   try{
    const type=String(fd.get("discount_type")),value=Number(fd.get("discount_value")),min=Number(fd.get("min_order_amount")||0),max=fd.get("max_discount_amount")===""?null:Number(fd.get("max_discount_amount"));
    if(type==="percentage"&&(value>100||value<=0))throw new Error("Asilimia lazima iwe kati ya 0 na 100.");
    const start=new Date(fd.get("starts_at")),end=new Date(fd.get("expires_at"));
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza.");
    const{data,error}=await ctx.supabase.rpc("submit_seller_promotion",{p_store_id:ctx.storeId,p_title:String(fd.get("title")).trim(),p_description:String(fd.get("description")||""),p_discount_type:type,p_discount_value:value,p_min_order_amount:min,p_max_discount_amount:max,p_starts_at:start.toISOString(),p_expires_at:end.toISOString(),p_eligible_product_ids:[]});
    if(error)throw error;
    form.reset();ctx.message("Ombi limetumwa kwa Admin. Promotion itaanza kuonekana baada ya kuidhinishwa.","Your promotion request was submitted for Admin approval.",true);
    await loadMine(ctx);
   }catch(err){ctx.message(err.message||"Imeshindikana kutuma ombi.","Could not submit promotion request.");}
   finally{btn.disabled=false;btn.textContent=tr("Tuma kwa Admin aidhinishe","Submit for Admin approval")}
  });
 }catch(e){console.error(e);const m=$("#message");m.textContent=e.message||"Imeshindikana kupakia.";m.classList.add("show")}
}
async function loadMine(ctx){
 const box=$("#myPromotions");box.textContent=tr("Inapakia...","Loading...");
 const{data,error}=await ctx.supabase.from("seller_promotions").select("title,description,discount_type,discount_value,starts_at,expires_at,status,admin_note,created_at").eq("store_id",ctx.storeId).order("created_at",{ascending:false}).limit(100);
 if(error)throw error;box.replaceChildren();
 if(!data?.length){box.textContent=tr("Bado hujatuma promotion yoyote.","You have not submitted a promotion yet.");return}
 data.forEach(p=>{const card=node("article");card.style.cssText="padding:14px 0;border-bottom:1px solid #edf1ed";card.append(node("strong",p.title+" · "+(p.discount_type==="percentage"?p.discount_value+"%":money(p.discount_value))));card.append(node("p","Hali: "+p.status.replaceAll("_"," ")+" · "+new Date(p.starts_at).toLocaleDateString("sw-TZ")+" – "+new Date(p.expires_at).toLocaleDateString("sw-TZ")));if(p.admin_note)card.append(node("p","Ujumbe wa Admin: "+p.admin_note));box.append(card)});
}
init();