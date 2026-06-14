/* =====================================================================
   app.js — application state, domain logic, CRUD actions, init flow
   ===================================================================== */

/* ── STATE ─────────────────────────────────────────────────────────── */
let borrowers = [], loans = [], payments = [];
let currentUser    = null;     // firebase.User once signed in
let fileHandle     = null;     // File System Access API handle (optional backup)
let unsavedChanges = false;

/* ── DATE CONSTANTS ────────────────────────────────────────────────── */
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DF = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

document.addEventListener('DOMContentLoaded', () => {
  const td = document.getElementById('topbar-date');
  if (td) td.textContent = DF[TODAY.getDay()] + ', ' + TODAY.getDate() + ' ' + MF[TODAY.getMonth()] + ' ' + TODAY.getFullYear();
  const pd = document.getElementById('p-date');
  if (pd) pd.value = TODAY.toISOString().slice(0, 10);
});

/* ── HELPERS (unchanged domain maths) ──────────────────────────────── */
function fmt(n){return '₹'+Math.round(n).toLocaleString('en-IN');}
function fmtd(n,d=2){return '₹'+parseFloat(n.toFixed(d)).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});}
function moBetween(a,b){return(b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth());}
function daysBetween(a,b){return Math.round((b-a)/86400000);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function lStatus(l){if(l.closed)return'closed';const s=new Date(l.start);s.setHours(0,0,0,0);if(moBetween(s,TODAY)>=l.dur)return'overdue';return'active';}
function lMI(l){return l.prin*l.rate/100;}
function lIntAccrued(l){const s=new Date(l.start);s.setHours(0,0,0,0);const mo=Math.min(Math.max(0,moBetween(s,TODAY)),l.dur);return l.prin*l.rate/100*mo;}
function lTotalDue(l){return l.prin+lIntAccrued(l);}
function lPaid(lid){return payments.filter(p=>p.lid===lid).reduce((s,p)=>s+p.amt,0);}
function lOutstanding(l){return Math.max(0,lTotalDue(l)-lPaid(l.id));}
function bLoans(bid){return loans.filter(l=>l.bid===bid);}
function bActiveLoans(bid){return bLoans(bid).filter(l=>!l.closed);}
function bTotalOut(bid){return bLoans(bid).reduce((s,l)=>s+lOutstanding(l),0);}
function bHasOverdue(bid){return bLoans(bid).some(l=>lStatus(l)==='overdue');}
function bHasActive(bid){return bLoans(bid).some(l=>lStatus(l)==='active');}

/* ── MASTER SAVE ───────────────────────────────────────────────────────
   Persists to all three layers:
     1. localStorage   (instant, offline mirror)              — backup.js
     2. linked file    (optional, debounced)                  — backup.js
     3. Firestore      (cloud, debounced, multi-device)       — firestore.js
   ──────────────────────────────────────────────────────────────────── */
function saveAll(){
  saveLS();                       // localStorage
  unsavedChanges = true;
  updateSaveStatus('unsaved');
  scheduleFileSave();             // optional File System Access backup
  scheduleCloudSync();            // Firebase Firestore
}

/* ── ADD / EDIT BORROWER ───────────────────────────────────────────── */
function addBorrower(){
  const name=document.getElementById('nb-name').value.trim();
  if(!name){toast(t('msg.nameReq'),'err');return;}
  const b={id:uid(),name,phone:document.getElementById('nb-phone').value.trim(),addr:document.getElementById('nb-addr').value.trim(),notes:document.getElementById('nb-notes').value.trim(),idno:document.getElementById('nb-id').value.trim(),createdAt:new Date().toISOString()};
  borrowers.unshift(b);saveAll();clearNB();
  toast(t('msg.borrowerAdded')+': '+name);showAddLoan(b.id);
}
function clearNB(){['nb-name','nb-phone','nb-addr','nb-notes','nb-id'].forEach(i=>document.getElementById(i).value='');}
function saveEditBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  b.name=document.getElementById('eb-name').value.trim()||b.name;
  b.phone=document.getElementById('eb-phone').value.trim();
  b.addr=document.getElementById('eb-addr').value.trim();
  b.notes=document.getElementById('eb-notes').value.trim();
  saveAll();closeOverlay();renderBorrowers();viewBorrower(id);toast(t('msg.updated'));
}
function delBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  const lids=bLoans(id).map(l=>l.id);
  if(!confirm(b.name+' — '+t('msg.delBorrowerConfirm')))return;
  const pids=payments.filter(p=>lids.includes(p.lid)).map(p=>p.id);
  const ownsDoc=d=>(d.refType==='borrower'&&d.refId===id)||(d.refType==='loan'&&lids.includes(d.refId))||(d.refType==='payment'&&pids.includes(d.refId));
  docs.filter(ownsDoc).forEach(d=>deleteDocImage(d.id).catch(()=>{}));
  docs=docs.filter(d=>!ownsDoc(d));
  borrowers=borrowers.filter(x=>x.id!==id);loans=loans.filter(l=>l.bid!==id);payments=payments.filter(p=>!lids.includes(p.lid));
  saveAll();document.getElementById('borrower-detail').innerHTML='';renderBorrowers();toast(t('msg.deleted'),'err');
}

/* ── ADD / EDIT LOAN ───────────────────────────────────────────────── */
function saveLoan(bid){
  const prin=parseFloat(document.getElementById('nl-prin').value);
  const start=document.getElementById('nl-start').value;
  if(!prin||prin<1){toast(t('msg.principalReq'),'err');return;}
  if(!start){toast(t('msg.startReq'),'err');return;}
  const l={id:uid(),bid,prin,rate:parseFloat(document.getElementById('nl-rate').value)||2,start,dur:parseInt(document.getElementById('nl-dur').value)||12,type:document.getElementById('nl-type').value,coll:document.getElementById('nl-coll').value.trim(),notes:document.getElementById('nl-notes').value.trim(),closed:false,createdAt:new Date().toISOString()};
  loans.unshift(l);saveAll();flushPendingDocs('loan',l.id);closeOverlay();toast(t('msg.loanAdded'));goTab('borrowers');setTimeout(()=>viewBorrower(bid),80);
}
function saveEditLoan(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  l.prin=parseFloat(document.getElementById('nl-prin').value)||l.prin;
  l.rate=parseFloat(document.getElementById('nl-rate').value)||l.rate;
  l.start=document.getElementById('nl-start').value||l.start;
  l.dur=parseInt(document.getElementById('nl-dur').value)||l.dur;
  l.type=document.getElementById('nl-type').value;
  l.coll=document.getElementById('nl-coll').value.trim();
  l.notes=document.getElementById('nl-notes').value.trim();
  saveAll();closeOverlay();renderBorrowers();viewBorrower(l.bid);toast(t('msg.loanUpdated'));
}
function delLoan(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  if(!confirm(t('msg.delLoanConfirm')))return;
  const bid=l.bid;
  const pids=payments.filter(p=>p.lid===lid).map(p=>p.id);
  const ownsDoc=d=>(d.refType==='loan'&&d.refId===lid)||(d.refType==='payment'&&pids.includes(d.refId));
  docs.filter(ownsDoc).forEach(d=>deleteDocImage(d.id).catch(()=>{}));
  docs=docs.filter(d=>!ownsDoc(d));
  loans=loans.filter(x=>x.id!==lid);payments=payments.filter(p=>p.lid!==lid);
  saveAll();viewBorrower(bid);toast(t('msg.loanDeleted'),'err');
}

/* ── PAYMENTS ──────────────────────────────────────────────────────── */
function recPay(){
  const bid=document.getElementById('p-who').value;const lid=document.getElementById('p-loan').value;
  const amt=parseFloat(document.getElementById('p-amt').value);const date=document.getElementById('p-date').value;
  if(!bid){toast(t('msg.selBorrower'),'err');return;}if(!lid){toast(t('msg.selLoan'),'err');return;}
  if(!amt||amt<1){toast(t('msg.validAmt'),'err');return;}
  const pid=uid();
  payments.unshift({id:pid,lid,amt,date,type:document.getElementById('p-type').value,note:document.getElementById('p-note').value.trim()});
  saveAll();flushPendingDocs('payment',pid);document.getElementById('p-amt').value='';document.getElementById('p-note').value='';renderPay();
  toast(t('msg.paymentRec')+': '+fmt(amt));
}

/* =====================================================================
   DOCUMENTS / PHOTOS  (optional — attached to a loan, payment or borrower)
   Stored compressed (≈100-200KB JPEG) in a SEPARATE Firestore subcollection
   users/{uid}/docs — kept out of the reconcile sync so images aren't
   re-uploaded on every change. NOT mirrored to localStorage (too big).
   ===================================================================== */
let docs = [];           // {id, refType:'loan'|'payment'|'borrower', refId, name, image(dataURL), createdAt}
let pendingDocs = [];    // held while creating a loan/payment; saved on submit
let docTarget = null;    // {mode:'pending',refType} OR {mode:'borrower',id}

/* Open camera (mobile) / file picker and remember where the photo should attach. */
function pickDoc(target){
  docTarget = target;
  const i = document.getElementById('doc-input');
  if(i){ i.value=''; i.click(); }
}

/* Resize + JPEG-compress an image File → small dataURL. */
function compressImage(file, maxDim, quality){
  maxDim = maxDim || 1200; quality = quality || 0.6;
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let w=img.width, h=img.height;
        if(w>=h && w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; }
        else if(h>w && h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject; img.src = ev.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

/* Handle the file input change (one or many photos). */
async function onDocPicked(e){
  const files = Array.prototype.slice.call(e.target.files || []);
  if(!files.length) return;
  let added=0;
  for(const f of files){
    if(!f.type || f.type.indexOf('image')!==0) continue;
    try{
      const image = await compressImage(f);
      const d = { id:uid(), name:(f.name||'photo'), image, createdAt:new Date().toISOString() };
      if(docTarget && docTarget.mode==='pending'){ d.refType=docTarget.refType; pendingDocs.push(d); }
      else if(docTarget){ d.refType=docTarget.mode; d.refId=docTarget.id; docs.push(d); saveDocImage(d).catch(()=>{}); }
      added++;
    }catch(err){ /* skip bad image */ }
  }
  e.target.value='';
  if(added){
    if(docTarget && docTarget.mode==='pending') renderPendingThumbs();
    else rerenderCurrent();
    toast(added+' photo add hui ✓');
  } else { toast('Photo add nahi hui.','err'); }
}

/* Save the photos that were attached while creating a loan/payment. */
function flushPendingDocs(refType, refId){
  pendingDocs.forEach(d=>{ d.refType=refType; d.refId=refId; docs.push(d); saveDocImage(d).catch(()=>{}); });
  pendingDocs = [];
}
function clearPendingDocs(){ pendingDocs = []; }

/* All photos belonging to a borrower (its ID + its loans' + its payments'). */
function bAllDocs(b){
  const lids = bLoans(b.id).map(l=>l.id);
  const pids = payments.filter(p=>lids.indexOf(p.lid)>=0).map(p=>p.id);
  return docs.filter(d =>
    (d.refType==='borrower' && d.refId===b.id) ||
    (d.refType==='loan' && lids.indexOf(d.refId)>=0) ||
    (d.refType==='payment' && pids.indexOf(d.refId)>=0)
  );
}

function delDoc(id){
  if(!confirm(t('doc.confirmDelete'))) return;
  docs = docs.filter(d=>d.id!==id);
  deleteDocImage(id).catch(()=>{});
  closeOverlay(); rerenderCurrent();
  toast('Photo hata di.','err');
}

/* =====================================================================
   INIT FLOW — driven by auth.js after sign-in
   ---------------------------------------------------------------------
   App Start → check auth → (logged in) → load cloud → migrate/sync →
   open dashboard. Offline-first: render the local cache immediately,
   then reconcile with Firestore.
   ===================================================================== */
async function initApp(user){
  currentUser = user;
  setUserStorageKey(user.uid);     // localStorage becomes per-user (isolation)

  /* 1. Instant paint from local cache so the app is usable offline. */
  cloudSyncEnabled = false;        // block writes until the first load settles
  loadLS();
  updateFooter();
  renderAll();
  updateSyncBadge('syncing');

  /* 2. Reconcile with the cloud. */
  try{
    const cloud      = await cloudLoad(user.uid);
    const meta       = cloud.meta;
    const cloudEmpty = cloud.borrowers.length===0 && cloud.loans.length===0 && cloud.payments.length===0;

    // What local data might need migrating? Prefer current arrays, else legacy key.
    const legacy     = (borrowers.length||loans.length||payments.length)
                         ? {borrowers,loans,payments}
                         : readLegacyData();
    const legacyHas  = legacy && (legacy.borrowers.length||legacy.loans.length||legacy.payments.length);

    if(!meta || !meta.migrationCompleted){
      /* ---- FIRST LOGIN for this account ---- */
      if(cloudEmpty && legacyHas){
        // MIGRATION: push the existing local data up to Firestore.
        await ensureUserDoc(user,false);
        await migrateToCloud(user.uid, legacy);
        borrowers=legacy.borrowers; loans=legacy.loans; payments=legacy.payments;
        toast('Existing data migrated to your cloud account ☁️','info');
      }else{
        // Nothing local to migrate (or cloud already has data) → adopt cloud.
        await ensureUserDoc(user,true);
        borrowers=cloud.borrowers; loans=cloud.loans; payments=cloud.payments;
      }
    }else{
      /* ---- RETURNING account → cloud is the source of truth ---- */
      borrowers=cloud.borrowers; loans=cloud.loans; payments=cloud.payments;
    }

    try{ await cloudLoadDocs(user.uid); }catch(e){ docs=[]; }
    saveLS(); updateFooter(); renderAll();
    const ts = meta && meta.lastSync && meta.lastSync.toDate ? meta.lastSync.toDate() : new Date();
    updateSyncBadge('synced', ts);
  }catch(e){
    console.warn('[init] cloud load failed — running on local cache', e);
    updateSyncBadge('offline');
    toast('Offline — using local data. Will sync when reconnected.','info');
  }

  /* 3. Go live: enable writes + real-time multi-device listeners. */
  cloudSyncEnabled = true;
  attachCloudListeners(user.uid);
}

/* Reset everything when the user logs out (prevents data bleed-through). */
function resetAppState(){
  detachCloudListeners();
  if(typeof cloudSyncTimer!=='undefined') clearTimeout(cloudSyncTimer);
  cloudSyncEnabled=false;
  borrowers=[]; loans=[]; payments=[]; docs=[]; pendingDocs=[]; docTarget=null;
  fileHandle=null; unsavedChanges=false; currentUser=null;
}
