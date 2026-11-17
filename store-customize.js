import{boot,$,tr}from"./store-tools-core.js";
const PRESETS={
 classic:{forest:"#0b3026",emerald:"#168568",accent:"#e4c783"},
 modern:{forest:"#234b72",emerald:"#2878b8",accent:"#8dc8ef"},
 minimal:{forest:"#39443d",emerald:"#68766d",accent:"#c9cec9"},
 luxury:{forest:"#201b19",emerald:"#a47b42",accent:"#e6c98b"},
 bold:{forest:"#7d241c",emerald:"#e84b32",accent:"#ffc247"},
 nature:{forest:"#315b3e",emerald:"#668c55",accent:"#d6b66d"},
 pastel:{forest:"#79546c",emerald:"#b77d9d",accent:"#edc6d8"},
 editorial:{forest:"#3d352c",emerald:"#92734e",accent:"#d8c6a5"},
 tech:{forest:"#111d35",emerald:"#167d88",accent:"#73d8ce"},
 marketplace:{forest:"#126044",emerald:"#168568",accent:"#f0bd55"}
};
async function init(){
 try{
  const c=await boot(),store=c.store,cfg=store.theme_config&&typeof store.theme_config==="object"?store.theme_config:{},colors=cfg.colors||{};
  const state={template:PRESETS[store.storefront_template]?store.storefront_template:"classic",forest:colors.forest||"#0b3026",emerald:colors.emerald||"#168568",accent:colors.accent||"#e4c783",font:cfg.fontFamily||"DM Sans",layout:cfg.layout||"grid",mode:cfg.mode||"light"};
  $("#previewName").textContent=store.store_name||"Duka lako";
  $("#previewDescription").textContent=store.description||"Karibu kwenye duka letu la ZUNE.";
  $("#previewAbout").textContent=store.description||"Duka lako kwenye ZUNE Marketplace.";
  function paint(){
   const p=$("#previewStore");p.dataset.template=state.template;p.dataset.layout=state.layout;p.dataset.mode=state.mode;
   p.style.setProperty("--pforest",state.forest);p.style.setProperty("--pemerald",state.emerald);p.style.setProperty("--paccent",state.accent);p.style.fontFamily=state.font+",sans-serif";
   $("#previewCover").style.background=state.forest;
   $("#previewProducts").style.background=state.mode==="dark"?"#1b2d24":"#fff";
   $("#previewAbout").style.background=state.mode==="dark"?"#22372b":"#f4f7f4";
   $("#previewTemplateLabel").textContent=state.template.toUpperCase()+" · "+state.mode.toUpperCase();
   document.querySelectorAll(".template-option").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.template===state.template)));
   document.querySelectorAll("#layoutChoices button").forEach(b=>b.classList.toggle("active",b.dataset.layout===state.layout));
   document.querySelectorAll("#modeChoices button").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.mode));
   $("#forest").value=state.forest;$("#emerald").value=state.emerald;$("#accent").value=state.accent;$("#font").value=state.font;
  }
  document.querySelectorAll(".template-option").forEach(b=>b.addEventListener("click",()=>{state.template=b.dataset.template;Object.assign(state,PRESETS[state.template]);paint()}));
  ["forest","emerald","accent"].forEach(id=>$("#"+id).addEventListener("input",e=>{state[id]=e.target.value;paint()}));
  $("#font").addEventListener("change",e=>{state.font=e.target.value;paint()});
  document.querySelectorAll("#layoutChoices button").forEach(b=>b.addEventListener("click",()=>{state.layout=b.dataset.layout;paint()}));
  document.querySelectorAll("#modeChoices button").forEach(b=>b.addEventListener("click",()=>{state.mode=b.dataset.mode;paint()}));
  $("#resetPreview").addEventListener("click",()=>{state.template=PRESETS[store.storefront_template]?store.storefront_template:"classic";state.forest=colors.forest||"#0b3026";state.emerald=colors.emerald||"#168568";state.accent=colors.accent||"#e4c783";state.font=cfg.fontFamily||"DM Sans";state.layout=cfg.layout||"grid";state.mode=cfg.mode||"light";paint();$("#saveStatus").textContent=tr("Preview imerejeshwa kwenye muonekano uliohifadhiwa.","Preview reset to the saved appearance.")});
  $("#saveTheme").addEventListener("click",async()=>{const b=$("#saveTheme");b.disabled=true;$("#saveStatus").textContent=tr("Inahifadhi muonekano...","Saving appearance...");try{const theme_config={...cfg,colors:{...colors,forest:state.forest,emerald:state.emerald,accent:state.accent},fontFamily:state.font,layout:state.layout,mode:state.mode};await c.saveStore({theme_config,storefront_template:state.template});Object.assign(store,{theme_config,storefront_template:state.template});$("#saveStatus").textContent=tr("Muonekano umehifadhiwa. Wateja wataona mabadiliko haya kwenye duka lako.","Appearance saved. Customers will see these changes on your storefront.");c.message("Muonekano wa duka umehifadhiwa.","Store appearance saved successfully.",true)}catch(err){console.error(err);$("#saveStatus").textContent=err?.message||tr("Imeshindikana kuhifadhi. Hakikisha ruhusa za duka zipo.","Save failed. Check store permissions.");c.message("Imeshindikana kuhifadhi muonekano.","Could not save appearance.")}finally{b.disabled=false}});
  paint();
 }catch(e){console.error(e);const m=$("#message");if(m){m.textContent=tr("Imeshindikana kufungua Live Preview: ","Could not load Live Preview: ")+(e?.message||"Hitilafu");m.classList.add("show")}}
}
init();