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
  await Promise.all([loadProducts(),loadSounds(),loadMyReels()]);
}
async function loadProducts(){
  const {data,error}=await db.from('products').select('id,title,price,stock_quantity').eq('vendor_id',ownerId).order('created_at',{ascending:false}).limit(300);
  if(error){console.warn('Seller Reel products:',error);return}
  const select=$('#productSelect');
  select.innerHTML='<option value="">Bila bidhaa maalumu</option>'+(data||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' — TSh '+Number(p.price||0).toLocaleString('en-TZ')+' · Stock '+Number(p.stock_quantity||0)+'</option>').join('');
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
    const payload={id,creator_id:ownerId,video_path:path,caption,hashtags,product_id:$('#productSelect').value||null,status:'pending',creator_display_name:storeName};
    const sound=sounds.get($('#soundSelect').value);
    if(sound){payload.sound_id=sound.id;payload.audio_source='library';payload.audio_title=sound.title;payload.audio_artist=sound.artist||null;}
    const {error:insertError}=await db.from('zune_reels').insert(payload);
    if(insertError)throw insertError;
    message.textContent='Reel imetumwa kwa Admin kwa ukaguzi.';
    reelForm.reset();$('#captionCount').textContent='0';clearUploadProgress();
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';
    $('#videoPreview').innerHTML='<div class="preview-placeholder"><span>▶</span><strong>Video preview</strong><small>Chagua video ili kuona preview hapa.</small></div>';
    toast('Reel imetumwa kwa ukaguzi.');
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