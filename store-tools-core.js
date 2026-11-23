import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
export const supabase=createClient(SUPABASE_URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export const $=s=>document.querySelector(s);
export const lang=localStorage.getItem("zune-seller-language")==="en"?"en":"sw";
export const tr=(sw,en)=>lang==="en"?en:sw;
export function setLanguage(){document.documentElement.lang=lang;document.querySelectorAll("[data-sw]").forEach(e=>e.textContent=lang==="en"?(e.dataset.en||e.dataset.sw):e.dataset.sw);document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("active",b.dataset.lang===lang));document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>{localStorage.setItem("zune-seller-language",b.dataset.lang);location.reload()}))}
export async function boot(){
 setLanguage();
 const fail=(label,error)=>{const detail=error?.message||String(error||"Unknown error");console.error("[ZUNE store boot]",label,error);throw new Error(label+": "+detail)};
 const{data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError)fail("Session",sessionError);
 if(!session){location.replace("./index.html");throw new Error("No seller session");}
 let storeId=null;
 const{data:rpcStoreId,error:storeError}=await supabase.rpc("zune_seller_portal_current_store_id");
 if(!storeError)storeId=rpcStoreId;
 else console.warn("[ZUNE store boot] Store ID RPC unavailable; trying owner lookup.",storeError);
 let store=null;
 if(storeId){
  const{data,error}=await supabase.from("stores").select("id,owner_id,store_name,description,category,phone,email,website,logo_url,cover_image_url,storefront_template,store_status,vacation_reopen_at,theme_config,verification_status").eq("id",storeId).maybeSingle();
  if(error)fail("Store details",error);
  store=data;
 }
 if(!store){
  const{data,error}=await supabase.from("stores").select("id,owner_id,store_name,description,category,phone,email,website,logo_url,cover_image_url,storefront_template,store_status,vacation_reopen_at,theme_config,verification_status").eq("owner_id",session.user.id).limit(2);
  if(error)fail("Store lookup",error);
  if(!data?.length)throw new Error("Hakuna duka linalohusishwa na akaunti hii. Hakikisha umeingia kwa akaunti ya muuzaji.");
  if(data.length>1)throw new Error("Akaunti hii ina maduka zaidi ya moja; chaguo la duka linahitajika kabla ya kuhariri muonekano.");
  store=data[0];storeId=store.id;
 }
 const message=(sw,en,ok=false)=>{const el=$("#message");if(el){el.textContent=tr(sw,en);el.classList.add("show");el.style.background=ok?"#eaf5ed":"#fff0ed";el.style.color=ok?"#176b49":"#a13c32"}};
 const saveStore=async patch=>{const{data,error}=await supabase.from("stores").update(patch).eq("id",storeId).select("id").maybeSingle();if(error)throw error;if(!data)throw new Error("Supabase haikuruhusu kuhifadhi duka hili. Kagua ruhusa za RLS.");Object.assign(store,patch);return data};
 const uploadAsset=async(file,kind)=>{if(!file||!file.type.startsWith("image/"))throw new Error(tr("Chagua picha halali.","Choose a valid image."));if(file.size>8*1024*1024)throw new Error(tr("Picha isizidi MB 8.","Image must be 8 MB or less."));const ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"})[file.type];if(!ext)throw new Error(tr("Tumia JPG, PNG au WEBP.","Use JPG, PNG or WEBP."));const path=session.user.id+"/"+storeId+"/"+kind+"-"+Date.now()+"."+ext;const{data,error}=await supabase.storage.from("zune-store-assets").upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;return supabase.storage.from("zune-store-assets").getPublicUrl(data.path).data.publicUrl};
 return{session,storeId,store,saveStore,uploadAsset,message,supabase};
}