import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co";
const KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let ownerId="",storeId="",session=null;
function toast(s){const e=$("#toast");e.textContent=s;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),3200);}
$("#kind").addEventListener("change",()=>{$("#fileWrap").hidden=$("#kind").value==="text";$("#media").required=$("#kind").value!=="text";$("#media").accept=$("#kind").value==="video"?"video/mp4,video/webm,video/quicktime":"image/jpeg,image/png,image/webp,image/gif";});
async function init(){
 const {data:{session:s},error}=await db.auth.getSession();session=s;
 if(error||!session){location.replace("index.html");return;}
 const [{data:o,error:oe},{data:sid,error:se}]=await Promise.all([db.rpc("zune_seller_owner_id"),db.rpc("zune_seller_portal_current_store_id")]);
 if(oe||!o||se||!sid){toast("Imeshindikana kuthibitisha duka lako.");$("#list").textContent="Duka halijathibitishwa.";return;}
 ownerId=o;storeId=sid;await Promise.all([load(),loadProducts()]);
}
async function loadProducts(){
 const sel=$("#targetProduct");const {data,error}=await db.from("products").select("id,title").eq("vendor_id",ownerId).order("created_at",{ascending:false}).limit(200);
 if(error){console.warn("Status product picker:",error.message);return;}
 sel.innerHTML='<option value="">Hakuna bidhaa iliyochaguliwa</option>'+(data||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title||"Bidhaa")+"</option>").join("");
}
async function load(){
 $("#list").innerHTML='<p class="hint">Inapakia status na mwingiliano...</p>';
 const {data,error}=await db.from("zune_store_statuses").select("id,media_url,media_type,caption,created_at,expires_at,target_product_id").eq("store_id",storeId).eq("is_active",true).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false});
 if(error){toast(error.message);return;}
 if(!data?.length){$("#list").innerHTML='<p class="hint">Bado hujaweka status hai.</p>';return;}
 const ids=data.map(x=>x.id);
 const [viewsRes,likesRes,commentsRes]=await Promise.all([
  db.from("zune_store_status_views").select("status_id,viewer_id,viewed_at").in("status_id",ids),
  db.from("zune_status_likes").select("status_id,user_id,created_at").in("status_id",ids),
  db.from("zune_status_comments").select("id,status_id,user_id,comment,created_at").in("status_id",ids).order("created_at",{ascending:false}).limit(300)
 ]);
 const views=viewsRes.data||[],likes=likesRes.data||[],comments=commentsRes.data||[];
 if(likesRes.error)console.warn("Status likes:",likesRes.error.message);
 if(commentsRes.error)console.warn("Status comments:",commentsRes.error.message);
 const userIds=[...new Set([...likes.map(x=>x.user_id),...comments.map(x=>x.user_id),...views.map(x=>x.viewer_id)].filter(Boolean))];
 let profiles={};
 if(userIds.length){const p=await db.from("profiles").select("id,full_name").in("id",userIds);if(!p.error)(p.data||[]).forEach(x=>profiles[String(x.id)]=x.full_name||"Mteja ZUNE");}
 $("#list").innerHTML=data.map(st=>{
  const stViews=views.filter(v=>v.status_id===st.id),stLikes=likes.filter(v=>v.status_id===st.id),stComments=comments.filter(v=>v.status_id===st.id);
  const expiry=new Date(st.expires_at).toLocaleString("sw-TZ");
  const thumb=st.media_type==="image"?'<img class="thumb" src="'+esc(st.media_url)+'" alt="">':st.media_type==="video"?'<video class="thumb" src="'+esc(st.media_url)+'" muted playsinline></video>':'<div class="thumb text-thumb">Aa</div>';
  const commentMarkup=stComments.length?stComments.map(c=>'<div class="seller-comment"><strong>'+esc(profiles[String(c.user_id)]||"Mteja ZUNE")+'</strong><p>'+esc(c.comment)+'</p><small>'+new Date(c.created_at).toLocaleString("sw-TZ")+'</small></div>').join(""):'<p class="hint">Bado hakuna maoni kwenye status hii.</p>';
  const likedBy=stLikes.slice(0,12).map(x=>esc(profiles[String(x.user_id)]||"Mteja ZUNE")).join(", ");
  const viewers=stViews.slice(0,15).map(x=>'<span class="viewer-chip">'+esc(profiles[String(x.viewer_id)]||"Mtazamaji")+'</span>').join("");
  return '<article class="seller-status-card" data-status-card="'+esc(st.id)+'"><div class="item">'+thumb+'<div><strong>'+esc(st.caption||(st.media_type==="text"?"Status ya maandishi":st.media_type==="video"?"Status ya video":"Status ya picha"))+'</strong><small>Inaisha '+esc(expiry)+'</small></div><button class="delete" data-delete="'+esc(st.id)+'">Futa</button></div><div class="engagement-stats"><div><b>👁 '+stViews.length+'</b><small>Watazamaji</small></div><div><b>❤️ '+stLikes.length+'</b><small>Likes</small></div><div><b>💬 '+stComments.length+'</b><small>Maoni</small></div></div><details class="engagement-details"><summary>Ona waliolike, watazamaji na maoni</summary><h3>Waliolike</h3><p class="hint">'+(likedBy||"Bado hakuna Like.")+'</p><h3>Watazamaji</h3><div class="viewer-list">'+(viewers||'<span class="hint">Hakuna watazamaji bado.</span>')+'</div><h3>Maoni ya wateja</h3><div class="seller-comments">'+commentMarkup+'</div></details></article>';
 }).join("");
 document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>removeStatus(b.dataset.delete)));
}
async function removeStatus(id){
 if(!confirm("Una uhakika unataka kufuta status hii?"))return;
 const {data:st}=await db.from("zune_store_statuses").select("media_url,media_type").eq("id",id).eq("store_id",storeId).maybeSingle();
 const {error}=await db.from("zune_store_statuses").delete().eq("id",id).eq("owner_id",ownerId);
 if(error){toast(error.message);return;}
 if(st?.media_url&&st.media_type!=="text"){const marker="/storage/v1/object/public/zune-store-statuses/";const i=st.media_url.indexOf(marker);if(i>=0)await db.storage.from("zune-store-statuses").remove([decodeURIComponent(st.media_url.slice(i+marker.length))]);}
 toast("Status imefutwa.");await load();
}
$("#statusForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!ownerId||!storeId)return;
 const kind=$("#kind").value,file=$("#media").files[0],caption=$("#caption").value.trim(),targetProductId=$("#targetProduct")?.value||null;
 if(kind==="text"&&!caption){toast("Andika ujumbe wa status.");return;}
 if(kind!=="text"&&!file){toast("Chagua faili la status.");return;}
 if(file){const video=kind==="video";if(video&&!file.type.startsWith("video/")){toast("Chagua video sahihi.");return;}if(!video&&!file.type.startsWith("image/")){toast("Chagua picha sahihi.");return;}if(file.size>(video?50:10)*1024*1024){toast("Faili limezidi ukubwa unaoruhusiwa.");return;}}
 const btn=$("#publish");btn.disabled=true;btn.textContent="Inachapisha...";
 try{
  let mediaUrl=caption||"ZUNE";
  if(file){const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");const path=session.user.id+"/"+crypto.randomUUID()+"."+ext;const {error:up}=await db.storage.from("zune-store-statuses").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(up)throw up;mediaUrl=db.storage.from("zune-store-statuses").getPublicUrl(path).data.publicUrl;}
  const {error}=await db.from("zune_store_statuses").insert({store_id:storeId,owner_id:ownerId,media_url:mediaUrl,media_type:kind,caption:caption||null,target_product_id:targetProductId||null,expires_at:new Date(Date.now()+86400000).toISOString(),is_active:true});
  if(error)throw error;
  $("#statusForm").reset();$("#kind").value="image";$("#fileWrap").hidden=false;$("#media").required=true;toast("Status imechapishwa kwa saa 24.");await load();
 }catch(err){console.error(err);toast(err.message||"Imeshindikana kuchapisha status.");}
 finally{btn.disabled=false;btn.textContent="Chapisha Status";}
});
init();
