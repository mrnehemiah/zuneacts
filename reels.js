import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const URL='https://rpkogiieegqgxqbzwxwo.supabase.co';
const KEY='sb_publishable_2TEqZv-NBM9n5knU46ngqA_wqO3V1uf';
const db=createClient(URL,KEY,{auth:{storageKey:'zune-seller-portal-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=s=>document.querySelector(s);
let ownerId='',authUserId='',uploadPermission=false,storeName='Duka langu',previewUrl='';
const sounds=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2500)}
function statusLabel(s){return ({pending:'Inasubiri Admin',published:'Imechapishwa',rejected:'Imekataliwa',archived:'Imefichwa'}[s]||s)}
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
  button.disabled=true;button.textContent='Inapakia video...';message.textContent='Tafadhali subiri, video inapakiwa kwenye ZUNE Storage.';
  let path='';
  try{
    const id=crypto.randomUUID(),ext=(file.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');
    path=authUserId+'/'+id+'.'+ext;
    const {data:upload,error:uploadError}=await db.storage.from('zune-reels').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
    if(uploadError)throw uploadError;
    const hashtags=$('#hashtags').value.split(/[\s,]+/).map(x=>x.trim().replace(/^#/,'')).filter(Boolean).slice(0,20);
    const payload={id,creator_id:ownerId,video_path:upload.path,caption,hashtags,product_id:$('#productSelect').value||null,status:'pending',creator_display_name:storeName};
    const sound=sounds.get($('#soundSelect').value);
    if(sound){payload.sound_id=sound.id;payload.audio_source='library';payload.audio_title=sound.title;payload.audio_artist=sound.artist||null;}
    const {error:insertError}=await db.from('zune_reels').insert(payload);
    if(insertError)throw insertError;
    message.textContent='Reel imetumwa kwa Admin kwa ukaguzi.';
    reelForm.reset();$('#captionCount').textContent='0';
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';
    $('#videoPreview').innerHTML='<div class="preview-placeholder"><span>▶</span><strong>Video preview</strong><small>Chagua video ili kuona preview hapa.</small></div>';
    toast('Reel imetumwa kwa ukaguzi.');
    await loadMyReels();
  }catch(error){
    console.error('ZUNE Seller Reel upload:',error);
    if(path)await db.storage.from('zune-reels').remove([path]).catch(()=>{});
    message.textContent=error.message||'Imeshindikana kupakia Reel. Hakikisha akaunti yako ina ruhusa.';
  }finally{button.disabled=false;button.textContent='Tuma Reel kwa ukaguzi'}
});
$('#refreshReels').addEventListener('click',loadMyReels);
$('#logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();location.replace('./index.html')});
init().catch(error=>{console.error(error);$('#formMessage').textContent=error.message||'Imeshindikana kuanzisha Reels Studio.'});