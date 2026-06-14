/* =====================================================================
   backup.js — local persistence layer
     • localStorage  (per-user offline mirror)
     • File System Access API  (optional linked JSON file)
     • JSON import / export   (backward compatible)
     • CSV export             (backward compatible)
   ===================================================================== */

const LEGACY_LS_KEY = 'mh_v3';      // single key used by the old single-user app
let   LS_KEY        = 'mh_v3';      // becomes 'mh_v3_<uid>' after sign-in
let   autoSaveTimer = null;         // debounce handle for File System Access saves

/* Namespace localStorage to the signed-in user so accounts never collide. */
function setUserStorageKey(uid){ LS_KEY = 'mh_v3_' + uid; }

/* ── SERIALISE / PARSE ─────────────────────────────────────────────── */
function dataToJSON(){
  return JSON.stringify({borrowers,loans,payments,savedAt:new Date().toISOString(),version:'4.0',uid:currentUser?currentUser.uid:null},null,2);
}
function parseJSON(txt){
  const d=JSON.parse(txt);
  borrowers=d.borrowers||[];loans=d.loans||[];payments=d.payments||[];
  updateFooter();
}

/* ── localStorage ──────────────────────────────────────────────────── */
function saveLS(){
  try{localStorage.setItem(LS_KEY,dataToJSON());}catch(e){}
}
function loadLS(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(raw){parseJSON(raw);return true;}
  }catch(e){}
  // empty for this user
  borrowers=[];loans=[];payments=[];
  return false;
}
/* Read the OLD single-user key (used once, for first-login migration). */
function readLegacyData(){
  try{
    const raw=localStorage.getItem(LEGACY_LS_KEY);
    if(raw){const d=JSON.parse(raw);return{borrowers:d.borrowers||[],loans:d.loans||[],payments:d.payments||[]};}
  }catch(e){}
  return null;
}

/* ── FILE SYSTEM ACCESS (optional extra backup) ────────────────────── */
async function saveToFile(){
  if(!fileHandle)return false;
  try{
    const writable=await fileHandle.createWritable();
    await writable.write(dataToJSON());
    await writable.close();
    return true;
  }catch(e){console.warn('File save failed:',e);return false;}
}
function scheduleFileSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(async()=>{
    if(fileHandle){
      const ok=await saveToFile();
      if(ok){unsavedChanges=false;updateSaveStatus('saved');}
    }
  },1500);
}
async function openFile(){
  if(!window.showOpenFilePicker&&!window.showSaveFilePicker){
    toast('Your browser does not support the File System Access API. Use Chrome/Edge on PC.','err');
    return;
  }
  try{
    const [handle]=await window.showOpenFilePicker({
      types:[{description:'Loan Data File',accept:{'application/json':['.json']}}],
      multiple:false
    });
    fileHandle=handle;
    const file=await handle.getFile();
    const text=await file.text();
    try{
      parseJSON(text);
      saveAll();                 // mirror imported data to localStorage + cloud
      toast('File loaded: '+handle.name,'info');
    }catch(e){toast('Could not read file. Starting fresh.','err');}
    updateFooter();
    document.getElementById('file-bar').style.display='flex';
    document.getElementById('save-btn').style.display='inline-flex';
    updateSaveStatus('saved');
    renderAll();
  }catch(e){if(e.name!=='AbortError')toast('Could not open file.','err');}
}
async function createNewFile(){
  if(!window.showSaveFilePicker){toast('Use Chrome/Edge on PC for file saving.','err');return;}
  try{
    const handle=await window.showSaveFilePicker({
      suggestedName:'mera_hisaab_data.json',
      types:[{description:'Loan Data',accept:{'application/json':['.json']}}]
    });
    fileHandle=handle;
    await saveToFile();
    updateFooter();
    document.getElementById('file-bar').style.display='flex';
    document.getElementById('save-btn').style.display='inline-flex';
    updateSaveStatus('saved');
    toast('New data file created: '+handle.name);
    renderAll();
  }catch(e){if(e.name!=='AbortError')toast('Could not create file.','err');}
}
async function manualSave(){
  if(!fileHandle){toast('No file linked. Open or create a file first.','err');return;}
  const ok=await saveToFile();
  if(ok){unsavedChanges=false;updateSaveStatus('saved');toast('Saved to '+fileHandle.name);}
  else{toast('File save failed. Data is still saved to cloud + browser.','err');}
}

/* ── FOOTER / FILE STATUS ──────────────────────────────────────────── */
function updateFooter(){
  const c=document.getElementById('footer-counts');
  if(c)c.textContent=borrowers.length+' borrowers · '+loans.length+' loans';
  const f=document.getElementById('footer-file');
  if(f)f.textContent=fileHandle?'📄 '+fileHandle.name:(currentUser?'☁️ Cloud synced':'⚠ Not linked');
}
function updateSaveStatus(state){
  const el=document.getElementById('fb-status');
  if(!el)return;
  if(state==='saved'){el.className='fb-status saved';el.textContent='✓ Saved to: '+(fileHandle?fileHandle.name:'file');}
  else if(state==='unsaved'){el.className='fb-status unsaved';el.textContent='● Unsaved changes — '+(fileHandle?fileHandle.name:'no file linked');}
}

/* ── CSV EXPORT (unchanged) ────────────────────────────────────────── */
function dlCSV(rows,fn){const csv=rows.map(r=>r.map(v=>'"'+(String(v||'').replace(/"/g,'""'))+'"').join(',')).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,﻿'+encodeURIComponent(csv);a.download=fn;a.click();}
function exportLoansCSV(){
  if(loans.length===0){toast('No loans.','err');return;}
  const rows=[['Borrower','Phone','Principal','Rate%','Start','Duration','Type','Status','Interest Accrued','Total Due','Paid','Outstanding','Collateral','Notes']];
  loans.forEach(l=>{const b=borrowers.find(x=>x.id===l.bid);rows.push([b?b.name:'?',b?b.phone||'':'',l.prin,l.rate,l.start,l.dur,l.type,lStatus(l),Math.round(lIntAccrued(l)),Math.round(lTotalDue(l)),Math.round(lPaid(l.id)),Math.round(lOutstanding(l)),l.coll||'',l.notes||'']);});
  dlCSV(rows,'loans_'+TODAY.toISOString().slice(0,10)+'.csv');toast('Exported!');
}
function exportPaysCSV(){
  if(payments.length===0){toast('No payments.','err');return;}
  const rows=[['Borrower','Phone','Loan Amount','Date','Type','Amount','Note']];
  [...payments].sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(p=>{const l=loans.find(x=>x.id===p.lid);const b=l?borrowers.find(x=>x.id===l.bid):null;rows.push([b?b.name:'?',b?b.phone||'':'',l?l.prin:'?',p.date,p.type,p.amt,p.note||'']);});
  dlCSV(rows,'payments_'+TODAY.toISOString().slice(0,10)+'.csv');toast('Exported!');
}

/* ── JSON EXPORT / IMPORT (unchanged, backward compatible) ─────────── */
function exportJSON(){
  const a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(dataToJSON());a.download='mera_hisaab_'+TODAY.toISOString().slice(0,10)+'.json';a.click();toast('Backup downloaded!');
}
function importJSON(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=ev=>{
    try{const d=JSON.parse(ev.target.result);if(!d.borrowers||!d.loans||!d.payments){toast('Invalid file.','err');return;}
    if(!confirm(`Restore ${d.borrowers.length} borrowers, ${d.loans.length} loans, ${d.payments.length} payments? This replaces current data and syncs to cloud.`))return;
    borrowers=d.borrowers;loans=d.loans;payments=d.payments;saveAll();toast('Restored!');renderAll();}catch{toast('Failed.','err');}
  };r.readAsText(file);e.target.value='';
}

/* Warn before closing if local changes have not yet flushed anywhere. */
window.addEventListener('beforeunload',e=>{
  if(unsavedChanges&&!fileHandle&&!currentUser){e.preventDefault();e.returnValue='Unsaved changes! Download a backup first.';}
});
