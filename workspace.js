import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const supabase=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const modules={products:["Bidhaa","Manage products in your ZUNE store.","package"],orders:["Oda","Review and manage customer orders.","bag"],analytics:["Analytics","Business performance and sales analytics.","chart"],customers:["Wateja wangu","Customer relationships and customer history.","users"],store:["Muonekano wa duka","Store appearance, status and storefront settings.","store"],customize:["Customize Store","Personalize your storefront design.","star"],schedule:["Ratiba ya duka","Set opening hours and store schedule.","bell"],vacation:["Vacation Mode","Plan a temporary store break and reopening date.","store"],marketing:["Matangazo","Promote products and your store.","tag"],coupons:["Punguzo & Coupons","Create discounts and promotional offers.","tag"],messages:["Ujumbe","Customer messages and communication.","bell"],wallet:["Wallet","View balance and transaction history.","wallet"],reports:["Ripoti za mauzo","Review sales and business reports.","chart"],verification:["Uthibitishaji","Manage your store verification request.","shield-check"],downloads:["Pakua ripoti","Export and download business records.","file-check"],settings:["Mipangilio","Manage your seller workspace settings.","star"],security:["Usalama wa akaunti","Manage seller account security.","shield-check"]};
const key=new URLSearchParams(location.search).get("feature")||"products";
async function init(){
 const{data:{session},error}=await supabase.auth.getSession();
 if(error||!session){location.replace("./index.html");return}
 if(key==="products"){location.replace("products.html");return;}
 if(key==="orders"){location.replace("orders.html");return;}
 if(key==="analytics"){location.replace("analytics.html");return;}
 if(key==="store"){location.replace("store-appearance.html");return;}
 if(key==="customize"){location.replace("store-customize.html");return;}
 if(key==="schedule"){location.replace("store-schedule.html");return;}
 if(key==="vacation"){location.replace("store-vacation.html");return;}
 if(key==="reports"){location.replace("sales-reports.html");return;}
 if(key==="downloads"){location.replace("download-reports.html");return;}
 if(key==="customers"){location.replace("customers.html");return;}
 if(key==="messages"){location.replace("messages.html");return;}
 if(key==="marketing"){location.replace("ads.html");return;}
 if(key==="coupons"){location.replace("coupons.html");return;}
 if(key==="wallet"){location.replace("wallet.html");return;}
 if(key==="verification"){location.replace("verification.html");return;}
 if(key==="settings"||key==="security"){location.replace("seller-settings.html#"+key);return;}
 if(key==="store"){
  const{data:storeId,error:storeError}=await supabase.rpc("zune_seller_portal_current_store_id");
  if(storeError||!storeId){
   console.error("Storefront link lookup:",storeError);
   document.querySelector("#moduleTitle").textContent="Duka halijapatikana";
   document.querySelector("#moduleText").textContent="Imeshindikana kupata kiungo cha duka lako. Hakikisha duka limeidhinishwa na akaunti yako iko hai.";
   document.querySelector(".status").textContent="HAKUNA TAARIFA";
   return;
  }
  location.replace("storefront.html?store="+encodeURIComponent(storeId)+"&preview=1");
  return;
 }
 const item=modules[key]||["Business Tools","This workspace module is being prepared.","✦"];
 document.querySelector("#moduleTitle").textContent=item[0];
 document.querySelector("#moduleText").textContent=item[1];
 document.querySelector("#symbol").innerHTML='<svg class="icon" aria-hidden="true"><use href="#i-'+item[2]+'"/></svg>';
}
init();