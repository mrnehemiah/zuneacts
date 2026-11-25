import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const Upload=window.tus?.Upload;
if(!Upload)throw new Error('TUS browser library haijapakia. Refresh ukurasa kisha ujaribu tena.');
const URL='https://rpkogiieegqgxqbzwxwo.supabase.co';
const KEY='sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';
const db=createClient(URL,KEY,{auth:{storageKey:'zune-seller-portal-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
let ownerId='',authUserId='',uploadPermission=false,storeName='Duka langu',previewUrl='';
let activeTusUpload=null,activeTusFile=null,activeTusPath='';
const sounds=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)}
function statusLabel(s){return ({pending:'Inasubiri Admin',published:'Imechapishwa',rejected:'Imekataliwa',archived:'Imefichwa'}[s]||s)}
function setUploadProgress(percent,detail='Inatuma video kwa usalama...'){
  const wrap=$('#uploadProgress');
  if(!wrap)return;
  wrap.hidden=false;
  const value=Math.max(0,Math.min(100,Math.round(percent)));
  $('#uploadProgressFill').style.width=value+'%';
  $('#uploadProgressPercent').textContent=value+'%';
  $('#uploadProgressDetail').textContent=detail;
}
function clearUploadProgress(){
  const wrap=$('#uploadProgress');
  if(wrap)wrap.hidden=true;
  if($('#uploadProgressFill'))$('#uploadProgressFill').style.width='0%';
  if($('#uploadProgressPercent'))$('#uploadProgressPercent').textContent='0%';
}
async function uploadReelWithTus(file,proposedPath){
  const {data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session?.access_token)throw new Error('Session ya Seller imeisha. Ingia tena kisha ujaribu.');
  const endpoint='https://rpkogiieegqgxqbzwxwo.storage.supabase.co/storage/v1/upload/resumable';
  const makeUpload=objectPath=>new Upload(file,{
    endpoint,
    headers:{authorization:'Bearer '+session.access_token,apikey:KEY},
    metadata:{bucketName:'zune-reels',objectName:objectPath,contentType:file.type||'application/octet-stream',cacheControl:'3600'},
    chunkSize:6*1024*1024,
    retryDelays:[0,3000,5000,10000,20000],
    removeFingerprintOnSuccess:true,
    onProgress(bytesUploaded,bytesTotal){
      const percent=bytesTotal?bytesUploaded/bytesTotal*100:0;
      const sent=(bytesUploaded/1024/1024).toFixed(1),total=(bytesTotal/1024/1024).toFixed(1);
      setUploadProgress(percent,'Imepakiwa '+sent+' MB kati ya '+total+' MB');
    },
    onError(error){
      console.error('ZUNE TUS upload:',error);
      rejectUpload(error);
    },
    onSuccess(){
      setUploadProgress(100,'Video imefika ZUNE Storage. Inahifadhi taarifa za Reel...');
      activeTusUpload=null;activeTusFile=null;activeTusPath='';
      resolveUpload({path:objectPath});
    }
  });
  let resolveUpload,rejectUpload;
  const promise=new Promise((resolve,reject)=>{resolveUpload=resolve;rejectUpload=reject});
  let upload=makeUpload(proposedPath);
  const previous=await upload.findPreviousUploads();
  const resumable=previous.find(item=>item.metadata?.bucketName==='zune-reels'&&item.metadata?.objectName?.startsWith(authUserId+'/'));
  let targetPath=proposedPath;
  if(resumable){
    targetPath=resumable.metadata.objectName;
    upload=makeUpload(targetPath);
    upload.resumeFromPreviousUpload(resumable);
    setUploadProgress(0,'Muunganisho wa awali umepatikana. Inaendelea pale iliposimama...');
  }
  activeTusUpload=upload;activeTusFile=file;activeTusPath=targetPath;
  upload.start();
  await promise;
  return {path:targetPath};
}

async function init(){
  const {data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError||!session){location.replace('./index.html');return}
  const {data:owner,error:ownerError}=await db.rpc('zune_seller_owner_id');
  if(ownerError||!owner){$('#formMessage').textContent=ownerError?.message||'Akaunti ya Seller haijathibitishwa.';return}
  ownerId=owner;authUserId=session.user.id;
  const [{data:store},{data:profileRows,error:profileRpcError},{data:canUpload,error:canUploadError}]=await Promise.all([db.rpc('zune_seller_portal_current_store'),db.rpc('zune_seller_reel_profile'),db.rpc('zune_can_upload_reel')]);
  let profile=Array.isArray(profileRows)?profileRows[0]:profileRows;
  if(!profile&&ownerId===authUserId){const fallback=await db.from('profiles').select('is_verified,role').eq('id',ownerId).maybeSingle();profile=fallback.data;}
  if(profileRpcError)console.warn('Seller verification profile lookup:',profileRpcError);
  uploadPermission=canUpload===true;
  if(canUploadError)console.warn('Seller Reels permission check:',canUploadError);
  const current=Array.isArray(store)?store[0]:store;
  storeName=current?.store_name||current?.name||'Duka langu';
  $('#sellerBadge').textContent=profile?.is_verified===true?'Verified Seller':'Seller Account';
  if(!uploadPermission){$('#formMessage').textContent='Akaunti hii bado haina ruhusa ya kupakia Reels kulingana na RLS. Backend mapping ya Seller Portal inahitaji ukaguzi/idhini kabla ya kuendelea.';$('#publishBtn').disabled=true;}
  await Promise.all([loadProducts(),loadSounds(),loadMyReels(),mountMonetizationApplication(),mountReelChallenges()]);
}

async function mountMonetizationApplication(){
 const anchor=$('#myReels')||$('#publishBtn')?.closest('form');if(!anchor)return;
 let panel=$('#creatorMonetizationApplication');
 if(!panel){panel=document.createElement('section');panel.id='creatorMonetizationApplication';panel.style.cssText='margin:18px 0;padding:16px;border:1px solid #d9d2fe;border-radius:16px;background:#faf9ff;color:#17152b';anchor.insertAdjacentElement('beforebegin',panel);}
 panel.innerHTML='<strong>Creator Monetization</strong><p style="font-size:12px;color:#64748b;line-height:1.6">Omba kujiunga na mpango wa mapato wa ZUNE. Admin atakagua ombi lako; views zitahakikiwa kabla ya kuhesabiwa.</p><form id="creatorMonetizationForm"><textarea id="creatorMonetizationNote" maxlength="1200" rows="3" placeholder="Eleza aina ya maudhui unayounda (hiari)" style="width:100%;box-sizing:border-box;border:1px solid #d8dce8;border-radius:10px;padding:10px;background:#fff;color:#17152b"></textarea><button id="creatorMonetizationSubmit" type="submit" style="margin-top:9px;border:0;border-radius:10px;background:#7c3aed;color:#fff;padding:10px 14px;font-weight:800">Tuma ombi</button><span id="creatorMonetizationStatus" style="display:block;margin-top:8px;font-size:11px;color:#6d5bd0">Inakagua hali...</span></form>';
 const form=$('#creatorMonetizationForm'),button=$('#creatorMonetizationSubmit'),note=$('#creatorMonetizationNote'),status=$('#creatorMonetizationStatus');
 try{
  const {data,error}=await db.from('zune_creator_monetization_applications').select('id,status,application_note,review_note').eq('creator_id',ownerId).maybeSingle();if(error)throw error;
  if(data){status.textContent=({pending:'Inasubiri ukaguzi wa Admin',approved:'Umeidhinishwa',rejected:'Ombi limekataliwa — unaweza kutuma tena',suspended:'Imesimamishwa'})[data.status]||data.status;note.value=data.application_note||'';if(data.status==='approved'||data.status==='suspended'){form.hidden=true;return;}button.textContent=data.status==='rejected'?'Tuma ombi upya':'Sasisha ombi';}
  else status.textContent='Bado hujaomba';
  form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{const payload={creator_id:ownerId,status:'pending',application_note:note.value.trim()||null};const result=data?await db.from('zune_creator_monetization_applications').update(payload).eq('id',data.id):await db.from('zune_creator_monetization_applications').insert(payload);if(result.error)throw result.error;status.textContent='Ombi limetumwa — linasubiri ukaguzi wa Admin';form.hidden=true;toast('Ombi la Creator Monetization limetumwa.');}catch(err){toast(err.message||'Ombi halikutumwa.');button.disabled=false;}};
 }catch(err){status.textContent='Huduma haipatikani kwa sasa';console.warn('Creator monetization application:',err);}
}


async function mountReelChallenges(){
 const anchor=$('#myReels')||$('#publishBtn')?.closest('form');if(!anchor)return;
 let panel=$('#sellerReelChallenges');
 if(!panel){panel=document.createElement('section');panel.id='sellerReelChallenges';panel.style.cssText='margin:18px 0;padding:16px;border:1px solid #ddd6fe;border-radius:16px;background:#faf9ff;color:#17152b';anchor.insertAdjacentElement('beforebegin',panel);}
 panel.innerHTML='<strong>ZUNE Creator Challenges</strong><p style="font-size:12px;color:#64748b">Jiunge na challenge zinazoendelea kwa kuwasilisha Reel yako iliyochapishwa.</p><form id="sellerChallengeForm"><label style="display:block;font-size:12px;margin:8px 0">Challenge<select id="sellerChallengeSelect" required style="display:block;width:100%;padding:10px;border:1px solid #d8dce8;border-radius:10px;margin-top:5px"></select></label><label style="display:block;font-size:12px;margin:8px 0">Reel yako iliyochapishwa<select id="sellerChallengeReel" required style="display:block;width:100%;padding:10px;border:1px solid #d8dce8;border-radius:10px;margin-top:5px"></select></label><button type="submit" id="sellerChallengeSubmit" style="border:0;border-radius:10px;background:#7c3aed;color:#fff;padding:10px 14px;font-weight:800">Jiunge na Challenge</button></form><div id="sellerChallengeStatus" style="margin-top:10px;font-size:11px;color:#64748b"></div>';
 const challengeSelect=$('#sellerChallengeSelect'),reelSelect=$('#sellerChallengeReel'),status=$('#sellerChallengeStatus'),button=$('#sellerChallengeSubmit');
 try{
  const now=new Date().toISOString();
  const [challenges,reels,entries]=await Promise.all([
   db.from('zune_reel_challenges').select('id,title,hashtag,ends_at,reward_description').eq('status','active').lte('starts_at',now).gte('ends_at',now).order('ends_at').limit(100),
   db.from('zune_reels').select('id,caption,created_at').eq('creator_id',ownerId).eq('status','published').order('created_at',{ascending:false}).limit(100),
   db.from('zune_reel_challenge_entries').select('challenge_id,reel_id,status').eq('creator_id',ownerId)
  ]);
  if(challenges.error)throw challenges.error;if(reels.error)throw reels.error;if(entries.error)throw entries.error;
  challengeSelect.innerHTML='<option value="">Chagua challenge</option>'+(challenges.data||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.title)+' · #'+esc(x.hashtag)+'</option>').join('');
  reelSelect.innerHTML='<option value="">Chagua Reel iliyochapishwa</option>'+(reels.data||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc((x.caption||'Reel').slice(0,90))+'</option>').join('');
  const submitted=new Set((entries.data||[]).map(x=>x.challenge_id+':'+x.reel_id));
  status.textContent=(entries.data||[]).length?'Mawasilisho yako: '+entries.data.length+' · '+(entries.data||[]).map(x=>x.status).join(', '):'Bado hujajiunga na challenge.';
  if(!(challenges.data||[]).length||!(reels.data||[]).length){button.disabled=true;status.textContent=!(challenges.data||[]).length?'Hakuna challenge inayoendelea kwa sasa.':'Chapisha Reel kwanza ili uweze kujiunga.';}
  $('#sellerChallengeForm').onsubmit=async e=>{
   e.preventDefault();const challengeId=challengeSelect.value,reelId=reelSelect.value;if(!challengeId||!reelId)return;
   if(submitted.has(challengeId+':'+reelId)){toast('Reel hii tayari imewasilishwa kwenye challenge hii.');return;}
   button.disabled=true;
   try{const result=await db.from('zune_reel_challenge_entries').insert({challenge_id:challengeId,reel_id:reelId,creator_id:ownerId,status:'pending'});if(result.error)throw result.error;submitted.add(challengeId+':'+reelId);status.textContent='Reel yako imewasilishwa. Inasubiri ukaguzi wa Admin.';toast('Umejiunga na Creator Challenge.');}
   catch(err){toast(err.message||'Imeshindikana kujiunga.');button.disabled=false;}
  };
 }catch(err){status.textContent='Challenges hazipatikani kwa sasa.';console.warn('Seller Reel challenges:',err);}
}

async function loadProducts(){
  const {data,error}=await db.from('products').select('id,title,price,stock_quantity,image_url,moderation_status,removed_at,seller_archived_at').eq('vendor_id',ownerId).eq('moderation_status','approved').is('removed_at',null).is('seller_archived_at',null).order('created_at',{ascending:false}).limit(300);
  if(error){console.warn('Seller Reel products:',error);return}
  const rows=data||[];
  const select=$('#productSelect');
  select.innerHTML='<option value="">Bila bidhaa maalumu</option>'+rows.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — TSh '+Number(p.price||0).toLocaleString('en-TZ')+' · Stock '+Number(p.stock_quantity||0)+'</option>').join('');
  select.value='';
  select.style.display='none';
  let picker=$('#productTagPicker');
  if(!picker){
    picker=document.createElement('section');
    picker.id='productTagPicker';
    picker.style.cssText='margin-top:10px;padding:13px;border:1px solid #d8deea;border-radius:14px;background:#fff;color:#182033';
    select.insertAdjacentElement('afterend',picker);
  }
  picker.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px"><strong style="font-size:13px">Tag bidhaa kwenye Reel</strong><span id="productTagCount" style="font-size:11px;color:#64748b">0/10</span></div><p style="margin:0 0 10px;color:#64748b;font-size:11px">Chagua bidhaa zako zilizoidhinishwa. Unaweza kuchagua hadi bidhaa 10.</p><div id="productTagOptions" style="display:grid;gap:7px;max-height:230px;overflow:auto">'+(rows.length?rows.map(p=>'<label style="display:flex;gap:9px;align-items:center;padding:8px;border:1px solid #e6eaf1;border-radius:10px;font-size:12px"><input type="checkbox" value="'+esc(p.id)+'" data-product-tag style="width:17px;height:17px;accent-color:#7c3aed"><span style="min-width:0;flex:1"><strong style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.title)+'</strong><small style="color:#64748b">TSh '+Number(p.price||0).toLocaleString('en-TZ')+' · Stock '+Number(p.stock_quantity||0)+'</small></span></label>').join(''):'<small style="color:#64748b">Hakuna bidhaa zilizoidhinishwa zinazopatikana kwa sasa.</small>')+'</div>';
  const updateCount=()=>{
    const boxes=[...picker.querySelectorAll('[data-product-tag]')],selected=boxes.filter(x=>x.checked).length;
    const count=$('#productTagCount');if(count)count.textContent=selected+'/10';
    boxes.forEach(box=>{box.disabled=!box.checked&&selected>=10;box.closest('label').style.opacity=box.disabled?'.45':'1';});
  };
  picker.onchange=e=>{if(e.target.matches('[data-product-tag]'))updateCount();};
  updateCount();
}
function selectedReelProductIds(){
  return [...($('#productTagPicker')?.querySelectorAll('[data-product-tag]:checked')||[])].map(x=>x.value).slice(0,10);
}
async function loadSounds(){
  const select=$('#soundSelect');if(!select)return;
  const {data,error}=await db.from('zune_reel_sounds').select('id,title,artist').eq('is_active',true).eq('commercial_use_allowed',true).order('title').limit(100);
  if(error){select.innerHTML='<option value="">Music Library itafunguliwa baada ya backend kuidhinishwa</option>';return}
  (data||[]).forEach(sound=>sounds.set(sound.id,sound));
  select.innerHTML='<option value="">Tumia Original Audio ya video</option>'+(data||[]).map(sound=>'<option value="'+esc(sound.id)+'">'+esc(sound.title)+(sound.artist?' — '+esc(sound.artist):'')+'</option>').join('');
}
async function loadMyReels(){
  const {data,error}=await db.from('zune_reels').select('*').eq('creator_id',ownerId).order('created_at',{ascending:false}).limit(100);
  if(error){$('#myReels').innerHTML='<div class="empty-state">'+esc(error.message)+'</div>';return}
  const rows=data||[],ids=rows.map(x=>x.id);
  const [likes,comments]=await Promise.all([ids.length?db.from('zune_reel_likes').select('reel_id').in('reel_id',ids):Promise.resolve({data:[]}),ids.length?db.from('zune_reel_comments').select('reel_id').in('reel_id',ids):Promise.resolve({data:[]})]);
  const countBy=(list)=> (list||[]).reduce((m,x)=>{m[x.reel_id]=(m[x.reel_id]||0)+1;return m},{}),likeCounts=countBy(likes.data),commentCounts=countBy(comments.data);
  const totalViews=rows.reduce((n,x)=>n+Number(x.views_count||0),0),totalLikes=rows.reduce((n,x)=>n+(likeCounts[x.id]||0),0),totalComments=rows.reduce((n,x)=>n+(commentCounts[x.id]||0),0);
  $('#totalReels').textContent=rows.length;$('#publishedReels').textContent=rows.filter(x=>x.status==='published').length;$('#pendingReels').textContent=rows.filter(x=>x.status==='pending').length;
  $('#totalViews').textContent=totalViews.toLocaleString();$('#totalLikes').textContent=totalLikes.toLocaleString();$('#totalComments').textContent=totalComments.toLocaleString();
  $('#myReels').innerHTML=rows.length?rows.map(r=>{
    const url=db.storage.from('zune-reels').getPublicUrl(r.video_path).data.publicUrl;
    return '<article class="reel-row"><div class="reel-thumb"><video src="'+esc(url)+'" muted playsinline preload="metadata"></video></div><div class="reel-meta"><strong>'+esc(r.caption||'Reel ya bidhaa')+'</strong><small>'+Number(r.views_count||0).toLocaleString()+' views · '+(likeCounts[r.id]||0)+' likes · '+(commentCounts[r.id]||0)+' comments · '+Number(r.shares_count||0)+' shares</small></div><span class="status '+esc(r.status)+'">'+esc(statusLabel(r.status))+'</span></article>';
  }).join(''):'<div class="empty-state">Bado hujapakia Reel. Video yako ya kwanza inaweza kuonekana hapa.</div>';
  $('#myReels').querySelectorAll('video').forEach(video=>video.addEventListener('error',()=>{const host=video.closest('.reel-thumb');if(host)host.innerHTML='<div class="empty-state">Video haipatikani. Pakia upya kama bado unayo.</div>';},{once:true}));
}
$('#videoFile').addEventListener('change',()=>{
  const file=$('#videoFile').files?.[0],host=$('#videoPreview');
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl='';
  if(!file){host.innerHTML='<div class="preview-placeholder"><span>▶</span><strong>Video preview</strong><small>Chagua video ili kuona preview hapa.</small></div>';return}
  if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)){toast('Chagua MP4, WebM au MOV.');$('#videoFile').value='';return}
  if(file.size>100*1024*1024){toast('Video imezidi kiwango cha 100 MB.');$('#videoFile').value='';return}
  previewUrl=URL.createObjectURL(file);
  host.innerHTML='<video src="'+previewUrl+'" controls playsinline></video>';
});
$('#caption').addEventListener('input',()=>$('#captionCount').textContent=$('#caption').value.length);
$('#reelForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const reelForm=e.currentTarget;
  const file=$('#videoFile').files?.[0],caption=$('#caption').value.trim(),button=$('#publishBtn'),message=$('#formMessage');
  if(!file||!caption||!$('#rightsConfirm').checked)return;
  if(!ownerId){message.textContent='Akaunti ya Seller haijathibitishwa.';return}
  if(!uploadPermission){message.textContent='RLS haijaruhusu Seller Portal kupakia Reels. Upload imesitishwa hadi ruhusa ya backend ithibitishwe.';return}
  button.disabled=true;button.textContent='Inapakia video...';message.textContent='Tafadhali subiri. Video inapakiwa kwa vipande salama.';
  let path='',videoUploaded=false;
  try{
    let id=crypto.randomUUID();
    const ext=(file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');
    path=authUserId+'/'+id+'.'+ext;
    const upload=await uploadReelWithTus(file,path);
    path=upload.path;videoUploaded=true;
    id=path.split('/').pop().replace(/\.[^.]+$/,'');
    const hashtags=$('#hashtags').value.split(/[\s,]+/).map(x=>x.trim().replace(/^#/,'')).filter(Boolean).slice(0,20);
    const taggedProductIds=selectedReelProductIds();
    const payload={id,creator_id:ownerId,video_path:path,caption,hashtags,product_id:taggedProductIds[0]||null,status:'pending',creator_display_name:storeName};
    const sound=sounds.get($('#soundSelect').value);
    if(sound){payload.sound_id=sound.id;payload.audio_source='library';payload.audio_title=sound.title;payload.audio_artist=sound.artist||null;}
    const {error:insertError}=await db.from('zune_reels').insert(payload);
    if(insertError)throw insertError;
    videoUploaded=false;
    let tagWarning='';
    if(taggedProductIds.length){
      const {error:tagError}=await db.from('zune_reel_products').insert(taggedProductIds.map(product_id=>({reel_id:id,product_id})));
      if(tagError){console.error('ZUNE Reel product tags:',tagError);tagWarning=' Reel imehifadhiwa, lakini bidhaa hazikuunganishwa zote. Unaweza kujaribu tena baada ya refresh.';}
    }
    message.textContent=tagWarning?'Reel imetumwa kwa Admin kwa ukaguzi.'+tagWarning:'Reel imetumwa kwa Admin kwa ukaguzi.';
    reelForm.reset();$('#captionCount').textContent='0';clearUploadProgress();
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';
    $('#videoPreview').innerHTML='<div class="preview-placeholder"><span>▶</span><strong>Video preview</strong><small>Chagua video ili kuona preview hapa.</small></div>';
    toast(tagWarning?'Reel imehifadhiwa; product tags zina tatizo.':'Reel imetumwa kwa ukaguzi.');
    await loadMyReels();
  }catch(error){
    console.error('ZUNE Seller Reel upload:',error);
    if(path&&videoUploaded)await db.storage.from('zune-reels').remove([path]).catch(()=>{});
    const raw=String(error?.message||error||'');
    if(/failed to fetch|network|timeout|connection/i.test(raw)){
      message.textContent='Muunganisho umekatika wakati wa kupakia. Chagua faili hilohilo kisha bonyeza “Jaribu tena”; mfumo utaendelea pale iliposimama ikiwa sehemu zilizopakiwa bado zinapatikana.';
      button.textContent='Jaribu tena';
    }else{
      message.textContent=raw||'Imeshindikana kupakia Reel. Hakikisha akaunti yako ina ruhusa.';
      button.textContent='Jaribu tena';
    }
    if(!activeTusUpload)clearUploadProgress();
  }finally{
    button.disabled=false;
    if(button.textContent!=='Jaribu tena')button.textContent='Tuma Reel kwa ukaguzi';
  }
});
$('#refreshReels').addEventListener('click',loadMyReels);
$('#logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();location.replace('./index.html')});
init().catch(error=>{console.error(error);$('#formMessage').textContent=error.message||'Imeshindikana kuanzisha Reels Studio.'});