import { boot, $, tr } from "./store-tools-core.js";

let ctx, packages = [], campaigns = [];
const money = value => "TSh " + Number(value || 0).toLocaleString("en-TZ");
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusLabel = value => String(value || "—").replaceAll("_"," ");

function message(sw,en,ok=false){ ctx?.message(sw,en,ok); }
function renderRows(hostId, rows, empty, render){
 const host=$("#"+hostId); host.replaceChildren();
 if(!rows.length){const p=document.createElement("p");p.className="ads-muted";p.textContent=empty;host.append(p);return;}
 rows.forEach(row=>{const div=document.createElement("article");div.className="ads-row";div.innerHTML=render(row);host.append(div);});
}
async function load(){
 const owner=ctx.store.owner_id;
 const [pkgRes,productRes,campaignRes,walletRes,txRes,bidRes]=await Promise.all([
  ctx.supabase.from("ad_packages").select("id,name,description,campaign_type,duration_days,placements,price_tzs,pricing_model,cpc_floor_tzs,cpm_floor_tzs,commission_rate").eq("is_active",true).order("price_tzs"),
  ctx.supabase.from("products").select("id,title").eq("vendor_id",owner).is("removed_at",null).is("seller_archived_at",null).order("created_at",{ascending:false}),
  ctx.supabase.from("ad_campaigns").select("id,title,status,budget_tzs,spent_tzs,created_at,review_reason,placement,pricing_model,billing_mode,product_id").eq("seller_id",owner).order("created_at",{ascending:false}).limit(50),
  ctx.supabase.from("ads_wallets").select("available_tzs,pending_tzs,reserved_tzs").eq("seller_id",owner).maybeSingle(),
  ctx.supabase.from("ads_wallet_transactions").select("id,transaction_type,amount_tzs,status,reason,created_at").eq("seller_id",owner).order("created_at",{ascending:false}).limit(20),
  ctx.supabase.from("ad_auction_bids").select("id,campaign_id,bid_type,bid_amount_tzs,daily_budget_tzs,status,admin_reason,created_at").eq("seller_id",owner).order("created_at",{ascending:false}).limit(30)
 ]);
 for(const r of [pkgRes,productRes,campaignRes,walletRes,txRes,bidRes]) if(r.error) throw r.error;
 const campaignIds=(campaignRes.data||[]).map(x=>x.id).filter(Boolean);
 const eventRes=campaignIds.length
  ? await ctx.supabase.from("ad_events").select("campaign_id,event_type,cost_tzs,is_billable").in("campaign_id",campaignIds)
  : {data:[],error:null};
 if(eventRes.error)throw eventRes.error;
 packages=pkgRes.data||[];campaigns=campaignRes.data||[];
 const wallet=walletRes.data||{};
 $("#adsAvailable").textContent=money(wallet.available_tzs);
 $("#adsReserved").textContent=money(wallet.reserved_tzs);
 $("#adsCampaignCount").textContent=String(campaigns.length);
 const events=eventRes.data||[];
 $("#adsEngagement").textContent=events.filter(x=>x.event_type==="click").length+" / "+events.filter(x=>x.event_type==="impression").length;
 $("#adsSpend").textContent=money(events.filter(x=>x.is_billable).reduce((n,x)=>n+Number(x.cost_tzs||0),0));
 $("#adsConversions").textContent=String(events.filter(x=>x.event_type==="attributed_order").length);
 const pkg=$("#package");pkg.replaceChildren();
 if(!packages.length){pkg.add(new Option("Hakuna package inayopatikana",""));$("#submitAd").disabled=true;}
 else packages.forEach(x=>pkg.add(new Option(x.name+" · "+money(x.price_tzs)+" · "+x.duration_days+" siku",x.id)));
 const product=$("#product");product.replaceChildren(new Option("Tangazo la duka zima",""));
 (productRes.data||[]).forEach(x=>product.add(new Option(x.title,x.id)));
 function updatePlacements(){
  const x=packages.find(v=>v.id===pkg.value),select=$("#placement");select.replaceChildren();
  (x?.placements?.length?x.placements:["home"]).forEach(v=>select.add(new Option(v.replaceAll("_"," "),v)));
  $("#packageHint").textContent=x?(x.description||("Bei "+money(x.price_tzs)+" · "+x.duration_days+" siku · Commission "+Number(x.commission_rate||0)+"%")):"Chagua package";
  const mode=$("#pricingModel").value,auction=["auction","hybrid"].includes(mode),hybrid=mode==="hybrid";
  $("#billingMode").value=auction?"wallet":"campaign";
  $("#singleBidTypeField").classList.toggle("ads-hidden",!auction||hybrid);
  $("#singleBidAmountField").classList.toggle("ads-hidden",!auction||hybrid);
  $("#hybridCpcField").classList.toggle("ads-hidden",!hybrid);
  $("#hybridCpmField").classList.toggle("ads-hidden",!hybrid);
  $("#totalBudgetField").classList.toggle("ads-hidden",!auction);
  $("#dailyBudget").closest(".ads-field").classList.toggle("ads-hidden",!auction);
  $("#bidAmount").required=mode==="auction";$("#dailyBudget").required=auction;$("#totalBudget").required=auction;
  $("#hybridCpcBid").required=false;$("#hybridCpmBid").required=false;
 }
 pkg.addEventListener("change",updatePlacements);$("#pricingModel").addEventListener("change",updatePlacements);updatePlacements();
 renderRows("campaigns",campaigns,"Bado hujatengeneza kampeni.",x=>`<strong>${esc(x.title)}</strong><span class="ads-pill">${esc(statusLabel(x.status))}</span><small>${money(x.budget_tzs)} · ${esc(x.placement)} · ${esc(x.pricing_model||"fixed")} · ${new Date(x.created_at).toLocaleDateString("sw-TZ")}</small>${x.review_reason?`<small>Sababu ya Admin: ${esc(x.review_reason)}</small>`:""}`);
 renderRows("bids",bidRes.data||[],"Bado hujaweka zabuni.",x=>`<strong>${esc(x.bid_type.toUpperCase())} · ${money(x.bid_amount_tzs)}</strong><span class="ads-pill">${esc(statusLabel(x.status))}</span><small>Bajeti ya siku: ${money(x.daily_budget_tzs)} · ${new Date(x.created_at).toLocaleDateString("sw-TZ")}</small>${x.admin_reason?`<small>Maelezo: ${esc(x.admin_reason)}</small>`:""}`);
 renderRows("transactions",txRes.data||[],"Hakuna miamala ya Ads Wallet.",x=>`<strong>${esc(statusLabel(x.transaction_type))} · ${money(x.amount_tzs)}</strong><span class="ads-pill">${esc(statusLabel(x.status))}</span><small>${esc(x.reason||"")} · ${new Date(x.created_at).toLocaleDateString("sw-TZ")}</small>`);
}
async function init(){
 try{
  ctx=await boot();await load();
  $("#adForm").addEventListener("submit",async e=>{
   e.preventDefault();const button=$("#submitAd");button.disabled=true;
   try{
    const pkg=packages.find(x=>x.id===$("#package").value);if(!pkg)throw new Error("Chagua kifurushi.");
    const start=$("#startsAt").value?new Date($("#startsAt").value).toISOString():new Date().toISOString();
    const end=$("#endsAt").value?new Date($("#endsAt").value).toISOString():new Date(Date.now()+pkg.duration_days*86400000).toISOString();
    if(new Date(end)<=new Date(start))throw new Error("Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza.");
    const pricing=$("#pricingModel").value,auction=["auction","hybrid"].includes(pricing);
    const totalBudget=auction?Number($("#totalBudget").value):Number(pkg.price_tzs);
    const dailyBudget=auction?Number($("#dailyBudget").value):null;
    if(totalBudget<=0||totalBudget<(Number(pkg.price_tzs)||0))throw new Error("Bajeti yote lazima iwe angalau kiwango cha chini cha package.");
    if(auction&&(dailyBudget<=0||dailyBudget>totalBudget))throw new Error("Bajeti ya siku lazima iwe chanya na isizidi bajeti yote.");
    const payload={seller_id:ctx.store.owner_id,store_id:ctx.storeId,product_id:$("#product").value||null,package_id:pkg.id,campaign_type:pkg.campaign_type,placement:$("#placement").value,title:$("#title").value.trim(),creative_url:$("#creative").value.trim()||null,budget_tzs:totalBudget,starts_at:start,ends_at:end,status:"pending_review",pricing_model:pricing,billing_mode:$("#billingMode").value,attribution_window_days:7};
    const {data,error}=await ctx.supabase.from("ad_campaigns").insert(payload).select("id").single();if(error)throw error;
    if(pricing==="auction"){
     const bid=await ctx.supabase.rpc("zune_seller_place_ad_bid",{p_campaign_id:data.id,p_bid_type:$("#bidType").value,p_bid_amount_tzs:Number($("#bidAmount").value),p_daily_budget_tzs:dailyBudget,p_seller_note:"Submitted from Seller Ads Dashboard"});
     if(bid.error)throw bid.error;
    }else if(pricing==="hybrid"){
     const cpc=Number($("#hybridCpcBid").value||0),cpm=Number($("#hybridCpmBid").value||0),daily=Number($("#dailyBudget").value);
     if(cpc<=0&&cpm<=0)throw new Error("Weka angalau CPC bid au CPM bid.");
     if(cpc>0){const bid=await ctx.supabase.rpc("zune_seller_place_ad_bid",{p_campaign_id:data.id,p_bid_type:"cpc",p_bid_amount_tzs:cpc,p_daily_budget_tzs:daily,p_seller_note:"Hybrid CPC bid"});if(bid.error)throw bid.error;}
     if(cpm>0){const bid=await ctx.supabase.rpc("zune_seller_place_ad_bid",{p_campaign_id:data.id,p_bid_type:"cpm",p_bid_amount_tzs:cpm,p_daily_budget_tzs:daily,p_seller_note:"Hybrid CPM bid"});if(bid.error)throw bid.error;}
    }
    message("Kampeni imetumwa kwa Admin Mkuu kwa ukaguzi.","Campaign submitted to Admin Mkuu for review.",true);
    e.target.reset();await load();
   }catch(err){console.error(err);message(err.message||"Imeshindikana kutuma kampeni.","Could not submit campaign.");}
   finally{button.disabled=false;}
  });
 }catch(error){console.error(error);ctx?.message("Sponsored Ads haikuweza kufunguka. Hakikisha duka limeidhinishwa.","Sponsored Ads could not load. Confirm your store is approved.");}
}
init();