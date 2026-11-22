import{createClient}from"https://esm.sh/@supabase/supabase-js@2";
const URL="https://rpkogiieegqgxqbzwxwo.supabase.co",KEY="sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf";
const db=createClient(URL,KEY,{auth:{storageKey:"zune-seller-portal-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
const status=$("#backendStatus"),cameraStatus=$("#cameraStatus"),video=$("#cameraPreview");
const enableCamera=$("#enableCamera"),toggleMic=$("#toggleMic"),switchCamera=$("#switchCamera"),stopCamera=$("#stopCamera");
let stream=null,muted=false,facingMode="user",sellerVerified=false,availableProducts=[],sellerSession=null;
function cameraControls(enabled){[enableCamera,toggleMic,switchCamera,stopCamera].forEach(b=>b.disabled=!enabled);}
function stopPreview(){if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}video.srcObject=null;video.classList.remove("is-visible");$("#cameraPlaceholder").hidden=false;$("#previewState").textContent="PREVIEW HAJAANZA";cameraControls(sellerVerified);enableCamera.disabled=!sellerVerified;toggleMic.disabled=true;switchCamera.disabled=true;stopCamera.disabled=true;cameraStatus.textContent="Kamera imezimwa. Hakuna video inayotumwa kwa watazamaji.";}
async function startPreview(){if(!sellerVerified)return;if(!navigator.mediaDevices?.getUserMedia){cameraStatus.textContent="Browser hii haitoi ruhusa ya kamera. Fungua ukurasa kupitia HTTPS na browser inayotumika.";return;}enableCamera.disabled=true;cameraStatus.textContent="Inaomba ruhusa ya kamera na kipaza sauti…";try{if(stream)stream.getTracks().forEach(t=>t.stop());stream=await navigator.mediaDevices.getUserMedia({audio:true,video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:720}}});video.srcObject=stream;await video.play();video.classList.add("is-visible");$("#cameraPlaceholder").hidden=true;$("#previewState").textContent="CAMERA PREVIEW";muted=false;toggleMic.textContent="🎙 Zima sauti";cameraControls(true);cameraStatus.textContent="Preview iko tayari kwenye kifaa hiki pekee. Bado hujaanza kutangaza kwa watazamaji."; }catch(e){cameraStatus.textContent=e.name==="NotAllowedError"?"Ruhusa ya kamera/mikrofoni imekataliwa. Ruhusu kwenye mipangilio ya browser kisha ujaribu tena.":e.name==="NotFoundError"?"Hakuna kamera au kipaza sauti kilichopatikana kwenye kifaa hiki.":"Imeshindikana kuwasha kamera: "+(e.message||"jaribu tena.");enableCamera.disabled=false;}}
async function loadSellerProducts(ownerId){
 const select=$("#products"),count=$("#productSelectionCount"),preview=$("#selectedProductPreview");
 select.disabled=true;select.replaceChildren(new Option("Inapakia bidhaa…",""));
 try{
  const{data,error}=await db.from("products").select("id,title,price,image_url,image_urls,stock_quantity,moderation_status,published_at,removed_at,seller_archived_at").eq("vendor_id",ownerId).eq("moderation_status","approved").not("published_at","is",null).is("removed_at",null).is("seller_archived_at",null).order("created_at",{ascending:false}).limit(500);
  if(error)throw error;
  availableProducts=data||[];
  select.replaceChildren();
  if(!availableProducts.length){select.add(new Option("Hakuna bidhaa zilizochapishwa kwa sasa",""));select.disabled=true;count.textContent="0 zimechaguliwa";preview.textContent="Hakuna bidhaa zilizochapishwa zinazoweza kuchaguliwa.";return;}
  availableProducts.forEach(p=>select.add(new Option((p.title||"Bidhaa bila jina")+" · TSh "+new Intl.NumberFormat("en-TZ",{maximumFractionDigits:0}).format(Number(p.price)||0),p.id)));
  select.disabled=false;
  select.addEventListener("change",renderSelectedProducts);
  renderSelectedProducts();
 }catch(error){
  console.warn("Live product preparation:",error);
  select.replaceChildren(new Option("Bidhaa hazikuweza kupakiwa. Jaribu tena baadaye.",""));
  select.disabled=true;count.textContent="Haijapatikana";preview.textContent="Imeshindikana kusoma bidhaa za duka. Hakuna data ya mfano itakayoonyeshwa.";
 }
}
function renderSelectedProducts(){
 const select=$("#products"),count=$("#productSelectionCount"),preview=$("#selectedProductPreview");
 const ids=Array.from(select.selectedOptions).map(o=>o.value).filter(Boolean);
 const selected=availableProducts.filter(p=>ids.includes(p.id));
 count.textContent=selected.length+" zimechaguliwa";
 preview.replaceChildren();
 if(!selected.length){const empty=document.createElement("span");empty.className="empty-selection";empty.textContent="Bado hujachagua bidhaa.";preview.append(empty);return;}
 selected.forEach(p=>{const item=document.createElement("div");item.className="selected-product";const image=p.image_url||(Array.isArray(p.image_urls)?p.image_urls[0]:"");if(image){const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";item.append(img);}const meta=document.createElement("span");meta.textContent=p.title||"Bidhaa";item.append(meta);preview.append(item);});
}
async function loadYouTubeStatus(){
 const message=$("#youtubeConnectStatus"),button=$("#connectYouTube");
 try{
  const response=await fetch("https://rpkogiieegqgxqbzwxwo.supabase.co/functions/v1/youtube-oauth",{
   method:"POST",
   headers:{ "Content-Type":"application/json", "apikey":KEY, "Authorization":"Bearer "+sellerSession.access_token },
   body:JSON.stringify({action:"status"})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||"Hali ya YouTube haikuweza kusomwa.");
  if(result.connected){
   message.textContent="Imeunganishwa: "+(result.channel_title||"YouTube channel")+". Unaweza kuendelea na hatua za maandalizi ya Live.";
   button.textContent="✓ YouTube imeunganishwa";button.disabled=true;button.dataset.connected="true";
  }else{
   message.textContent="Bado hujaunganisha YouTube channel.";button.textContent="▶ Unganisha YouTube";button.disabled=false;delete button.dataset.connected;
  }
 }catch(error){message.textContent=error.message||"Hali ya muunganisho haijapatikana.";}
}
async function connectYouTube(){
 const button=$("#connectYouTube"),message=$("#youtubeConnectStatus");
 if(!sellerVerified||!sellerSession?.access_token){message.textContent="Ingia tena kwenye akaunti ya Seller kisha ujaribu.";return;}
 button.disabled=true;message.textContent="Inaandaa muunganisho salama wa Google…";
 try{
  const response=await fetch("https://rpkogiieegqgxqbzwxwo.supabase.co/functions/v1/youtube-oauth",{
   method:"POST",
   headers:{ "Content-Type":"application/json", "apikey":KEY, "Authorization":"Bearer "+sellerSession.access_token },
   body:JSON.stringify({action:"start"})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.authorization_url)throw new Error(result.error||"Imeshindikana kuanzisha OAuth. Jaribu tena.");
  message.textContent="Unaelekezwa Google ili uthibitishe channel yako…";
  location.assign(result.authorization_url);
 }catch(error){
  message.textContent=error.message||"Hitilafu ya muunganisho imetokea.";
  button.disabled=false;
 }
}
$("#connectYouTube").addEventListener("click",connectYouTube);
enableCamera.addEventListener("click",startPreview);
toggleMic.addEventListener("click",()=>{if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);toggleMic.textContent=muted?"🎙 Washa sauti":"🎙 Zima sauti";});
switchCamera.addEventListener("click",async()=>{facingMode=facingMode==="user"?"environment":"user";await startPreview();});
stopCamera.addEventListener("click",stopPreview);
window.addEventListener("pagehide",()=>{if(stream)stream.getTracks().forEach(t=>t.stop());});
async function init(){try{const{data:{session},error}=await db.auth.getSession();if(error||!session){location.replace("./index.html");return;}sellerSession=session;const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");if(ownerError||!owner)throw new Error("Imeshindikana kuthibitisha akaunti ya muuzaji.");sellerVerified=true;enableCamera.disabled=false;$("#connectYouTube").disabled=false;$("#youtubeConnectStatus").textContent="Akaunti ya Seller imethibitishwa. Inakagua YouTube…";await loadYouTubeStatus();await loadSellerProducts(owner);status.textContent="Akaunti imethibitishwa. Unaweza kuwasha kamera kwa preview; huduma ya kutangaza bado inaunganishwa.";status.dataset.state="warning";}catch(e){status.textContent=e.message||"Imeshindikana kuthibitisha huduma.";status.dataset.state="error";$("#youtubeConnectStatus").textContent="Muunganisho wa YouTube umefungwa hadi akaunti ya Seller ithibitishwe.";cameraStatus.textContent="Thibitisha akaunti ya muuzaji kabla ya kuwasha kamera.";}}
init();