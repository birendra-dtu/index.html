/* =====================================================================
   firestore.js — cloud sync layer (Firebase Firestore)
   ---------------------------------------------------------------------
   Schema:
     users/{uid}                       (doc: profile + settings + meta)
     users/{uid}/borrowers/{id}
     users/{uid}/loans/{id}
     users/{uid}/payments/{id}
   ===================================================================== */

let cloudSyncEnabled = false;   // gate: no writes until first load settles
let cloudSyncTimer   = null;    // debounce handle for cloudSaveAll
let cloudListeners   = [];      // onSnapshot unsubscribe functions
const cloudIds = { borrowers:new Set(), loans:new Set(), payments:new Set() };

/* ── REFERENCES ────────────────────────────────────────────────────── */
function uref(uid){ return db.collection('users').doc(uid); }
function ucol(uid,name){ return uref(uid).collection(name); }

/* ── ORDERING (preserve "newest first" UX after a cloud read) ──────── */
function sortByCreated(arr){return arr.slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));}
function sortByDate(arr){return arr.slice().sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));}

/* ── ENSURE USER DOC ───────────────────────────────────────────────── */
async function ensureUserDoc(user, markMigrated){
  await uref(user.uid).set({
    email:       user.email      || '',
    displayName: user.displayName|| '',
    photoURL:    user.photoURL   || '',
    migrationCompleted: !!markMigrated,
    createdAt:   firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

/* ── LOAD everything for a user ────────────────────────────────────── */
async function cloudLoad(uid){
  const [bs,ls,ps,userSnap] = await Promise.all([
    ucol(uid,'borrowers').get(),
    ucol(uid,'loans').get(),
    ucol(uid,'payments').get(),
    uref(uid).get()
  ]);
  const data = {
    borrowers: sortByCreated(bs.docs.map(d=>d.data())),
    loans:     sortByCreated(ls.docs.map(d=>d.data())),
    payments:  sortByDate(ps.docs.map(d=>d.data())),
    meta:      userSnap.exists ? userSnap.data() : null
  };
  cloudIds.borrowers = new Set(data.borrowers.map(x=>x.id));
  cloudIds.loans     = new Set(data.loans.map(x=>x.id));
  cloudIds.payments  = new Set(data.payments.map(x=>x.id));
  return data;
}

/* ── BATCH WRITER (chunked to stay under Firestore's 500-op limit) ─── */
async function batchWrite(uid, data, deleteMissing){
  const ops=[];
  ['borrowers','loans','payments'].forEach(name=>{
    const localIds=new Set(data[name].map(x=>x.id));
    data[name].forEach(item=>ops.push({type:'set',name,id:item.id,data:item}));
    if(deleteMissing){
      cloudIds[name].forEach(id=>{ if(!localIds.has(id)) ops.push({type:'delete',name,id}); });
    }
  });
  for(let i=0;i<ops.length;i+=450){
    const batch=db.batch();
    ops.slice(i,i+450).forEach(op=>{
      const ref=ucol(uid,op.name).doc(op.id);
      if(op.type==='set') batch.set(ref, op.data);
      else batch.delete(ref);
    });
    await batch.commit();
  }
  ['borrowers','loans','payments'].forEach(name=>{ cloudIds[name]=new Set(data[name].map(x=>x.id)); });
}

/* ── MIGRATION (local → cloud, first login; never deletes) ─────────── */
async function migrateToCloud(uid, data){
  await batchWrite(uid, data, /*deleteMissing*/false);
  await uref(uid).set({
    migrationCompleted:true,
    lastSync: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

/* ── DEBOUNCED FULL SYNC (reconcile current arrays ↔ cloud) ────────── */
function scheduleCloudSync(){
  if(!cloudSyncEnabled || !currentUser) return;
  updateSyncBadge('pending');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer=setTimeout(cloudSaveAll, 1200);
}
async function cloudSaveAll(){
  cloudSyncTimer=null;
  if(!cloudSyncEnabled || !currentUser) return;
  const uid=currentUser.uid;
  updateSyncBadge('syncing');
  try{
    await batchWrite(uid, {borrowers,loans,payments}, /*deleteMissing*/true);
    await uref(uid).set({ lastSync: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
    try{localStorage.setItem(LS_KEY+'_lastsync', new Date().toISOString());}catch(e){}
    unsavedChanges=false;
    updateSyncBadge('synced', new Date());
  }catch(e){
    console.warn('[cloud] sync failed:', e);
    updateSyncBadge('offline');
  }
}
/* Manual "Sync to Cloud Now" button. */
function forceCloudSync(){
  if(!currentUser){toast('Not signed in.','err');return;}
  clearTimeout(cloudSyncTimer);cloudSyncTimer=null;
  cloudSaveAll().then(()=>toast('Synced to cloud ☁️'));
}

/* ── REAL-TIME LISTENERS (multi-device sync) ───────────────────────── */
function attachCloudListeners(uid){
  detachCloudListeners();
  ['borrowers','loans','payments'].forEach(name=>{
    const unsub = ucol(uid,name).onSnapshot(snap=>{
      // Ignore our own pending local writes (avoids echo / flicker).
      if(snap.metadata.hasPendingWrites) return;
      // Don't clobber edits the user just made that haven't flushed yet.
      if(cloudSyncTimer) return;
      const arr=snap.docs.map(d=>d.data());
      cloudIds[name]=new Set(arr.map(x=>x.id));
      applyRemote(name, arr);
    }, err=>console.warn('[cloud] listener('+name+'):', err));
    cloudListeners.push(unsub);
  });
}
function detachCloudListeners(){
  cloudListeners.forEach(u=>{try{u();}catch(e){}});
  cloudListeners=[];
}
function applyRemote(name, arr){
  if(name==='borrowers') borrowers=sortByCreated(arr);
  else if(name==='loans') loans=sortByCreated(arr);
  else if(name==='payments') payments=sortByDate(arr);
  saveLS();                 // keep the offline mirror current
  rerenderCurrent();        // live update of the visible tab
  updateSyncBadge('synced', new Date());
}

/* ── SYNC BADGE + PROFILE-MENU TIMESTAMP ───────────────────────────── */
function updateSyncBadge(state, ts){
  const badge=document.getElementById('sync-badge');
  const label=document.getElementById('sync-label');
  if(!badge||!label)return;
  badge.className='sync-badge '+state;
  const text={synced:'Synced',syncing:'Syncing…',pending:'Saving…',offline:'Offline'}[state]||state;
  label.textContent=text;
  if(ts){
    const t=ts.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    badge.title='Last cloud sync: '+ts.toLocaleString('en-IN');
    const pm=document.getElementById('pm-sync');
    if(pm)pm.textContent='Last sync: '+t;
  }
}
