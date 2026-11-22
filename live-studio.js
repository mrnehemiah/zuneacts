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
   message.textContent="Imeunganishwa: "+(result.channel_title||"YouTube channel")+".";
   button.textContent="✓ YouTube imeunganishwa";button.disabled=true;button.dataset.connected="true";
   $("#scheduleLive").disabled=false;$("#createLiveNow").disabled=false;
   $("#refreshLiveStatus").disabled=false;
   await loadLiveHistory();
  }else{
   message.textContent="Bado hujaunganisha YouTube channel.";button.textContent="▶ Unganisha YouTube";button.disabled=false;delete button.dataset.connected;
   $("#startLive").disabled=true;$("#scheduleLive").disabled=true;$("#createLiveNow").disabled=true;$("#showStreamKey").disabled=true;$("#refreshLiveStatus").disabled=true;
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

let currentBroadcast=null;
async function liveApi(payload){
 const response=await fetch(URL+"/functions/v1/youtube-live",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+sellerSession.access_token},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||"Ombi la YouTube Live halikukamilika.");
 return result;
}
function selectedProductIds(){return Array.from($("#products").selectedOptions).map(o=>o.value).filter(Boolean);}
function setLiveStatus(message,state="info",scroll=false){
 const node=$("#liveEventStatus");node.textContent=message;node.dataset.state=state;
 if(scroll)node.scrollIntoView({behavior:"smooth",block:"center"});
}
function showRtmp(config){
 if(!config?.ingestion_address||!config?.stream_key)throw new Error("Tukio limetengenezwa lakini RTMP haikurudishwa kikamilifu. Bonyeza Refresh hali kisha ujaribu Onyesha RTMP setup.");
 $("#rtmpAddress").textContent=config.ingestion_address;
 $("#rtmpKey").textContent=config.stream_key;
 $("#streamConfig").hidden=false;
 $("#streamConfig").scrollIntoView({behavior:"smooth",block:"center"});
}
async function createLive(scheduled){
 const title=$("#liveTitle").value.trim(),description=$("#liveDescription").value.trim();
 if(!title){setLiveStatus("Andika kichwa cha matangazo kwanza.","warning",true);$("#liveTitle").focus();return;}
 const time=$("#liveScheduleTime").value;
 if(scheduled&&!time){setLiveStatus("Chagua tarehe na muda wa Live iliyopangwa.","warning",true);$("#liveScheduleTime").focus();return;}
 const scheduledStart=time?new Date(time).toISOString():undefined;
 const createButton=$("#createLiveNow"),scheduleButton=$("#scheduleLive");
 createButton.disabled=true;scheduleButton.disabled=true;$("#startLive").disabled=true;$("#showStreamKey").disabled=true;
 setLiveStatus("Inatengeneza tukio la YouTube na RTMP stream… tafadhali subiri.","loading",true);
 try{
  const result=await liveApi({action:"create",title,description,privacy_status:$("#livePrivacy").value,scheduled_start_time:scheduledStart,product_ids:selectedProductIds(),resolution:"720p",frame_rate:"30fps"});
  if(!result.broadcast?.id)throw new Error("YouTube haikurudisha kitambulisho cha tukio. Angalia historia ya Live kabla ya kujaribu tena.");
  currentBroadcast=result.broadcast;showRtmp(result.rtmp);
  $("#startLive").textContent="▶ Anza Kutangaza";$("#showStreamKey").disabled=false;$("#stopLive").disabled=false;
  await loadLiveHistory();
  setLiveStatus("Imefanikiwa! Tukio limetengenezwa. Nakili Server URL na Stream key kwenye RTMP encoder (Larix au OBS), anza kutuma video, kisha bonyeza “Anza Kutangaza”.","success",true);
 }catch(error){setLiveStatus(error.message||"Imeshindikana kuunda Live. Angalia muunganisho wa YouTube.","error",true);}
 finally{createButton.disabled=false;scheduleButton.disabled=false;}
}
async function loadLiveHistory(){
 try{
  const result=await liveApi({action:"list"});
  const history=$("#liveHistory");history.replaceChildren();
  const broadcasts=result.broadcasts||[];
  const preferredId=currentBroadcast?.id;
  const open=(preferredId&&broadcasts.find(x=>x.id===preferredId&&!["complete","cancelled"].includes(x.broadcast_status)))||broadcasts.find(x=>!["complete","cancelled"].includes(x.broadcast_status));
  currentBroadcast=open||null;
  const isActive=!!open&&["live","testing"].includes(open.broadcast_status);
  setChatControlsEnabled(!!isActive);
  $("#stopLive").disabled=!open;
  $("#stopLive").textContent=isActive?"Maliza Live":"Futa Live iliyopangwa";
  $("#startLive").disabled=!open||isActive;
  $("#startLive").textContent=isActive?"● Live inaendelea":"▶ Anza Kutangaza";
  $("#showStreamKey").disabled=!open;
  (result.broadcasts||[]).slice(0,8).forEach(item=>{
   const p=document.createElement("p");
   p.textContent=item.title+" · "+item.broadcast_status+" · "+new Date(item.scheduled_start_time).toLocaleString("sw-TZ");
   history.append(p);
  });
  if(!currentBroadcast)$("#stopLive").disabled=true;
 }catch(error){$("#liveEventStatus").textContent=error.message;}
}
async function revealStreamConfig(){
 if(!currentBroadcast?.id){setLiveStatus("Tengeneza Live kwanza ili kupata RTMP setup.","warning",true);return;}
 $("#showStreamKey").disabled=true;setLiveStatus("Inachukua taarifa za RTMP kutoka YouTube…","loading",true);
 try{const result=await liveApi({action:"stream_config",broadcast_id:currentBroadcast.id});showRtmp(result.rtmp);setLiveStatus("RTMP setup iko tayari. Nakili Server URL na Stream key kwenye encoder yako.","success",true);}
 catch(error){setLiveStatus(error.message||"RTMP setup haikupatikana.","error",true);}
 finally{$("#showStreamKey").disabled=false;}
}
async function startBroadcast(){
 if(!currentBroadcast){setLiveStatus("Bado hakuna tukio la Live. Jaza kichwa cha matangazo kisha bonyeza “Tengeneza Live sasa”.","warning",true);$("#liveTitle").focus();return;}
 setLiveStatus("Inathibitisha kama YouTube inapokea video kutoka RTMP encoder…","loading",true);$("#startLive").disabled=true;
 try{const result=await liveApi({action:"start",broadcast_id:currentBroadcast.id});setLiveStatus((result.message||"YouTube imepokea ombi la kuanza matangazo.")+" Fungua YouTube kuthibitisha video.","success",true);$("#stopLive").disabled=false;}
 catch(error){setLiveStatus(error.message||"Matangazo hayajaanza. Hakikisha RTMP encoder inatuma video.","error",true);$("#startLive").disabled=false;}
}
async function refreshBroadcast(){
 if(!currentBroadcast){await loadLiveHistory();return;}
 try{const result=await liveApi({action:"status",broadcast_id:currentBroadcast.id});currentBroadcast={...currentBroadcast,...result.broadcast};$("#liveEventStatus").textContent="Hali ya Live: "+(result.broadcast?.broadcast_status||"haijulikani");await loadLiveHistory();}
 catch(error){$("#liveEventStatus").textContent=error.message;}
}
async function stopBroadcast(){
 if(!currentBroadcast?.id)return;
 const isLive=["live","testing"].includes(currentBroadcast.broadcast_status);
 if(!confirm(isLive?"Una uhakika unataka kumaliza matangazo haya?":"Una uhakika unataka kufuta Live hii iliyopangwa?"))return;
 try{
  const result=await liveApi({action:isLive?"stop":"cancel",broadcast_id:currentBroadcast.id});
  $("#liveEventStatus").textContent=result.message;$("#stopLive").disabled=true;currentBroadcast=null;await loadLiveHistory();
 }catch(error){$("#liveEventStatus").textContent=error.message;}
}
$("#startLive").addEventListener("click",startBroadcast);
$("#createLiveNow").addEventListener("click",()=>createLive(false));
$("#scheduleLive").addEventListener("click",()=>createLive(true));
$("#showStreamKey").addEventListener("click",revealStreamConfig);
$("#refreshLiveStatus").addEventListener("click",refreshBroadcast);
$("#stopLive").addEventListener("click",stopBroadcast);
$("#hideStreamKey").addEventListener("click",()=>{$("#rtmpKey").textContent="••••••••••••••••";$("#streamConfig").hidden=true;});
function chatModerationAvailable(){
 return !!currentBroadcast?.id&&["live","testing"].includes(currentBroadcast.broadcast_status);
}
function setChatControlsEnabled(enabled){
 const panel=$("#chatModerationPanel");
 panel.querySelectorAll("button, select").forEach(control=>{control.disabled=!enabled;});
}
function renderChatMessages(messages){
 const root=$("#liveChatMessages");root.replaceChildren();
 if(!messages.length){const p=document.createElement("p");p.className="empty-selection";p.textContent="Hakuna ujumbe wa kuonyesha kwa sasa.";root.append(p);return;}
 messages.forEach(item=>{
  const card=document.createElement("article");card.className="chat-message";
  const head=document.createElement("div");head.className="chat-message-head";
  const author=document.createElement("strong");author.textContent=item.author_name||"YouTube user";
  const date=document.createElement("small");date.textContent=item.published_at?new Date(item.published_at).toLocaleTimeString("sw-TZ",{hour:"2-digit",minute:"2-digit"}):"";
  head.append(author,date);
  const body=document.createElement("p");body.textContent=item.message||"[Ujumbe usio wa maandishi]";
  card.append(head,body);
  if(item.author_channel_id){
   const actions=document.createElement("div");actions.className="chat-message-actions";
   [["chat_delete","Futa ujumbe"],["chat_timeout","Timeout"],["chat_ban","Ban ya kudumu"]].forEach(([action,label])=>{
    const button=document.createElement("button");button.type="button";button.textContent=label;button.dataset.chatAction=action;button.dataset.channelId=item.author_channel_id;button.dataset.messageId=item.id;actions.append(button);
   });
   card.append(actions);
  }
  root.append(card);
 });
}
async function loadChatModeration(){
 if(!chatModerationAvailable()){$("#chatModerationStatus").textContent="Moderation inapatikana tu matangazo yanapokuwa LIVE.";setChatControlsEnabled(false);return;}
 setChatControlsEnabled(false);$("#chatModerationStatus").textContent="Inapakia YouTube Live Chat na orodha ya moderators…";
 try{
  const [chat,mods,bans]=await Promise.all([
   liveApi({action:"chat_list",broadcast_id:currentBroadcast.id}),
   liveApi({action:"chat_mod_list",broadcast_id:currentBroadcast.id}),
   liveApi({action:"chat_bans",broadcast_id:currentBroadcast.id})
  ]);
  renderChatMessages(chat.messages||[]);
  const modRoot=$("#liveChatModerators");modRoot.replaceChildren();
  (mods.moderators||[]).forEach(mod=>{
   const row=document.createElement("div");row.className="chat-admin-row";
   const name=document.createElement("span");name.textContent=mod.display_name||mod.channel_id;
   const remove=document.createElement("button");remove.type="button";remove.textContent="Ondoa";remove.dataset.moderatorRemove=mod.id;
   row.append(name,remove);modRoot.append(row);
  });
  if(!modRoot.children.length)modRoot.textContent="Hakuna moderators wa ziada.";
  const banRoot=$("#liveChatBans");banRoot.replaceChildren();
  (bans.bans||[]).forEach(ban=>{
   const row=document.createElement("div");row.className="chat-admin-row";
   const name=document.createElement("span");name.textContent=ban.channel_id+" · "+(ban.ban_type==="permanent"?"Permanent":"Temporary");
   const remove=document.createElement("button");remove.type="button";remove.textContent="Ondoa zuio";remove.dataset.banRemove=ban.id;
   row.append(name,remove);banRoot.append(row);
  });
  if(!banRoot.children.length)banRoot.textContent="Hakuna watumiaji waliozuiwa.";
  $("#chatModerationStatus").textContent="Chat imepakiwa. "+(chat.messages||[]).length+" ujumbe umeonekana.";
  setChatControlsEnabled(true);
 }catch(error){$("#chatModerationStatus").textContent=error.message||"Imeshindikana kupakia chat moderation.";setChatControlsEnabled(chatModerationAvailable());}
}
async function runChatAction(action,payload={}){
 if(!chatModerationAvailable()){$("#chatModerationStatus").textContent="Moderation inapatikana tu matangazo yanapokuwa LIVE.";return;}
 try{
  $("#chatModerationStatus").textContent="Inatekeleza moderation…";
  const result=await liveApi({action,broadcast_id:currentBroadcast.id,...payload});
  $("#chatModerationStatus").textContent=result.message||"Moderation imekamilika.";
  await loadChatModeration();
 }catch(error){$("#chatModerationStatus").textContent=error.message||"Moderation haikukamilika.";}
}
$("#refreshChat").addEventListener("click",loadChatModeration);
$("#addChatModerator").addEventListener("click",()=>{
 const channelId=$("#moderatorChannelId").value.trim();
 if(!channelId){$("#chatModerationStatus").textContent="Weka YouTube Channel ID ya moderator.";return;}
 runChatAction("chat_mod_add",{channel_id:channelId}).then(()=>{$("#moderatorChannelId").value="";});
});
$("#liveChatMessages").addEventListener("click",event=>{
 const button=event.target.closest("[data-chat-action]");if(!button)return;
 const action=button.dataset.chatAction;
 if(action==="chat_delete"){
  if(confirm("Una uhakika unataka kufuta ujumbe huu kwenye YouTube?"))runChatAction(action,{message_id:button.dataset.messageId});
 }else if(action==="chat_timeout"){
  const duration=Number($("#chatTimeoutDuration").value)||300;runChatAction(action,{channel_id:button.dataset.channelId,duration_seconds:duration});
 }else if(action==="chat_ban"){
  if(confirm("Zuia channel hii kabisa kwenye Live Chat?"))runChatAction(action,{channel_id:button.dataset.channelId});
 }
});
$("#liveChatModerators").addEventListener("click",event=>{
 const button=event.target.closest("[data-moderator-remove]");if(button&&confirm("Ondoa moderator huyu?"))runChatAction("chat_mod_remove",{moderator_id:button.dataset.moderatorRemove});
});
$("#liveChatBans").addEventListener("click",event=>{
 const button=event.target.closest("[data-ban-remove]");if(button&&confirm("Ondoa zuio hili?"))runChatAction("chat_unban",{ban_id:button.dataset.banRemove});
});


$("#connectYouTube").addEventListener("click",connectYouTube);
enableCamera.addEventListener("click",startPreview);
toggleMic.addEventListener("click",()=>{if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);toggleMic.textContent=muted?"🎙 Washa sauti":"🎙 Zima sauti";});
switchCamera.addEventListener("click",async()=>{facingMode=facingMode==="user"?"environment":"user";await startPreview();});
stopCamera.addEventListener("click",stopPreview);
window.addEventListener("pagehide",()=>{if(stream)stream.getTracks().forEach(t=>t.stop());});
async function init(){try{const{data:{session},error}=await db.auth.getSession();if(error||!session){location.replace("./index.html");return;}sellerSession=session;const{data:owner,error:ownerError}=await db.rpc("zune_seller_owner_id");if(ownerError||!owner)throw new Error("Imeshindikana kuthibitisha akaunti ya muuzaji.");sellerVerified=true;enableCamera.disabled=false;$("#connectYouTube").disabled=false;$("#youtubeConnectStatus").textContent="Akaunti ya Seller imethibitishwa. Inakagua YouTube…";await loadYouTubeStatus();await loadSellerProducts(owner);status.textContent="Akaunti imethibitishwa. YouTube Live imeunganishwa; kamera preview ni ya kifaa hiki pekee na broadcast hutumia RTMP encoder." ;status.dataset.state="warning";}catch(e){status.textContent=e.message||"Imeshindikana kuthibitisha huduma.";status.dataset.state="error";$("#youtubeConnectStatus").textContent="Muunganisho wa YouTube umefungwa hadi akaunti ya Seller ithibitishwe.";cameraStatus.textContent="Thibitisha akaunti ya muuzaji kabla ya kuwasha kamera.";}}
init();