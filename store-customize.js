import{boot,$,tr}from"./store-tools-core.js";
async function init(){
 try{
  const c=await boot(),store=c.store,cfg=store.theme_config&&typeof store.theme_config==="object"?store.theme_config:{},colors=cfg.colors||{};
  const state={template:store.storefront_template||"classic",forest:colors.forest||"#0b3026",emerald:colors.emerald||"#168568",accent:colors.accent||"#e4c783",font:cfg.fontFamily||"DM Sans",layout:cfg.layout||"grid"};
  $("#previewName").textContent=store.store_name||"Duka lako";
  $("#previewDescription").textContent=store.description||"Karibu kwenye duka letu la ZUNE.";
  $("#previewAbout").textContent=store.description||"Duka lako kwenye ZUNE Marketplace.";
  function paint(){
   const p=$("#previewStore");p.dataset.template=state.template;p.dataset.layout=state.layout;
   p.style.setProperty("--pforest",state.forest);p.style.setProperty("--pemerald",state.emerald);p.style.setProperty("--paccent",state.accent);p.style.fontFamily=state.font+",sans-serif";
   $("#previewCover").style.background=state.forest;
   document.querySelectorAll(".preview-product small").forEach(e=>e.style.color=state.emerald);
   document.querySelectorAll(".preview-product-art").forEach(e=>e.style.background="linear-gradient(135deg,"+state.accent+"55,"+state.emerald+"33)");
   $("#previewTemplateLabel").textContent=state.template.toUpperCase();
   document.querySelectorAll("[data-template]").forEach(b=>{if(b.classList.contains("template-option"))b.setAttribute("aria-pressed",String(b.dataset.template===state.template))});
   document.querySelectorAll("[data-layout]").forEach(b=>{if(b.tagName==="BUTTON")b.classList.toggle("active",b.dataset.layout===state.layout)});
   $("#forest").value=state.forest;$("#emerald").value=state.emerald;$("#accent").value=state.accent;$("#font").value=state.font;
  }
  document.querySelectorAll(".template-option").forEach(b=>b.addEventListener("click",()=>{state.template=b.dataset.template;paint()}));
  ["forest","emerald","accent"].forEach(id=>$("#"+id).addEventListener("input",e=>{state[id]=e.target.value;paint()}));
  $("#font").addEventListener("change",e=>{state.font=e.target.value;paint()});
  document.querySelectorAll("#layoutChoices button").forEach(b=>b.addEventListener("click",()=>{state.layout=b.dataset.layout;paint()}));
  $("#resetPreview").addEventListener("click",()=>{state.template=store.storefront_template||"classic";state.forest=colors.forest||"#0b3026";state.emerald=colors.emerald||"#168568";state.accent=colors.accent||"#e4c783";state.font=cfg.fontFamily||"DM Sans";state.layout=cfg.layout||"grid";paint();$("#saveStatus").textContent=tr("Preview imerejeshwa kwenye muonekano uliohifadhiwa.","Preview reset to the saved appearance.")});
  $("#saveTheme").addEventListener("click",async()=>{const b=$("#saveTheme");b.disabled=true;$("#saveStatus").textContent=tr("Inahifadhi muonekano...","Saving appearance...");try{const theme_config={...cfg,colors:{...colors,forest:state.forest,emerald:state.emerald,accent:state.accent},fontFamily:state.font,layout:state.layout};await c.saveStore({theme_config,storefront_template:state.template});Object.assign(store, {theme_config,storefront_template:state.template});$("#saveStatus").textContent=tr("Muonekano umehifadhiwa. Wateja wataona mabadiliko haya kwenye duka lako.","Appearance saved. Customers will see these changes on your storefront.");c.message("Muonekano wa duka umehifadhiwa.","Store appearance saved successfully.",true)}catch(err){console.error(err);$("#saveStatus").textContent=err?.message||tr("Imeshindikana kuhifadhi. Hakikisha ruhusa za duka zipo.","Save failed. Check store permissions.");c.message("Imeshindikana kuhifadhi muonekano.","Could not save appearance.")}finally{b.disabled=false}});
  paint();
 }catch(e){console.error(e);const m=$("#message");if(m){m.textContent=tr("Imeshindikana kufungua Live Preview: ","Could not load Live Preview: ")+(e?.message||"Hitilafu");m.classList.add("show")}}
}
init();