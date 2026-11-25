import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(SUPABASE_URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);let categories=[],selectedFiles=[],ownerId="",lang=localStorage.getItem("zune-seller-language")==="en"?"en":"sw";
const money=n=>new Intl.NumberFormat("en-TZ",{maximumFractionDigits:0}).format(Number(n)||0);
const toast=s=>{const el=$("#toast");el.textContent=s;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),3500)};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function setLang(next){lang=next;localStorage.setItem("zune-seller-language",next);document.documentElement.lang=next;document.querySelectorAll("[data-lang]").forEach(b=>b.classList.toggle("chosen",b.dataset.lang===next));document.querySelectorAll("[data-sw]").forEach(el=>{const en={"Rudi kwenye bidhaa":"Back to products","Ongeza bidhaa mpya":"Add a new product","Jaza taarifa za bidhaa yako ili ichapishwe dukani.":"Enter your product details to publish it in your store.","Jina la bidhaa":"Product name","Bei ya bidhaa (TSh)":"Price (TSh)","Idadi ya stock":"Stock quantity","Punguzo (%)":"Discount (%)","Bei baada ya punguzo":"Discounted price","Picha za bidhaa (hadi 20)":"Product photos (up to 20)","Chagua picha kutoka kwenye simu. Picha ya kwanza itaonekana kama picha kuu.":"Choose photos from your phone. The first photo will be the main image.","Aina ya bidhaa":"Category","Maelezo ya bidhaa":"Description","Ghairi":"Cancel","Hifadhi bidhaa":"Save product","Chaguo za bidhaa (hiari)":"Product variants (optional)","Ongeza rangi, ukubwa au aina tofauti zenye bei na stock zake.":"Add colors, sizes or options with their own prices and stock.","Ongeza variant":"+ Add variant","Mfano: Rangi Nyekundu / Size XL. Acha sehemu hii tupu kama bidhaa haina variants.":"Example: Red / Size XL. Leave empty if the product has no variants."};el.textContent=next==="sw"?el.dataset.sw:(en[el.dataset.sw]||el.dataset.sw)}document.querySelectorAll(".variant-row").forEach(row=>{row.querySelectorAll("[data-vlabel]").forEach(el=>el.placeholder=next==="sw"?"Mf. Rangi Nyekundu":"e.g. Red");row.querySelectorAll("[data-vsku]").forEach(el=>el.placeholder=next==="sw"?"SKU (hiari)":"SKU (optional)")})}
document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));setLang(lang);
async function loadCategories(){
 const sel=$("#categorySelect");
 sel.disabled=true;sel.setAttribute("aria-busy","true");
 sel.innerHTML='<option value="">Inapakia categories…</option>';
 const{data,error}=await db.from("product_categories").select("id,name,parent_id,sort_order").eq("is_active",true).order("sort_order",{ascending:true}).order("name",{ascending:true});
 if(error){
  console.error("Seller category load:",error);
  categories=[];
  sel.innerHTML='<option value="">Imeshindikana kupakia categories</option>';
  sel.disabled=true;
  let retry=$("#retryCategories");
  if(!retry){retry=document.createElement("button");retry.type="button";retry.id="retryCategories";retry.className="secondary";retry.style.marginTop="8px";sel.insertAdjacentElement("afterend",retry)}
  retry.textContent=lang==="sw"?"Jaribu kupakia tena":"Retry categories";
  retry.hidden=false;
  retry.onclick=async()=>{retry.disabled=true;retry.textContent=lang==="sw"?"Inajaribu…":"Retrying…";await loadCategories();retry.disabled=false};
  toast((lang==="sw"?"Categories hazijapakia: ":"Categories failed to load: ")+error.message);
  return false;
 }
 categories=(data||[]).filter(item=>item&&item.id&&item.name);
 const byParent=new Map();
 categories.forEach(item=>{const key=item.parent_id||null;if(!byParent.has(key))byParent.set(key,[]);byParent.get(key).push(item)});
 const options=[],visited=new Set();
 function walk(parentId,path,ancestors){
  (byParent.get(parentId)||[]).forEach(item=>{
   if(ancestors.has(item.id)||visited.has(item.id))return;
   visited.add(item.id);
   const next=new Set(ancestors);next.add(item.id);
   options.push('<option value="'+esc(item.id)+'">'+esc([...path,item.name].join(" › "))+'</option>');
   walk(item.id,[...path,item.name],next);
  });
 }
 walk(null,[],new Set());
 categories.filter(item=>!visited.has(item.id)).forEach(item=>{
  visited.add(item.id);
  options.push('<option value="'+esc(item.id)+'">'+esc(item.name)+'</option>');
  walk(item.id,[item.name],new Set([item.id]));
 });
 sel.innerHTML='<option value="">Chagua category / subcategory (' + categories.length + ')</option>'+options.join("");
 sel.disabled=categories.length===0;sel.setAttribute("aria-busy","false");
 const retry=$("#retryCategories");if(retry)retry.hidden=true;
 if(!categories.length){sel.innerHTML='<option value="">Hakuna category inayopatikana</option>';toast(lang==="sw"?"Hakuna category iliyo active.":"No active categories found.");return false}
 return true;
}
async function init(){
 const{data:{session},error}=await db.auth.getSession();
 if(error||!session){location.replace("./index.html");return}
 // Load categories independently so an owner lookup error cannot leave the selector stuck on "loading".
 const categoryTask=loadCategories();
 const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");
 if(ownerError||!owner){console.error("Seller owner lookup:",ownerError);toast((lang==="sw"?"Imeshindikana kuthibitisha duka: ":"Could not verify seller store: ")+(ownerError?.message||""));return}
 ownerId=owner;
 await categoryTask;
}
function preview(){const box=$("#imagePreview");box.replaceChildren();selectedFiles.forEach(file=>{const img=document.createElement("img");img.src=URL.createObjectURL(file);img.alt=file.name;box.append(img)})}
function addVariantRow(value={}){const row=document.createElement("div");row.className="variant-row";row.innerHTML='<label><span>'+(lang==="sw"?"Jina / chaguo":"Option label")+'</span><input data-vlabel required maxlength="120" placeholder="'+(lang==="sw"?"Mf. Rangi Nyekundu":"e.g. Red")+'" value="'+esc(value.label||"")+'"></label><label><span>SKU</span><input data-vsku maxlength="80" placeholder="'+(lang==="sw"?"SKU (hiari)":"SKU (optional)")+'" value="'+esc(value.sku||"")+'"></label><label><span>'+(lang==="sw"?"Bei (TSh)":"Price (TSh)")+'</span><input data-vprice type="number" min="1" step="1" required value="'+(value.price??"")+'"></label><label><span>'+(lang==="sw"?"Stock":"Stock")+'</span><input data-vstock type="number" min="0" step="1" required value="'+(value.stock_quantity??0)+'"></label><button type="button" class="variant-remove" aria-label="Remove variant">×</button>';row.querySelector(".variant-remove").addEventListener("click",()=>row.remove());$("#variantRows").append(row)}
function readVariants(){return [...document.querySelectorAll(".variant-row")].map(row=>({label:row.querySelector("[data-vlabel]").value.trim(),sku:row.querySelector("[data-vsku]").value.trim()||null,price:Number(row.querySelector("[data-vprice]").value),stock_quantity:Number(row.querySelector("[data-vstock]").value)}))}
function updatePrice(){const f=$("#productForm"),price=Number(f.querySelector('[name="price"]').value)||0,off=Math.min(100,Math.max(0,Number(f.querySelector('[name="discount_percent"]').value)||0)),out=$("#discountedPrice");if(!price){out.value="";out.placeholder=lang==="sw"?"Weka bei ya kawaida kwanza":"Enter the regular price first";return}const discounted=Math.round(price*(1-off/100));out.value="TSh "+money(discounted);out.dataset.discountedPrice=String(discounted)}
$("#addVariant").type="button";$("#addVariant").addEventListener("click",e=>{e.preventDefault();addVariantRow();const rows=$("#variantRows");rows.lastElementChild?.querySelector("[data-vlabel]")?.focus()});
$("#productImages").addEventListener("change",e=>{const files=Array.from(e.target.files||[]);if(files.length>20){e.target.value="";selectedFiles=[];preview();toast("Jumla ya picha zisizidi 20");return}const invalid=files.find(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>8*1024*1024);if(invalid){e.target.value="";selectedFiles=[];preview();toast("Tumia JPG, PNG au WEBP; kila picha isizidi MB 8");return}selectedFiles=files;preview()});
$("#productForm").querySelectorAll('[name="price"],[name="discount_percent"]').forEach(input=>{input.addEventListener("input",updatePrice);input.addEventListener("change",updatePrice)});updatePrice();
$("#productForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,category=categories.find(x=>x.id===f.elements.category_id.value),parent=category?.parent_id?categories.find(x=>x.id===category.parent_id):category,discount=Math.min(100,Math.max(0,Number(f.elements.discount_percent.value)||0)),variants=readVariants(),values={title:f.elements.title.value.trim(),price:Number(f.elements.price.value),stock_quantity:Number(f.elements.stock_quantity.value),category:parent?.name||category?.name||"",category_id:category?.id||null,description:f.elements.description.value.trim()||null,discount_percent:discount,is_deal:false};if(!ownerId||!values.title||!values.category||values.price<=0||values.stock_quantity<0){toast("Tafadhali hakiki taarifa zote za bidhaa.");return}if(variants.some(v=>!v.label||!Number.isFinite(v.price)||v.price<=0||!Number.isInteger(v.stock_quantity)||v.stock_quantity<0)){toast("Kagua majina, bei na stock za variants.");return}const skus=variants.map(v=>v.sku).filter(Boolean);if(new Set(skus).size!==skus.length){toast("Kila SKU lazima iwe tofauti.");return}if(variants.length){values.price=Math.min(...variants.map(v=>v.price));values.stock_quantity=variants.reduce((sum,v)=>sum+v.stock_quantity,0)}const btn=$("#saveProduct");btn.disabled=true;btn.textContent=lang==="sw"?"Inahifadhi…":"Saving…";try{const{data:{session}}=await db.auth.getSession();if(!session)throw new Error("Session imeisha. Ingia tena.");const urls=[];for(const file of selectedFiles){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=session.user.id+"/"+crypto.randomUUID()+"-"+safe,{error}=await db.storage.from("product-images").upload(path,file,{cacheControl:"3600",upsert:false});if(error)throw error;urls.push(db.storage.from("product-images").getPublicUrl(path).data.publicUrl)}const{data:product,error}=await db.from("products").insert({...values,vendor_id:ownerId,image_urls:urls,image_url:urls[0]||null,moderation_status:"approved",published_at:new Date().toISOString(),is_featured:false}).select("id").single();if(error)throw error;if(variants.length){const rows=variants.map((v,index)=>({product_id:product.id,label:v.label,sku:v.sku,attributes:{option:v.label},price:v.price,stock_quantity:v.stock_quantity,is_active:true,sort_order:index}));const{error:variantError}=await db.from("product_variants").insert(rows);if(variantError){await db.from("products").update({seller_archived_at:new Date().toISOString()}).eq("id",product.id).eq("vendor_id",ownerId);throw new Error("Bidhaa imehifadhiwa kwa usalama lakini variants hazikuhifadhiwa; bidhaa imefichwa kwa muda. "+variantError.message)}}toast(lang==="sw"?"Bidhaa na variants zimehifadhiwa dukani.":"Product and variants saved.");setTimeout(()=>location.href="products.html",800)}catch(err){console.error(err);toast(err.message||"Imeshindikana kuhifadhi bidhaa.");btn.disabled=false;btn.textContent=lang==="sw"?"Hifadhi bidhaa":"Save product"}});
init();