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
    loading:"Please wait...", loginError:"Store name or password is incorrect."
  }
};

let lang = "sw";
const form = document.querySelector("#loginForm");
const nameField = document.querySelector("#storeName");
const passField = document.querySelector("#storePassword");
const message = document.querySelector("#formMessage");
const loginButton = document.querySelector("#loginButton");

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
  try { localStorage.setItem("zune-seller-language", next); } catch {}
}

document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", () => setLanguage(b.dataset.lang)));
document.querySelector("#togglePassword").addEventListener("click", () => {
  passField.type = passField.type === "password" ? "text" : "password";
  document.querySelector("#togglePassword").setAttribute("aria-label", passField.type === "password" ? "Onyesha password" : "Ficha password");
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

try { setLanguage(localStorage.getItem("zune-seller-language") === "en" ? "en" : "sw"); }
catch { setLanguage("sw"); }
