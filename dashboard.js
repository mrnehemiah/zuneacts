import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://rpkogiieegqgxqbzwxwo.supabase.co",
  "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf",
  { auth: { storageKey: "zune-seller-portal-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

const $ = (selector) => document.querySelector(selector);
const content = $("#pageContent");
const toast = $("#toast");
let currentLanguage = localStorage.getItem("zune-seller-language") || "sw";
let toastTimer;

const copy = {
  sw: {
    workspace:"WORKSPACE",overview:"Muhtasari",products:"Bidhaa",orders:"Oda",analytics:"Takwimu",storeManagement:"USIMAMIZI WA DUKA",myStore:"Duka Langu",customers:"Wateja",verification:"Uthibitishaji",settings:"Mipangilio",needHelp:"Unahitaji msaada?",contactSupport:"Wasiliana na ZUNE",sellerWorkspace:"SELLER WORKSPACE",hello:"Habari",welcomeText:"Huu hapa muhtasari wa shughuli za duka lako leo.",yourStore:"DUKA LAKO",checking:"Inathibitisha...",verifiedStore:"Duka limethibitishwa",businessOverview:"Muhtasari wa biashara",overviewHint:"Takwimu zitaonekana hapa kadri shughuli zinavyofanyika.",accountConnected:"Akaunti imeunganishwa",totalProducts:"Jumla ya bidhaa",productsStatHint:"Bidhaa za duka lako",newOrders:"Oda mpya",ordersStatHint:"Zinazosubiri kushughulikiwa",sales:"Mauzo",salesStatHint:"Muhtasari wa mauzo",customersStat:"Wateja",customersStatHint:"Wateja wa duka lako",recentActivity:"Shughuli za hivi karibuni",activityHint:"Taarifa za oda na bidhaa zitaonekana hapa.",noActivity:"Bado hakuna shughuli",noActivityHint:"Shughuli mpya za duka lako zitaonekana hapa zitakapoanza.",quickAccess:"Njia za mkato",quickHint:"Fungua sehemu za usimamizi.",addProduct:"Ongeza bidhaa",addProductHint:"Weka bidhaa mpya dukani",manageOrders:"Simamia oda",manageOrdersHint:"Angalia oda za wateja",customizeStore:"Boresha duka",customizeStoreHint:"Badilisha muonekano wa duka",footerText:"Seller Portal · Biashara yako, kwa urahisi.",open:"Duka liko wazi",closed:"Duka limefungwa",unknown:"Hali ya duka haijapatikana",coming:"Sehemu hii bado inajengwa. Tutaifungua ikikamilika.",loadError:"Imeshindikana kupata taarifa za duka. Tafadhali jaribu kuingia tena.",signOut:"Toka",profile:"Taarifa za duka"
  },
  en: {
    workspace:"WORKSPACE",overview:"Overview",products:"Products",orders:"Orders",analytics:"Analytics",storeManagement:"STORE MANAGEMENT",myStore:"My Store",customers:"Customers",verification:"Verification",settings:"Settings",needHelp:"Need help?",contactSupport:"Contact ZUNE",sellerWorkspace:"SELLER WORKSPACE",hello:"Hello",welcomeText:"Here is an overview of your store activity today.",yourStore:"YOUR STORE",checking:"Checking...",verifiedStore:"Verified store",businessOverview:"Business overview",overviewHint:"Your statistics will appear here as activity takes place.",accountConnected:"Account connected",totalProducts:"Total products",productsStatHint:"Products in your store",newOrders:"New orders",ordersStatHint:"Waiting for your attention",sales:"Sales",salesStatHint:"Sales summary",customersStat:"Customers",customersStatHint:"Your store customers",recentActivity:"Recent activity",activityHint:"Order and product updates will appear here.",noActivity:"No activity yet",noActivityHint:"New activity from your store will appear here.",quickAccess:"Quick access",quickHint:"Open store management areas.",addProduct:"Add a product",addProductHint:"List a new product in your store",manageOrders:"Manage orders",manageOrdersHint:"View customer orders",customizeStore:"Customize store",customizeStoreHint:"Change your store appearance",footerText:"Seller Portal · Your business, made easier.",open:"Store is open",closed:"Store is closed",unknown:"Store status unavailable",coming:"This section is still being built. It will open when ready.",loadError:"Could not load store details. Please sign in again.",signOut:"Sign out",profile:"Store information"
  }
};

function t(key){ return copy[currentLanguage][key] || copy.sw[key] || key; }
function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function applyLanguage(){
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if(copy[currentLanguage][key]) el.textContent = copy[currentLanguage][key];
  });
  $("#languageToggle").innerHTML = (currentLanguage === "sw" ? "SW" : "EN") + " <span>⌄</span>";
  $("#breadcrumbCurrent").textContent = t("overview");
  localStorage.setItem("zune-seller-language", currentLanguage);
}
function safe(value){
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function niceDate(){
  return new Intl.DateTimeFormat(currentLanguage === "sw" ? "sw-TZ" : "en-GB", {weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
}
function setStore(store){
  const name = store.store_name || store.name || "ZUNE Seller";
  $("#sellerName").textContent = name;
  $("#storeName").textContent = name;
  $("#storeLocation").textContent = [store.category,store.district,store.region].filter(Boolean).join(" · ") || "ZUNE Seller Portal";
  const first = name.trim().charAt(0).toUpperCase() || "Z";
  $("#storeAvatar").innerHTML = store.logo_url ? '<img src="' + safe(store.logo_url) + '" alt="">' : safe(first);
  $("#profileButton").textContent = first;
  const status = String(store.store_status || store.status || "open").toLowerCase();
  const isClosed = ["closed","imefungwa","false","vacation"].includes(status);
  $("#storeStatus").classList.toggle("closed", isClosed);
  $("#storeStatus span").textContent = isClosed ? t("closed") : (["open","wazi","true","active"].includes(status) ? t("open") : t("unknown"));
  const verified = String(store.verification_status || "").toLowerCase() === "verified";
  $("#verifiedLabel").hidden = !verified;
}
function showModule(view){
  const names = {products:"products",orders:"orders",analytics:"analytics","my-store":"myStore",customers:"customers",verification:"verification",settings:"settings"};
  if(view === "overview"){ $("#breadcrumbCurrent").textContent = t("overview"); return; }
  showToast(t("coming"));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === "overview"));
  $("#breadcrumbCurrent").textContent = t(names[view] || "overview");
  $("#sidebar").classList.remove("open");
}
async function boot(){
  $("#todayDate").textContent = niceDate();
  applyLanguage();
  const {data:{session},error:sessionError} = await supabase.auth.getSession();
  if(sessionError || !session){ location.replace("./index.html"); return; }
  const {data,error} = await supabase.rpc("zune_seller_portal_current_store");
  const store = Array.isArray(data) ? data[0] : data;
  if(error || !store){
    content.innerHTML = '<div class="load-error">' + safe(t("loadError")) + '</div>';
    return;
  }
  setStore(store);
}
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => showModule(button.dataset.view)));
$("#languageToggle").addEventListener("click", () => { currentLanguage = currentLanguage === "sw" ? "en" : "sw"; applyLanguage(); $("#todayDate").textContent = niceDate(); });
$("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#profileButton").addEventListener("click", () => showToast(t("profile") + ": " + ($("#storeName").textContent || "")));
document.addEventListener("click", event => {
  if(window.innerWidth <= 760 && !event.target.closest("#sidebar") && !event.target.closest("#menuToggle")) $("#sidebar").classList.remove("open");
});
boot();
