import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const status=document.querySelector("#backendStatus");
async function init(){try{const{data:{session},error}=await db.auth.getSession();if(error||!session){location.replace("./index.html");return}const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");if(ownerError||!owner)throw new Error("Imeshindikana kuthibitisha akaunti ya muuzaji.");status.textContent="Akaunti imethibitishwa. Huduma ya Live Streaming bado haijaunganishwa na backend.";status.dataset.state="warning";}catch(e){status.textContent=e.message||"Imeshindikana kuthibitisha huduma.";status.dataset.state="error";}}
init();