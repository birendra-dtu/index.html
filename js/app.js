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
  if(!name){toast('Name required.','err');return;}
  const b={id:uid(),name,phone:document.getElementById('nb-phone').value.trim(),addr:document.getElementById('nb-addr').value.trim(),notes:document.getElementById('nb-notes').value.trim(),idno:document.getElementById('nb-id').value.trim(),createdAt:new Date().toISOString()};
  borrowers.unshift(b);saveAll();clearNB();
  toast('Borrower added: '+name);showAddLoan(b.id);
}
function clearNB(){['nb-name','nb-phone','nb-addr','nb-notes','nb-id'].forEach(i=>document.getElementById(i).value='');}
function saveEditBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  b.name=document.getElementById('eb-name').value.trim()||b.name;
  b.phone=document.getElementById('eb-phone').value.trim();
  b.addr=document.getElementById('eb-addr').value.trim();
  b.notes=document.getElementById('eb-notes').value.trim();
  saveAll();closeOverlay();renderBorrowers();viewBorrower(id);toast('Updated!');
}
function delBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  const lids=bLoans(id).map(l=>l.id);
  if(!confirm(`Delete "${b.name}" and all ${lids.length} loans + payments?`))return;
  borrowers=borrowers.filter(x=>x.id!==id);loans=loans.filter(l=>l.bid!==id);payments=payments.filter(p=>!lids.includes(p.lid));
  saveAll();document.getElementById('borrower-detail').innerHTML='';renderBorrowers();toast('Deleted.','err');
}

/* ── ADD / EDIT LOAN ───────────────────────────────────────────────── */
function saveLoan(bid){
  const prin=parseFloat(document.getElementById('nl-prin').value);
  const start=document.getElementById('nl-start').value;
  if(!prin||prin<1){toast('Valid principal required.','err');return;}
  if(!start){toast('Start date required.','err');return;}
  const l={id:uid(),bid,prin,rate:parseFloat(document.getElementById('nl-rate').value)||2,start,dur:parseInt(document.getElementById('nl-dur').value)||12,type:document.getElementById('nl-type').value,coll:document.getElementById('nl-coll').value.trim(),notes:document.getElementById('nl-notes').value.trim(),closed:false,createdAt:new Date().toISOString()};
  loans.unshift(l);saveAll();closeOverlay();toast('Loan added!');goTab('borrowers');setTimeout(()=>viewBorrower(bid),80);
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
  saveAll();closeOverlay();renderBorrowers();viewBorrower(l.bid);toast('Loan updated!');
}
function delLoan(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  if(!confirm('Delete this loan and all its payments?'))return;
  const bid=l.bid;loans=loans.filter(x=>x.id!==lid);payments=payments.filter(p=>p.lid!==lid);
  saveAll();viewBorrower(bid);toast('Loan deleted.','err');
}

/* ── PAYMENTS ──────────────────────────────────────────────────────── */
function recPay(){
  const bid=document.getElementById('p-who').value;const lid=document.getElementById('p-loan').value;
  const amt=parseFloat(document.getElementById('p-amt').value);const date=document.getElementById('p-date').value;
  if(!bid){toast('Select borrower.','err');return;}if(!lid){toast('Select loan.','err');return;}
  if(!amt||amt<1){toast('Enter valid amount.','err');return;}
  payments.unshift({id:uid(),lid,amt,date,type:document.getElementById('p-type').value,note:document.getElementById('p-note').value.trim()});
  saveAll();document.getElementById('p-amt').value='';document.getElementById('p-note').value='';renderPay();
  toast('Payment recorded: '+fmt(amt));
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
  borrowers=[]; loans=[]; payments=[];
  fileHandle=null; unsavedChanges=false; currentUser=null;
}
