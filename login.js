const SUPABASE_URL = "https://rpkogiieegqgxqbzwxwo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const LOGIN_FUNCTION = "zunemar-seller-login";
const translations = {
  sw: {
    seller_portal:"SELLER PORTAL",brand_title:"Duka lako.<br>Biashara yako.<br><em>Udhibiti wako.</em>",
    brand_desc:"Simamia biashara yako ya ZUNE kwa sehemu moja, kwa usalama na urahisi.",
    secure_access:"Ufikiaji salama wa wauzaji",welcome_back:"KARIBU TENA",
    login_title:"Ingia kwenye duka lako",login_subtitle:"Tumia jina la duka na Store Password yako kuendelea.",
    store_name:"Jina la duka",store_password:"Store Password",forgot_password:"Umesahau password?",
    password_note:"Hii ni password ya ZUNEMAR pekee — si password ya ZUNE Marketplace.",
    login_button:"Ingia kwenye duka",approval_note:"Ni maduka yaliyoidhinishwa na Admin Mkuu pekee yanayoweza kuingia.",
    new_seller:"Huna duka la ZUNEMAR?",apply_link:"Omba kufungua duka",help:"Unahitaji msaada?",
    store_placeholder:"Mf. Zuri Fashion",password_placeholder:"Ingiza Store Password",
    missing:"Jaza jina la duka na Store Password.",pending:"Ombi lako bado linasubiri idhini ya Admin Mkuu.",
    rejected:"Ombi lako halijaidhinishwa. Wasiliana na msaada kwa maelezo.",
    unavailable:"Huduma ya login bado inaandaliwa. Jaribu tena baadaye.",
    failed:"Imeshindikana kuingia. Hakiki taarifa zako kisha ujaribu tena.",
    forgot:"Kwa sasa urejeshaji wa Store Password unahitaji uthibitisho wa umiliki wa duka. Tafadhali wasiliana na msaada."
  },
  en: {
    seller_portal:"SELLER PORTAL",brand_title:"Your store.<br>Your business.<br><em>Your control.</em>",
    brand_desc:"Manage your ZUNE business in one place, securely and with ease.",
    secure_access:"Secure seller access",welcome_back:"WELCOME BACK",
    login_title:"Sign in to your store",login_subtitle:"Continue with your store name and Store Password.",
    store_name:"Store name",store_password:"Store Password",forgot_password:"Forgot password?",
    password_note:"This is your ZUNEMAR password only — not your ZUNE Marketplace password.",
    login_button:"Sign in to store",approval_note:"Only stores approved by the Head Admin can sign in.",
    new_seller:"Don't have a ZUNEMAR store?",apply_link:"Apply to open a store",help:"Need help?",
    store_placeholder:"e.g. Zuri Fashion",password_placeholder:"Enter Store Password",
    missing:"Enter your store name and Store Password.",pending:"Your application is still waiting for Head Admin approval.",
    rejected:"Your application was not approved. Contact support for details.",
    unavailable:"The login service is still being prepared. Please try again later.",
    failed:"Unable to sign in. Check your details and try again.",
    forgot:"Store Password recovery requires proof of store ownership. Please contact support."
  }
};
let language = localStorage.getItem("zunemar-language") || "sw";
const form = document.querySelector("#loginForm");
const message = document.querySelector("#formMessage");
const button = document.querySelector("#loginButton");
const storeName = document.querySelector("#storeName");
const storePassword = document.querySelector("#storePassword");

function t(key){ return translations[language][key] || key; }
function setLanguage(next){
  language = next;
  localStorage.setItem("zunemar-language", next);
  document.documentElement.lang = next;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const value = t(el.dataset.i18n);
    if (value.includes("<br>") || value.includes("<em>")) el.innerHTML = value;
    else el.textContent = value;
  });
  storeName.placeholder = t("store_placeholder");
  storePassword.placeholder = t("password_placeholder");
  document.querySelectorAll(".lang-btn").forEach(el => el.classList.toggle("active",el.dataset.lang===next));
}
document.querySelectorAll(".lang-btn").forEach(el=>el.addEventListener("click",()=>setLanguage(el.dataset.lang)));
document.querySelector("#togglePassword").addEventListener("click",()=>{
  const visible = storePassword.type === "password";
  storePassword.type = visible ? "text" : "password";
  document.querySelector("#togglePassword").setAttribute("aria-label", visible ? "Hide password" : "Show password");
});
document.querySelector("#forgotBtn").addEventListener("click",()=>{message.textContent=t("forgot");message.classList.remove("success");});
form.addEventListener("submit",async event=>{
  event.preventDefault();
  message.textContent="";
  const name=storeName.value.trim();
  const password=storePassword.value;
  if(!name || !password){message.textContent=t("missing");return;}
  button.disabled=true;
  button.querySelector("span").textContent=language==="sw"?"Inaingia...":"Signing in...";
  try{
    const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data,error}=await supabase.functions.invoke(LOGIN_FUNCTION,{body:{store_name:name,store_password:password}});
    if(error) throw error;
    if(data?.status==="pending") throw new Error("APPLICATION_PENDING");
    if(data?.status==="rejected") throw new Error("APPLICATION_REJECTED");
    if(!data?.session?.access_token || !data?.session?.refresh_token) throw new Error("LOGIN_SERVICE_NOT_READY");
    const {error:sessionError}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
    if(sessionError) throw sessionError;
    if(data.redirect_url){window.location.assign(data.redirect_url);}
    else {throw new Error("LOGIN_SERVICE_NOT_READY");}
  }catch(error){
    const code=String(error?.message||"");
    if(code.includes("APPLICATION_PENDING")) message.textContent=t("pending");
    else if(code.includes("APPLICATION_REJECTED")) message.textContent=t("rejected");
    else if(code.includes("LOGIN_SERVICE_NOT_READY") || code.includes("FunctionsFetchError") || code.includes("404")) message.textContent=t("unavailable");
    else message.textContent=t("failed");
  }finally{
    button.disabled=false;
  button.querySelector("span").textContent=t("login_button");
  }
});
setLanguage(language);