import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rpkogiieegqgxqbzwxwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const AUTH_URL = SUPABASE_URL + "/functions/v1/seller-portal-auth";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storageKey: "zune-seller-portal-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

const copy = {
  sw: {
    portal:"SELLER PORTAL", welcome:"KARIBU TENA", title:"Ingia kwenye duka lako",
    subtitle:"Tumia jina la duka na password yake kuendelea.", storeLabel:"Jina la duka",
    passwordLabel:"Password ya duka", forgot:"Umesahau password?", note:"Password hii ni ya duka la ZUNE pekee; si password ya ZUNE Marketplace.",
    login:"INGIA KWENYE DUKA", approval:"Ni wauzaji walioidhinishwa na Admin Mkuu pekee wanaoweza kuingia.",
    footer:"Duka jipya? Omba kufungua duka kupitia ZUNE Marketplace.", help:"Unahitaji msaada?",
    passwordPlaceholder:"Ingiza password ya duka", missing:"Jaza jina la duka na password.",
    firstSetup:"Mara ya kwanza? Tengeneza password ya duka",
    otpSent:"OTP imetumwa kwenye email ya maombi ya duka.", invalidPassword:"Password lazima iwe na angalau herufi/namba 4.",
    mismatch:"Password ulizoweka hazifanani.", otpMissing:"Weka OTP yenye tarakimu 6.",
    setupTitle:"Thibitisha email ya maombi", setupDescription:"Tutakutumia OTP kwenye email uliyotumia kuomba duka.",
    resetTitle:"Thibitisha umiliki wa duka", resetDescription:"Tutakutumia OTP kwenye email ya maombi ili kuweka password mpya.",
    complete:"THIBITISHA NA HIFADHI", resetComplete:"BADILISHA PASSWORD", back:"Rudi kwenye login",
    loading:"Tafadhali subiri...", loginError:"Jina la duka au password si sahihi."
  },
  en: {
    portal:"SELLER PORTAL", welcome:"WELCOME BACK", title:"Sign in to your store",
    subtitle:"Continue with your store name and its password.", storeLabel:"Store name",
    passwordLabel:"Store password", forgot:"Forgot password?", note:"This password is only for your ZUNE store, not your ZUNE Marketplace account.",
    login:"SIGN IN TO YOUR STORE", approval:"Only sellers approved by the Head Admin can sign in.",
    footer:"New store? Apply through ZUNE Marketplace.", help:"Need help?",
    passwordPlaceholder:"Enter your store password", missing:"Enter your store name and password.",
    firstSetup:"First time here? Create your store password",
    otpSent:"A verification code was sent to your application email.", invalidPassword:"Password must contain at least 4 characters.",
    mismatch:"The passwords do not match.", otpMissing:"Enter the 6-digit email code.",
    setupTitle:"Verify your application email", setupDescription:"We will send a code to the email used in your store application.",
    resetTitle:"Verify store ownership", resetDescription:"We will send a code to your application email so you can set a new password.",
    complete:"VERIFY AND SAVE", resetComplete:"CHANGE PASSWORD", back:"Back to sign in",
    loading:"Please wait...", loginError:"Store name or password is incorrect."
  }
};

let lang = "sw";
let setupMode = "setup";
const form = document.querySelector("#loginForm");
const nameField = document.querySelector("#storeName");
const passField = document.querySelector("#storePassword");
const message = document.querySelector("#formMessage");
const setupPanel = document.querySelector("#setupPanel");
const setupMessage = document.querySelector("#setupMessage");
const loginButton = document.querySelector("#loginButton");
const completeButton = document.querySelector("#completeSetupBtn");

async function callAuth(payload) {
  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || "Ombi halijakamilika.");
  return result;
}

function setLanguage(next) {
  lang = next;
  document.documentElement.lang = next;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (copy[lang][key]) el.textContent = copy[lang][key];
  });
  passField.placeholder = copy[lang].passwordPlaceholder;
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === next));
  document.querySelector("#setupTitle").textContent = setupMode === "reset" ? copy[lang].resetTitle : copy[lang].setupTitle;
  document.querySelector("#setupDescription").textContent = setupMode === "reset" ? copy[lang].resetDescription : copy[lang].setupDescription;
  document.querySelector("#completeSetupText").textContent = setupMode === "reset" ? copy[lang].resetComplete : copy[lang].complete;
  document.querySelector("#backToLoginBtn").textContent = copy[lang].back;
  try { localStorage.setItem("zune-seller-language", next); } catch {}
}

function showSetup(mode) {
  setupMode = mode;
  form.hidden = true;
  setupPanel.hidden = false;
  setupMessage.textContent = "";
  document.querySelector("#otpCode").value = "";
  document.querySelector("#newStorePassword").value = "";
  document.querySelector("#confirmStorePassword").value = "";
  setLanguage(lang);
}

async function requestCode(mode) {
  const storeName = nameField.value.trim();
  if (!storeName) {
    message.textContent = copy[lang].missing;
    nameField.focus();
    return;
  }
  message.textContent = "";
  const trigger = mode === "reset" ? document.querySelector("#forgotBtn") : document.querySelector("#firstSetupBtn");
  trigger.disabled = true;
  try {
    const result = await callAuth({ action: mode === "reset" ? "request-reset-otp" : "request-otp", store_name: storeName });
    showSetup(mode);
    setupMessage.textContent = result.email_hint
      ? (lang === "sw" ? "OTP imetumwa kwa " : "Code sent to ") + result.email_hint
      : result.message;
    setupMessage.classList.remove("error-message");
  } catch (error) {
    message.textContent = error.message;
  } finally {
    trigger.disabled = false;
  }
}

document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
document.querySelector("#togglePassword").addEventListener("click", () => {
  passField.type = passField.type === "password" ? "text" : "password";
  document.querySelector("#togglePassword").setAttribute("aria-label", passField.type === "password" ? "Onyesha password" : "Ficha password");
});
document.querySelector("#forgotBtn").addEventListener("click", () => requestCode("reset"));
document.querySelector("#firstSetupBtn").addEventListener("click", () => requestCode("setup"));
document.querySelector("#backToLoginBtn").addEventListener("click", () => {
  setupPanel.hidden = true;
  form.hidden = false;
  setupMessage.textContent = "";
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  const storeName = nameField.value.trim();
  const password = passField.value;
  if (!storeName || !password) {
    message.textContent = copy[lang].missing;
    return;
  }
  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = copy[lang].loading;
  try {
    const result = await callAuth({ action: "login", store_name: storeName, password });
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    });
    if (error) throw error;
    window.location.assign("./dashboard.html");
  } catch (error) {
    message.textContent = error.message || copy[lang].loginError;
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = copy[lang].login;
  }
});

completeButton.addEventListener("click", async () => {
  setupMessage.textContent = "";
  const storeName = nameField.value.trim();
  const otp = document.querySelector("#otpCode").value.trim();
  const password = document.querySelector("#newStorePassword").value;
  const confirm = document.querySelector("#confirmStorePassword").value;
  if (!/^\d{6}$/.test(otp)) {
    setupMessage.textContent = copy[lang].otpMissing;
    return;
  }
  if (password.length < 4 || password.length > 128) {
    setupMessage.textContent = copy[lang].invalidPassword;
    return;
  }
  if (password !== confirm) {
    setupMessage.textContent = copy[lang].mismatch;
    return;
  }
  completeButton.disabled = true;
  document.querySelector("#completeSetupText").textContent = copy[lang].loading;
  try {
    const result = await callAuth({
      action: setupMode === "reset" ? "reset-password" : "complete-setup",
      store_name: storeName, otp, password
    });
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    });
    if (error) throw error;
    window.location.assign("./dashboard.html");
  } catch (error) {
    setupMessage.textContent = error.message;
    setupMessage.classList.add("error-message");
  } finally {
    completeButton.disabled = false;
    document.querySelector("#completeSetupText").textContent = setupMode === "reset" ? copy[lang].resetComplete : copy[lang].complete;
  }
});

try { setLanguage(localStorage.getItem("zune-seller-language") === "en" ? "en" : "sw"); }
catch { setLanguage("sw"); }
