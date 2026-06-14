/* =====================================================================
   ui.js — rendering, navigation, modals, toast
   ===================================================================== */

let currentTab = 'dash';   // tracked so cloud listeners can re-render live
let remFilter  = 'due';

/* ── TOAST ─────────────────────────────────────────────────────────── */
function toast(msg,type='ok'){
  const t=document.getElementById('toast');
  t.textContent=(type==='ok'?'✓ ':type==='err'?'✗ ':'ℹ ')+msg;
  t.className='toast show '+type;
  setTimeout(()=>t.classList.remove('show'),3500);
}

/* ── WELCOME / FILE SETUP ──────────────────────────────────────────── */
function renderWelcome(){
  const hasData=borrowers.length>0;
  const supported=!!(window.showOpenFilePicker||window.showSaveFilePicker);
  document.getElementById('welcome-box').innerHTML=`
    <div class="welcome">
      <div style="font-size:48px;margin-bottom:16px">💰</div>
      <h2>AAPKA HISAB(MADNA) — Loan Manager</h2>
      <p>${hasData?`Welcome back! ${borrowers.length} borrowers loaded. Your data is saved to your cloud account and synced across devices.`:'No borrowers yet. Add your first borrower to get started — everything saves to your cloud account automatically.'}</p>
      <div class="steps">
        <div class="step"><div class="step-num" style="background:var(--accent)">1</div><div><strong>Add borrowers &amp; loans</strong><br><span style="font-size:12px;color:var(--text3)">Everything is tied to your account</span></div></div>
        <div class="step"><div class="step-num" style="background:var(--green)">2</div><div><strong>Auto cloud sync</strong><br><span style="font-size:12px;color:var(--text3)">Saved to Firestore + offline backup</span></div></div>
        <div class="step"><div class="step-num" style="background:var(--amber)">3</div><div><strong>Use on any device</strong><br><span style="font-size:12px;color:var(--text3)">Phone, tablet, desktop — same login</span></div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-p" onclick="goTab('add-borrower')">+ Add First Borrower</button>
        ${supported?`<button class="btn btn-g" onclick="openFile()">📂 Link a backup file (optional)</button>`:''}
      </div>
    </div>`;
}
function skipWelcome(){
  document.getElementById('welcome-box').innerHTML='';
  document.getElementById('dash-inner').style.display='';
  renderDash();
}

/* ── NAV ───────────────────────────────────────────────────────────── */
const TITLES={dash:'Dashboard',borrowers:'Borrowers','add-borrower':'Add Borrower',payments:'Payments',reminders:'Reminders',reports:'Reports'};
function goTab(t){
  currentTab=t;
  ['dash','borrowers','add-borrower','payments','reminders','reports'].forEach(x=>{
    document.getElementById('sec-'+x).classList.toggle('on',x===t);
    document.getElementById('nav-'+x).classList.toggle('active',x===t);
  });
  document.getElementById('page-title').textContent=TITLES[t]||t;
  if(t==='dash')renderDash();
  if(t==='borrowers'){renderBorrowers();document.getElementById('borrower-detail').innerHTML='';}
  if(t==='payments')renderPay();
  if(t==='reminders')renderRem(remFilter);
  if(t==='reports')renderReports();
  if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open');
}

function renderAll(){
  document.getElementById('welcome-box').innerHTML='';
  document.getElementById('dash-inner').style.display='';
  renderDash();renderPay();
}

/* Re-render whatever tab is currently visible — used by live cloud sync. */
function rerenderCurrent(){
  updateFooter();
  if(currentTab==='dash')renderDash();
  else if(currentTab==='borrowers')renderBorrowers();
  else if(currentTab==='payments')renderPay();
  else if(currentTab==='reminders')renderRem(remFilter);
  else if(currentTab==='reports')renderReports();
}

/* ── DASHBOARD ─────────────────────────────────────────────────────── */
function renderDash(){
  if(borrowers.length===0){renderWelcome();return;}
  document.getElementById('welcome-box').innerHTML='';
  document.getElementById('dash-inner').style.display='';
  const openL=loans.filter(l=>!l.closed);
  const actL=loans.filter(l=>lStatus(l)==='active');
  const ovL=loans.filter(l=>lStatus(l)==='overdue');
  const totP=openL.reduce((s,l)=>s+l.prin,0);
  const totO=openL.reduce((s,l)=>s+lOutstanding(l),0);
  const totI=actL.reduce((s,l)=>s+lMI(l),0);
  const totC=payments.reduce((s,p)=>s+p.amt,0);
  document.getElementById('dash-metrics').innerHTML=`
    <div class="met"><div class="met-l">Borrowers</div><div class="met-v" style="color:var(--accent)">${borrowers.length}</div></div>
    <div class="met"><div class="met-l">Active Loans</div><div class="met-v" style="color:var(--green)">${actL.length}</div></div>
    <div class="met"><div class="met-l">Overdue</div><div class="met-v" style="color:var(--red)">${ovL.length}</div></div>
    <div class="met"><div class="met-l">Portfolio</div><div class="met-v">${fmt(totP)}</div></div>
    <div class="met"><div class="met-l">Outstanding</div><div class="met-v" style="color:var(--amber)">${fmt(totO)}</div></div>
    <div class="met"><div class="met-l">Interest/Month</div><div class="met-v" style="color:var(--red)">${fmt(totI)}</div></div>
    <div class="met"><div class="met-l">Total Collected</div><div class="met-v" style="color:var(--green)">${fmt(totC)}</div></div>
  `;
  const top8=openL.slice(0,8);
  if(top8.length===0){document.getElementById('port-chart').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>No loans yet.</div>';
  }else{
    const maxV=Math.max(...top8.map(l=>lTotalDue(l)),1);
    document.getElementById('port-chart').innerHTML=top8.map(l=>{
      const b=borrowers.find(x=>x.id===l.bid);
      const pw=Math.round(l.prin/maxV*100),iw=Math.round(lIntAccrued(l)/maxV*100);
      return`<div class="brow2"><div class="bname">${(b?b.name:'?').split(' ')[0]}</div><div class="btrack"><div class="bp" style="width:${pw}%">${pw>14?fmt(l.prin):''}</div><div class="bi" style="width:${iw}%">${iw>14?fmt(lIntAccrued(l)):''}</div></div></div>`;
    }).join('');
  }
  const topB=borrowers.filter(b=>bActiveLoans(b.id).length>0||bHasOverdue(b.id)).slice(0,8);
  if(topB.length===0){document.getElementById('dash-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>No active loans.</div>';return;}
  document.getElementById('dash-list').innerHTML=topB.map(b=>{
    const al=bActiveLoans(b.id);const ov=bHasOverdue(b.id);const tot=bTotalOut(b.id);
    return`<div style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="goToBorrower('${b.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${b.name}</span>
        <span class="badge ${ov?'bo':'ba'}">${ov?'overdue':'active'}</span>
      </div>
      <div style="font-size:12px;color:var(--text3)">${al.length} active loan${al.length!==1?'s':''} · Outstanding: <span style="color:var(--amber)">${fmt(tot)}</span></div>
    </div>`;
  }).join('');
}

/* ── BORROWERS ─────────────────────────────────────────────────────── */
function renderBorrowers(){
  const q=(document.getElementById('bs-q').value||'').toLowerCase();
  const f=document.getElementById('bs-f').value;
  let filtered=borrowers.filter(b=>{
    const m=b.name.toLowerCase().includes(q)||(b.phone||'').includes(q);
    if(!m)return false;
    if(f==='active')return bHasActive(b.id);
    if(f==='overdue')return bHasOverdue(b.id);
    return true;
  });
  if(filtered.length===0){document.getElementById('borrowers-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>No borrowers. <a href="#" onclick="goTab(\'add-borrower\')" style="color:var(--accent)">Add one</a>.</div>';return;}
  document.getElementById('borrowers-list').innerHTML=filtered.map(b=>{
    const bl=bLoans(b.id);const al=bl.filter(l=>lStatus(l)==='active');const ov=bl.filter(l=>lStatus(l)==='overdue');const tot=bTotalOut(b.id);
    const loanTags=bl.slice(0,4).map(l=>{const st=lStatus(l);const cls=st==='active'?'ltag-a':st==='overdue'?'ltag-o':'ltag-c';return`<span class="ltag ${cls}" onclick="event.stopPropagation();viewLoan('${l.id}')">${fmt(l.prin)} @ ${l.rate}%</span>`;}).join('')+(bl.length>4?`<span style="font-size:11px;color:var(--text3)">+${bl.length-4} more</span>`:'');
    return`<div class="bc-item" onclick="viewBorrower('${b.id}')" id="bci-${b.id}">
      <div class="bc-head">
        <div><div class="bc-name">${b.name}</div>
          <div class="bc-meta">${b.phone?`<span>📞 ${b.phone}</span>`:''} ${b.addr?`<span>📍 ${b.addr}</span>`:''}<span>${bl.length} loan${bl.length!==1?'s':''} · ${al.length} active · ${ov.length} overdue</span></div>
        </div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(tot)}</div><div style="font-size:11px;color:var(--text3)">outstanding</div></div>
      </div>
      ${bl.length>0?`<div class="bc-loans">${loanTags}</div>`:'<div style="font-size:12px;color:var(--text3)">No loans yet</div>'}
    </div>`;
  }).join('');
}

function goToBorrower(id){goTab('borrowers');setTimeout(()=>viewBorrower(id),60);}

function viewBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  document.querySelectorAll('.bc-item').forEach(e=>e.classList.remove('sel'));
  const el=document.getElementById('bci-'+id);if(el)el.classList.add('sel');
  const bl=bLoans(id);
  const totOut=bTotalOut(id);const totPaid=bl.reduce((s,l)=>s+lPaid(l.id),0);const totPrin=bl.reduce((s,l)=>s+l.prin,0);
  let loansHtml=bl.length===0?'<div style="font-size:13px;color:var(--text3);margin-bottom:16px">No loans yet.</div>':bl.map(l=>{
    const st=lStatus(l);const mi_=lMI(l);const ia=lIntAccrued(l);const td=lTotalDue(l);const pd=lPaid(l.id);const out=lOutstanding(l);
    const pct=Math.min(100,Math.round(pd/Math.max(1,td)*100));const col=pct>80?'var(--green)':pct<30?'var(--red)':'var(--accent)';
    const s=new Date(l.start);s.setHours(0,0,0,0);const mo=moBetween(s,TODAY);
    return`<div style="border:1px solid var(--border);border-radius:var(--rs);padding:14px;margin-bottom:10px;background:var(--bg3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div><span style="font-size:14px;font-weight:700;font-family:var(--mono)">${fmt(l.prin)}</span><span style="font-size:12px;color:var(--text3);margin-left:8px">${l.rate}%/mo · ${l.start}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge b${st[0]}">${st}</span>
          <button class="btn btn-g btn-sm" onclick="showAddLoan('${id}','${l.id}')">Edit</button>
          <button class="btn btn-d btn-sm" onclick="delLoan('${l.id}')">Del</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px">
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Monthly int.</div><div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--mono)">${fmt(mi_)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Accrued</div><div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--mono)">${fmt(ia)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Total due</div><div style="font-size:13px;font-weight:600;color:var(--amber);font-family:var(--mono)">${fmt(td)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Paid</div><div style="font-size:13px;font-weight:600;color:var(--green);font-family:var(--mono)">${fmt(pd)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Per day</div><div style="font-size:13px;font-weight:600;font-family:var(--mono)">${fmtd(mi_/30)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">Months elapsed</div><div style="font-size:13px;font-weight:600;font-family:var(--mono)">${mo}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:var(--text3)"><span>Recovery</span><span>${pct}% — <span style="color:var(--amber)">${fmt(out)} left</span></span></div>
      <div class="prog"><div class="pf" style="width:${pct}%;background:${col}"></div></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" onclick="quickPay('${id}','${l.id}')">💳 Record Payment</button>
        <button class="btn btn-g btn-sm" onclick="showOTS('${l.id}')">🤝 OTS</button>
        <button class="btn btn-g btn-sm" onclick="showSchedule('${l.id}')">📅 Schedule</button>
      </div>
    </div>`;
  }).join('');
  const allLoanIds=bl.map(l=>l.id);
  const bPays=payments.filter(p=>allLoanIds.includes(p.lid)).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,15);
  document.getElementById('borrower-detail').innerHTML=`
    <div style="border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-top:14px;margin-bottom:14px;background:var(--bg2)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px">
        <div>
          <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px">${b.name}</div>
          ${b.phone?`<div style="font-size:13px;color:var(--text3)">📞 ${b.phone}</div>`:''}
          ${b.addr?`<div style="font-size:13px;color:var(--text3)">📍 ${b.addr}</div>`:''}
          ${b.notes?`<div style="font-size:12px;color:var(--text3);margin-top:4px">${b.notes}</div>`:''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-p btn-sm" onclick="showAddLoan('${id}')">+ New Loan</button>
          <button class="btn btn-g btn-sm" onclick="copyRem('${id}')">📱 Reminder</button>
          <button class="btn btn-g btn-sm" onclick="showEditBorrower('${id}')">Edit</button>
          <button class="btn btn-d btn-sm" onclick="delBorrower('${id}')">Delete</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px">
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Total loans</div><div style="font-size:20px;font-weight:700;font-family:var(--mono)">${bl.length}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Total principal</div><div style="font-size:20px;font-weight:700;font-family:var(--mono)">${fmt(totPrin)}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Total paid</div><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--green)">${fmt(totPaid)}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Outstanding</div><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(totOut)}</div></div>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Loans</div>
      ${loansHtml}
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Payment History (${bPays.length})</div>
      ${bPays.length===0?'<div style="font-size:12px;color:var(--text3)">No payments yet.</div>':`
      <div class="tw"><table>
        <thead><tr><th>Date</th><th>Loan</th><th>Type</th><th class="r">Amount</th><th>Note</th></tr></thead>
        <tbody>${bPays.map(p=>{const l=loans.find(x=>x.id===p.lid);return`<tr><td class="p">${p.date}</td><td style="color:var(--text3)">${l?fmt(l.prin):'?'}</td><td style="color:var(--text3)">${p.type}</td><td class="r" style="color:var(--green)">${fmt(p.amt)}</td><td style="color:var(--text3)">${p.note||'—'}</td></tr>`;}).join('')}</tbody>
      </table></div>`}
    </div>`;
  document.getElementById('borrower-detail').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ── ADD/EDIT BORROWER MODAL ───────────────────────────────────────── */
function showEditBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  document.getElementById('modal-body').innerHTML=`<h2>Edit Borrower</h2>
    <div class="fg"><label>Name</label><input type="text" id="eb-name" value="${b.name}"></div>
    <div class="fg"><label>Phone</label><input type="text" id="eb-phone" value="${b.phone||''}"></div>
    <div class="fg"><label>Address</label><input type="text" id="eb-addr" value="${b.addr||''}"></div>
    <div class="fg"><label>Notes</label><textarea id="eb-notes">${b.notes||''}</textarea></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">Cancel</button><button class="btn btn-p" onclick="saveEditBorrower('${id}')">Save</button></div>`;
  document.getElementById('overlay').classList.add('show');
}

/* ── ADD/EDIT LOAN MODAL ───────────────────────────────────────────── */
function showAddLoan(bid,editLid){
  const b=borrowers.find(x=>x.id===bid);if(!b)return;
  const el=editLid?loans.find(x=>x.id===editLid):null;
  document.getElementById('modal-body').innerHTML=`<h2>${el?'Edit Loan':'New Loan — '+b.name}</h2>
    <div class="fg"><label>Principal ₹ *</label><input type="number" id="nl-prin" value="${el?el.prin:''}" placeholder="50000" min="100"></div>
    <div class="fg"><label>Monthly Rate (%)</label><input type="number" id="nl-rate" value="${el?el.rate:2}" min="0.01" max="100" step="0.01"></div>
    <div class="fg"><label>Start Date *</label><input type="date" id="nl-start" value="${el?el.start:TODAY.toISOString().slice(0,10)}"></div>
    <div class="fg"><label>Duration (months)</label><input type="number" id="nl-dur" value="${el?el.dur:12}" min="1" max="360"></div>
    <div class="fg"><label>Loan Type</label><select id="nl-type"><option value="interest_only" ${el&&el.type==='interest_only'?'selected':''}>Interest only</option><option value="emi" ${el&&el.type==='emi'?'selected':''}>EMI</option><option value="flat" ${el&&el.type==='flat'?'selected':''}>Flat rate</option></select></div>
    <div class="fg"><label>Collateral</label><input type="text" id="nl-coll" value="${el&&el.coll?el.coll:''}" placeholder="Gold, property, etc."></div>
    <div class="fg"><label>Notes</label><input type="text" id="nl-notes" value="${el&&el.notes?el.notes:''}" placeholder="Any notes"></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">Cancel</button><button class="btn btn-p" onclick="${el?`saveEditLoan('${el.id}')`:`saveLoan('${bid}')`}">${el?'Save':'Add Loan'}</button></div>`;
  document.getElementById('overlay').classList.add('show');
}
function viewLoan(lid){const l=loans.find(x=>x.id===lid);if(!l)return;goTab('borrowers');setTimeout(()=>{renderBorrowers();viewBorrower(l.bid);},80);}

/* ── OTS & SCHEDULE ────────────────────────────────────────────────── */
function showOTS(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const b=borrowers.find(x=>x.id===l.bid);const td=lTotalDue(l);const mi_=lMI(l);
  document.getElementById('modal-body').innerHTML=`<h2>🤝 OTS — ${b?b.name:'Borrower'}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">Principal</div><div style="font-size:16px;font-weight:700;font-family:var(--mono)">${fmt(l.prin)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">Total due</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(td)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">Monthly int.</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--red)">${fmt(mi_)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">Interest accrued</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--red)">${fmt(lIntAccrued(l))}</div></div>
    </div>
    <div class="fg"><label>Settlement Offered ₹</label><input type="number" id="ots-amt" value="${Math.round(td)}" oninput="calcOTS('${lid}')"></div>
    <div id="ots-res"></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">Close</button></div>`;
  document.getElementById('overlay').classList.add('show');calcOTS(lid);
}
function calcOTS(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const s=parseFloat(document.getElementById('ots-amt').value)||0;const td=lTotalDue(l);const w=td-s;const wp=((w/td)*100).toFixed(1);
  let h='';
  if(s>=td)h=`<div style="background:var(--green-bg);border:1px solid rgba(52,201,123,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--green);font-weight:600">✓ Full recovery</div><div style="font-size:12px;color:var(--text2);margin-top:4px">${fmt(s)} covers full due of ${fmt(td)}${s>td?` · Excess: ${fmt(s-td)}`:''}</div></div>`;
  else if(s<l.prin)h=`<div style="background:var(--red-bg);border:1px solid rgba(240,82,82,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--red);font-weight:600">⚠ Below principal — LOSS of ${fmt(l.prin-s)}</div><div style="font-size:12px;color:var(--text2);margin-top:4px">Waiver: ${fmt(w)} (${wp}%)</div></div>`;
  else h=`<div style="background:var(--amber-bg);border:1px solid rgba(245,166,35,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--amber);font-weight:600">${fmt(s)} — Waiver: ${fmt(w)} (${wp}%)</div><div style="font-size:12px;color:var(--text2);margin-top:4px">Above principal: ${fmt(s-l.prin)} · Total due was ${fmt(td)}</div></div>`;
  document.getElementById('ots-res').innerHTML=h;
}
function showSchedule(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const s=new Date(l.start);s.setHours(0,0,0,0);const mi_=lMI(l);
  let rows='';
  for(let i=1;i<=l.dur;i++){const d=new Date(s.getFullYear(),s.getMonth()+i-1,1);const cur=d.getFullYear()===TODAY.getFullYear()&&d.getMonth()===TODAY.getMonth();rows+=`<tr class="${cur?'cur-row':''}"><td class="p">${MS[d.getMonth()]} ${d.getFullYear()}${cur?' ★':''}</td><td class="r">${fmt(mi_)}</td><td class="r">${i===l.dur?fmt(mi_+l.prin):fmt(mi_)}</td><td class="r">${i===l.dur?'₹0':fmt(l.prin)}</td></tr>`;}
  document.getElementById('modal-body').innerHTML=`<h2>📅 Schedule — ${fmt(l.prin)} @ ${l.rate}%/mo</h2>
    <div class="tw" style="max-height:400px;overflow-y:auto"><table><thead><tr><th>Month</th><th class="r">Interest</th><th class="r">Payment</th><th class="r">Balance</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:11px;color:var(--text3);margin-top:6px">★ = current month</div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">Close</button></div>`;
  document.getElementById('overlay').classList.add('show');
}

/* ── PAYMENTS RENDER ───────────────────────────────────────────────── */
function renderPay(){
  const bSel=document.getElementById('p-who');const cur=bSel.value;
  bSel.innerHTML='<option value="">— Select borrower —</option>'+borrowers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  if(cur)bSel.value=cur;updateLoanSelect();
  const rec=[...payments].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,25);
  if(rec.length===0){document.getElementById('pay-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>No payments yet.</div>';return;}
  document.getElementById('pay-list').innerHTML=`<div class="tw"><table><thead><tr><th>Borrower</th><th>Loan</th><th>Date</th><th>Type</th><th class="r">Amount</th><th>Note</th></tr></thead>
    <tbody>${rec.map(p=>{const l=loans.find(x=>x.id===p.lid);const b=l?borrowers.find(x=>x.id===l.bid):null;return`<tr><td class="p">${b?b.name:'?'}</td><td style="color:var(--text3);font-family:var(--mono);font-size:12px">${l?fmt(l.prin):'?'}</td><td>${p.date}</td><td style="color:var(--text3)">${p.type}</td><td class="r" style="color:var(--green)">${fmt(p.amt)}</td><td style="color:var(--text3)">${p.note||'—'}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function updateLoanSelect(){
  const bid=document.getElementById('p-who').value;const lSel=document.getElementById('p-loan');
  if(!bid){lSel.innerHTML='<option value="">— Select borrower first —</option>';document.getElementById('p-amt').value='';return;}
  const bl=bLoans(bid).filter(l=>!l.closed);
  if(bl.length===0){lSel.innerHTML='<option value="">No active loans</option>';return;}
  lSel.innerHTML=bl.map(l=>`<option value="${l.id}">${fmt(l.prin)} @ ${l.rate}%/mo · ${lStatus(l)}</option>`).join('');
  if(bl.length===1)document.getElementById('p-amt').value=Math.round(lMI(bl[0]));
}
function quickPay(bid,lid){
  goTab('payments');
  setTimeout(()=>{document.getElementById('p-who').value=bid;updateLoanSelect();setTimeout(()=>{if(lid)document.getElementById('p-loan').value=lid;const l=loans.find(x=>x.id===lid);if(l)document.getElementById('p-amt').value=Math.round(lMI(l));},60);},80);
}

/* ── REMINDERS ─────────────────────────────────────────────────────── */
function setRt(t){remFilter=t;['due','over','all'].forEach(x=>document.getElementById('rt-'+x).classList.toggle('active',x===t));renderRem(t);}
function renderRem(filter){
  remFilter=filter;
  let items=borrowers.map(b=>{const al=bActiveLoans(b.id);const ov=bHasOverdue(b.id);const tot=bTotalOut(b.id);const totMI=al.reduce((s,l)=>s+lMI(l),0);const daysInMo=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0).getDate();return{b,al,ov,tot,totMI,st:ov?'overdue':'active',daysLeft:daysInMo-TODAY.getDate()};}).filter(x=>x.al.length>0||x.ov);
  if(filter==='due')items=items.filter(x=>!x.ov&&x.al.length>0);else if(filter==='over')items=items.filter(x=>x.ov);
  if(items.length===0){document.getElementById('rem-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>Nothing here.</div>';return;}
  document.getElementById('rem-list').innerHTML=items.map(({b,al,ov,tot,totMI,daysLeft})=>{
    const cls=ov?'urg':daysLeft<=5?'wrn':'ok';const label=ov?'🔴 Overdue':daysLeft<=5?`🟡 Due in ${daysLeft} days`:`🟢 Due in ${daysLeft} days`;
    return`<div class="ri ${cls}"><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px">${b.name} ${b.phone?`<span style="color:var(--text3);font-weight:400">· ${b.phone}</span>`:''}</div><div style="font-size:12px;color:var(--text3)">${label} · ${al.length} loan${al.length!==1?'s':''} · Monthly: ${fmt(totMI)} · Outstanding: <span style="color:var(--amber)">${fmt(tot)}</span></div></div><div style="display:flex;gap:6px"><button class="btn btn-g btn-sm" onclick="copyRem('${b.id}')">📱</button><button class="btn btn-p btn-sm" onclick="goToBorrower('${b.id}')">View</button></div></div>`;
  }).join('');
}
function copyRem(bid){
  const b=borrowers.find(x=>x.id===bid);if(!b)return;
  const al=bActiveLoans(bid);const tot=bTotalOut(bid);const totMI=al.reduce((s,l)=>s+lMI(l),0);
  const msg=`नमस्ते ${b.name} जी 🙏\n\nआपके loan की जानकारी:\n• Active loans: ${al.length}\n• कुल मासिक ब्याज: ${fmt(totMI)}\n• कुल बकाया: ${fmt(tot)}\n\nकृपया जल्द भुगतान करें।\nधन्यवाद।`;
  navigator.clipboard.writeText(msg).then(()=>toast('Reminder copied!')).catch(()=>toast('Copy failed.','err'));
}

/* ── REPORTS ───────────────────────────────────────────────────────── */
function renderReports(){
  const actL=loans.filter(l=>lStatus(l)==='active');const ovL=loans.filter(l=>lStatus(l)==='overdue');const openL=loans.filter(l=>!l.closed);
  document.getElementById('report-body').innerHTML=`
    <div class="metrics">
      <div class="met"><div class="met-l">Borrowers</div><div class="met-v">${borrowers.length}</div></div>
      <div class="met"><div class="met-l">Total loans</div><div class="met-v">${loans.length}</div></div>
      <div class="met"><div class="met-l">Active</div><div class="met-v" style="color:var(--green)">${actL.length}</div></div>
      <div class="met"><div class="met-l">Overdue</div><div class="met-v" style="color:var(--red)">${ovL.length}</div></div>
      <div class="met"><div class="met-l">Portfolio</div><div class="met-v">${fmt(openL.reduce((s,l)=>s+l.prin,0))}</div></div>
      <div class="met"><div class="met-l">Outstanding</div><div class="met-v" style="color:var(--amber)">${fmt(openL.reduce((s,l)=>s+lOutstanding(l),0))}</div></div>
      <div class="met"><div class="met-l">Collected</div><div class="met-v" style="color:var(--green)">${fmt(payments.reduce((s,p)=>s+p.amt,0))}</div></div>
      <div class="met"><div class="met-l">Interest earned</div><div class="met-v" style="color:var(--red)">${fmt(loans.reduce((s,l)=>s+lIntAccrued(l),0))}</div></div>
    </div><div style="font-size:11px;color:var(--text3);margin-top:8px">As of: ${new Date().toLocaleString('en-IN')}</div>`;
}

/* ── OVERLAY ───────────────────────────────────────────────────────── */
function closeOverlay(e){if(!e||e.target===document.getElementById('overlay'))document.getElementById('overlay').classList.remove('show');}
