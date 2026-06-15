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
      <h2>मेरा हिसाब — Loan Manager</h2>
      <p>${hasData?t('wel.welcomeBack'):t('wel.start')}</p>
      <div class="steps">
        <div class="step"><div class="step-num" style="background:var(--accent)">1</div><div><strong>${t('wel.step1')}</strong><br><span style="font-size:12px;color:var(--text3)">${t('wel.step1d')}</span></div></div>
        <div class="step"><div class="step-num" style="background:var(--green)">2</div><div><strong>${t('wel.step2')}</strong><br><span style="font-size:12px;color:var(--text3)">${t('wel.step2d')}</span></div></div>
        <div class="step"><div class="step-num" style="background:var(--amber)">3</div><div><strong>${t('wel.step3')}</strong><br><span style="font-size:12px;color:var(--text3)">${t('wel.step3d')}</span></div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-p" onclick="goTab('add-borrower')">${t('wel.addFirst')}</button>
        ${supported?`<button class="btn btn-g" onclick="openFile()">${t('wel.linkFile')}</button>`:''}
      </div>
    </div>`;
}
function skipWelcome(){
  document.getElementById('welcome-box').innerHTML='';
  document.getElementById('dash-inner').style.display='';
  renderDash();
}

/* ── NAV ───────────────────────────────────────────────────────────── */
const TITLES={dash:'nav.dash',borrowers:'nav.borrowers','add-borrower':'nav.addBorrower',payments:'nav.payments',reminders:'nav.reminders',reports:'nav.reports'};
function goTab(tab){
  currentTab=tab;
  ['dash','borrowers','add-borrower','payments','reminders','reports'].forEach(x=>{
    document.getElementById('sec-'+x).classList.toggle('on',x===tab);
    document.getElementById('nav-'+x).classList.toggle('active',x===tab);
  });
  document.getElementById('page-title').textContent=TITLES[tab]?t(TITLES[tab]):tab;
  if(tab==='dash')renderDash();
  if(tab==='borrowers'){renderBorrowers();document.getElementById('borrower-detail').innerHTML='';}
  if(tab==='payments'){clearPendingDocs();renderPay();}
  if(tab==='reminders')renderRem(remFilter);
  if(tab==='reports')renderReports();
  if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open');
}

/* Dashboard metric click → open the relevant filtered borrowers view. */
function goBorrowersFiltered(f){
  goTab('borrowers');
  const sel=document.getElementById('bs-f'); if(sel) sel.value=f;
  renderBorrowers();
}

function renderAll(){
  document.getElementById('welcome-box').innerHTML='';
  document.getElementById('dash-inner').style.display='';
  renderDash();renderPay();
}

/* Re-render whatever tab is currently visible — used by live cloud sync. */
function rerenderCurrent(){
  updateFooter();
  var pt=document.getElementById('page-title');
  if(pt&&TITLES[currentTab])pt.textContent=t(TITLES[currentTab]);
  if(typeof refreshSyncBadge==='function')refreshSyncBadge();
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
    <div class="met clk" onclick="goBorrowersFiltered('all')"><div class="met-l">${t('dash.borrowers')}</div><div class="met-v" style="color:var(--accent)">${borrowers.length}</div></div>
    <div class="met clk" onclick="goBorrowersFiltered('active')"><div class="met-l">${t('dash.activeLoans')}</div><div class="met-v" style="color:var(--green)">${actL.length}</div></div>
    <div class="met clk" onclick="goBorrowersFiltered('overdue')"><div class="met-l">${t('dash.overdue')}</div><div class="met-v" style="color:var(--red)">${ovL.length}</div></div>
    <div class="met clk" onclick="goTab('reports')"><div class="met-l">${t('dash.portfolio')}</div><div class="met-v">${fmt(totP)}</div></div>
    <div class="met clk" onclick="goBorrowersFiltered('all')"><div class="met-l">${t('dash.outstanding')}</div><div class="met-v" style="color:var(--amber)">${fmt(totO)}</div></div>
    <div class="met clk" onclick="goTab('reminders')"><div class="met-l">${t('dash.interestMonth')}</div><div class="met-v" style="color:var(--red)">${fmt(totI)}</div></div>
    <div class="met clk" onclick="goTab('payments')"><div class="met-l">${t('dash.totalCollected')}</div><div class="met-v" style="color:var(--green)">${fmt(totC)}</div></div>
  `;
  const top8=openL.slice(0,8);
  if(top8.length===0){document.getElementById('port-chart').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'+t('dash.noLoans')+'</div>';
  }else{
    const maxV=Math.max(...top8.map(l=>lTotalDue(l)),1);
    document.getElementById('port-chart').innerHTML=top8.map(l=>{
      const b=borrowers.find(x=>x.id===l.bid);
      const pw=Math.round(l.prin/maxV*100),iw=Math.round(lIntAccrued(l)/maxV*100);
      return`<div class="brow2"><div class="bname">${(b?b.name:'?').split(' ')[0]}</div><div class="btrack"><div class="bp" style="width:${pw}%">${pw>14?fmt(l.prin):''}</div><div class="bi" style="width:${iw}%">${iw>14?fmt(lIntAccrued(l)):''}</div></div></div>`;
    }).join('');
  }
  const topB=borrowers.filter(b=>bActiveLoans(b.id).length>0||bHasOverdue(b.id)).slice(0,8);
  if(topB.length===0){document.getElementById('dash-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>'+t('dash.noActive')+'</div>';return;}
  document.getElementById('dash-list').innerHTML=topB.map(b=>{
    const al=bActiveLoans(b.id);const ov=bHasOverdue(b.id);const tot=bTotalOut(b.id);
    return`<div style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="goToBorrower('${b.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${b.name}</span>
        <span class="badge ${ov?'bo':'ba'}">${ov?t('status.overdue'):t('status.active')}</span>
      </div>
      <div style="font-size:12px;color:var(--text3)">${al.length} ${t('bor.activeWord')} ${t('bd.loans')} · ${t('dash.outstanding')}: <span style="color:var(--amber)">${fmt(tot)}</span></div>
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
  if(filtered.length===0){document.getElementById('borrowers-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'+t('bor.noBorrowers')+' <a href="#" onclick="goTab(\'add-borrower\')" style="color:var(--accent)">'+t('bor.addOne')+'</a>.</div>';return;}
  document.getElementById('borrowers-list').innerHTML=filtered.map(b=>{
    const bl=bLoans(b.id);const al=bl.filter(l=>lStatus(l)==='active');const ov=bl.filter(l=>lStatus(l)==='overdue');const tot=bTotalOut(b.id);
    const loanTags=bl.slice(0,4).map(l=>{const st=lStatus(l);const cls=st==='active'?'ltag-a':st==='overdue'?'ltag-o':'ltag-c';return`<span class="ltag ${cls}" onclick="event.stopPropagation();viewLoan('${l.id}')">${fmt(l.prin)} @ ${l.rate}%</span>`;}).join('')+(bl.length>4?`<span style="font-size:11px;color:var(--text3)">+${bl.length-4} ${t('bor.more')}</span>`:'');
    return`<div class="bc-item" onclick="viewBorrower('${b.id}')" id="bci-${b.id}">
      <div class="bc-head">
        <div><div class="bc-name">${b.name}</div>
          <div class="bc-meta">${b.phone?`<span>📞 ${b.phone}</span>`:''} ${b.addr?`<span>📍 ${b.addr}</span>`:''}<span>${bl.length} ${t('bd.loans')} · ${al.length} ${t('bor.activeWord')} · ${ov.length} ${t('bor.overdueWord')}</span></div>
        </div>
        <div style="text-align:right"><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(tot)}</div><div style="font-size:11px;color:var(--text3)">${t('bor.outstanding')}</div></div>
      </div>
      ${bl.length>0?`<div class="bc-loans">${loanTags}</div>`:'<div style="font-size:12px;color:var(--text3)">'+t('bor.noLoansYet')+'</div>'}
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
  let loansHtml=bl.length===0?'<div style="font-size:13px;color:var(--text3);margin-bottom:16px">'+t('bd.noLoans')+'</div>':bl.map(l=>{
    const st=lStatus(l);const mi_=lMI(l);const ia=lIntAccrued(l);const td=lTotalDue(l);const pd=lPaid(l.id);const out=lOutstanding(l);
    const pct=Math.min(100,Math.round(pd/Math.max(1,td)*100));const col=pct>80?'var(--green)':pct<30?'var(--red)':'var(--accent)';
    const s=new Date(l.start);s.setHours(0,0,0,0);const mo=moBetween(s,TODAY);
    return`<div style="border:1px solid var(--border);border-radius:var(--rs);padding:14px;margin-bottom:10px;background:var(--bg3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div><span style="font-size:14px;font-weight:700;font-family:var(--mono)">${fmt(l.prin)}</span><span style="font-size:12px;color:var(--text3);margin-left:8px">${l.rate}%/mo · ${l.start}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge b${st[0]}">${t('status.'+st)}</span>
          <button class="btn btn-g btn-sm" onclick="showAddLoan('${id}','${l.id}')">${t('bd.edit')}</button>
          <button class="btn btn-d btn-sm" onclick="delLoan('${l.id}')">Del</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px">
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.monthlyInt')}</div><div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--mono)">${fmt(mi_)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.accrued')}</div><div style="font-size:13px;font-weight:600;color:var(--red);font-family:var(--mono)">${fmt(ia)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.totalDue')}</div><div style="font-size:13px;font-weight:600;color:var(--amber);font-family:var(--mono)">${fmt(td)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.paid')}</div><div style="font-size:13px;font-weight:600;color:var(--green);font-family:var(--mono)">${fmt(pd)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.perDay')}</div><div style="font-size:13px;font-weight:600;font-family:var(--mono)">${fmtd(mi_/30)}</div></div>
        <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em">${t('bd.monthsElapsed')}</div><div style="font-size:13px;font-weight:600;font-family:var(--mono)">${mo}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:var(--text3)"><span>${t('bd.recovery')}</span><span>${pct}% — <span style="color:var(--amber)">${fmt(out)} ${t('bd.left')}</span></span></div>
      <div class="prog"><div class="pf" style="width:${pct}%;background:${col}"></div></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-p btn-sm" onclick="quickPay('${id}','${l.id}')">💳 ${t('bd.recordPayment')}</button>
        <button class="btn btn-g btn-sm" onclick="showOTS('${l.id}')">🤝 ${t('bd.ots')}</button>
        <button class="btn btn-g btn-sm" onclick="showSchedule('${l.id}')">📅 ${t('bd.schedule')}</button>
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
          <button class="btn btn-p btn-sm" onclick="showAddLoan('${id}')">${t('bd.newLoan')}</button>
          <button class="btn btn-success btn-sm" onclick="sendWhatsApp('${id}')">📲 WhatsApp</button>
          <button class="btn btn-g btn-sm" onclick="callBorrower('${id}')">📞 ${t('bd.call')}</button>
          <button class="btn btn-g btn-sm" onclick="copyRem('${id}')">📋 ${t('bd.copy')}</button>
          <button class="btn btn-g btn-sm" onclick="showEditBorrower('${id}')">${t('bd.edit')}</button>
          <button class="btn btn-d btn-sm" onclick="delBorrower('${id}')">${t('bd.delete')}</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px">
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('bd.totalLoans')}</div><div style="font-size:20px;font-weight:700;font-family:var(--mono)">${bl.length}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('bd.totalPrincipal')}</div><div style="font-size:20px;font-weight:700;font-family:var(--mono)">${fmt(totPrin)}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('bd.totalPaid')}</div><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--green)">${fmt(totPaid)}</div></div>
        <div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('bd.outstanding')}</div><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(totOut)}</div></div>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">${t('bd.loans')}</div>
      ${loansHtml}
      ${docGalleryHtml(b)}
      <div class="divider"></div>
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">${t('bd.paymentHistory')} (${bPays.length})</div>
      ${bPays.length===0?'<div style="font-size:12px;color:var(--text3)">'+t('bd.noPayments')+'</div>':`
      <div class="tw"><table>
        <thead><tr><th>${t('th.date')}</th><th>${t('th.loan')}</th><th>${t('th.type')}</th><th class="r">${t('th.amount')}</th><th>${t('th.note')}</th><th></th></tr></thead>
        <tbody>${bPays.map(p=>{const l=loans.find(x=>x.id===p.lid);return`<tr><td class="p">${pDateTime(p)}</td><td style="color:var(--text3)">${l?fmt(l.prin):'?'}</td><td style="color:var(--text3)">${p.type}</td><td class="r" style="color:var(--green)">${fmt(p.amt)}</td><td style="color:var(--text3)">${p.note||'—'}</td><td><button class="btn btn-g btn-sm" onclick="sendReceipt('${p.id}')" title="${t('rcpt.btn')}">🧾</button></td></tr>`;}).join('')}</tbody>
      </table></div>`}
    </div>`;
  document.getElementById('borrower-detail').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ── ADD/EDIT BORROWER MODAL ───────────────────────────────────────── */
function showEditBorrower(id){
  const b=borrowers.find(x=>x.id===id);if(!b)return;
  document.getElementById('modal-body').innerHTML=`<h2>${t('eb.title')}</h2>
    <div class="fg"><label>${t('eb.name')}</label><input type="text" id="eb-name" value="${b.name}"></div>
    <div class="fg"><label>${t('ab.phone')}</label><input type="text" id="eb-phone" value="${b.phone||''}"></div>
    <div class="fg"><label>${t('ab.address')}</label><input type="text" id="eb-addr" value="${b.addr||''}"></div>
    <div class="fg"><label>${t('ab.notes')}</label><textarea id="eb-notes">${b.notes||''}</textarea></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">${t('lm.cancel')}</button><button class="btn btn-p" onclick="saveEditBorrower('${id}')">${t('lm.save')}</button></div>`;
  document.getElementById('overlay').classList.add('show');
}

/* ── ADD/EDIT LOAN MODAL ───────────────────────────────────────────── */
function showAddLoan(bid,editLid){
  const b=borrowers.find(x=>x.id===bid);if(!b)return;
  const el=editLid?loans.find(x=>x.id===editLid):null;
  clearPendingDocs();
  document.getElementById('modal-body').innerHTML=`<h2>${el?t('lm.editLoan'):t('lm.newLoanFor')+' '+b.name}</h2>
    <div class="fg"><label>${t('lm.principal')}</label><input type="number" id="nl-prin" value="${el?el.prin:''}" placeholder="50000" min="100"></div>
    <div class="fg"><label>${t('lm.monthlyRate')}</label><input type="number" id="nl-rate" value="${el?el.rate:2}" min="0.01" max="100" step="0.01"></div>
    <div class="fg"><label>${t('lm.startDate')}</label><input type="date" id="nl-start" value="${el?el.start:TODAY.toISOString().slice(0,10)}"></div>
    <div class="fg"><label>${t('lm.duration')}</label><input type="number" id="nl-dur" value="${el?el.dur:12}" min="1" max="360"></div>
    <div class="fg"><label>${t('lm.loanType')}</label><select id="nl-type"><option value="interest_only" ${el&&el.type==='interest_only'?'selected':''}>${t('lm.interestOnly')}</option><option value="emi" ${el&&el.type==='emi'?'selected':''}>${t('lm.emi')}</option><option value="flat" ${el&&el.type==='flat'?'selected':''}>${t('lm.flat')}</option></select></div>
    <div class="fg"><label>${t('lm.collateral')}</label><input type="text" id="nl-coll" value="${el&&el.coll?el.coll:''}" placeholder="Gold, property, etc."></div>
    <div class="fg"><label>${t('lm.notes')}</label><input type="text" id="nl-notes" value="${el&&el.notes?el.notes:''}" placeholder="Any notes"></div>
    ${el?'':`<div class="fg"><label>📷 ${t('doc.photos')}</label><div><button type="button" class="btn btn-g btn-sm" onclick="pickDoc({mode:'pending',refType:'loan'})">📷 ${t('doc.add')}</button></div><div class="pending-docs docgrid" style="margin-top:8px"></div></div>`}
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">${t('lm.cancel')}</button><button class="btn btn-p" onclick="${el?`saveEditLoan('${el.id}')`:`saveLoan('${bid}')`}">${el?t('lm.save'):t('lm.addLoan')}</button></div>`;
  document.getElementById('overlay').classList.add('show');
}
function viewLoan(lid){const l=loans.find(x=>x.id===lid);if(!l)return;goTab('borrowers');setTimeout(()=>{renderBorrowers();viewBorrower(l.bid);},80);}

/* ── OTS & SCHEDULE ────────────────────────────────────────────────── */
function showOTS(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const b=borrowers.find(x=>x.id===l.bid);const td=lTotalDue(l);const mi_=lMI(l);
  document.getElementById('modal-body').innerHTML=`<h2>🤝 ${t('ots.title')} ${b?b.name:''}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">${t('dash.principal')}</div><div style="font-size:16px;font-weight:700;font-family:var(--mono)">${fmt(l.prin)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">${t('bd.totalDue')}</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--amber)">${fmt(td)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">${t('bd.monthlyInt')}</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--red)">${fmt(mi_)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase">${t('bd.accrued')}</div><div style="font-size:16px;font-weight:700;font-family:var(--mono);color:var(--red)">${fmt(lIntAccrued(l))}</div></div>
    </div>
    <div class="fg"><label>${t('ots.settlementOffered')}</label><input type="number" id="ots-amt" value="${Math.round(td)}" oninput="calcOTS('${lid}')"></div>
    <div id="ots-res"></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">${t('ots.close')}</button></div>`;
  document.getElementById('overlay').classList.add('show');calcOTS(lid);
}
function calcOTS(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const s=parseFloat(document.getElementById('ots-amt').value)||0;const td=lTotalDue(l);const w=td-s;const wp=((w/td)*100).toFixed(1);
  let h='';
  if(s>=td)h=`<div style="background:var(--green-bg);border:1px solid rgba(52,201,123,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--green);font-weight:600">${t('ots.fullRecovery')}</div><div style="font-size:12px;color:var(--text2);margin-top:4px">${fmt(s)} covers full due of ${fmt(td)}${s>td?` · Excess: ${fmt(s-td)}`:''}</div></div>`;
  else if(s<l.prin)h=`<div style="background:var(--red-bg);border:1px solid rgba(240,82,82,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--red);font-weight:600">${t('ots.belowPrincipal')} ${fmt(l.prin-s)}</div><div style="font-size:12px;color:var(--text2);margin-top:4px">${t('ots.waiver')}: ${fmt(w)} (${wp}%)</div></div>`;
  else h=`<div style="background:var(--amber-bg);border:1px solid rgba(245,166,35,.3);border-radius:var(--rs);padding:14px"><div style="color:var(--amber);font-weight:600">${fmt(s)} — ${t('ots.waiver')}: ${fmt(w)} (${wp}%)</div><div style="font-size:12px;color:var(--text2);margin-top:4px">Above principal: ${fmt(s-l.prin)} · Total due was ${fmt(td)}</div></div>`;
  document.getElementById('ots-res').innerHTML=h;
}
function showSchedule(lid){
  const l=loans.find(x=>x.id===lid);if(!l)return;
  const s=new Date(l.start);s.setHours(0,0,0,0);const mi_=lMI(l);
  let rows='';
  for(let i=1;i<=l.dur;i++){const d=new Date(s.getFullYear(),s.getMonth()+i-1,1);const cur=d.getFullYear()===TODAY.getFullYear()&&d.getMonth()===TODAY.getMonth();rows+=`<tr class="${cur?'cur-row':''}"><td class="p">${MS[d.getMonth()]} ${d.getFullYear()}${cur?' ★':''}</td><td class="r">${fmt(mi_)}</td><td class="r">${i===l.dur?fmt(mi_+l.prin):fmt(mi_)}</td><td class="r">${i===l.dur?'₹0':fmt(l.prin)}</td></tr>`;}
  document.getElementById('modal-body').innerHTML=`<h2>📅 ${t('sch.title')} ${fmt(l.prin)} @ ${l.rate}%/mo</h2>
    <div class="tw" style="max-height:400px;overflow-y:auto"><table><thead><tr><th>${t('th.month')}</th><th class="r">${t('th.interest')}</th><th class="r">${t('th.payment')}</th><th class="r">${t('th.balance')}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:11px;color:var(--text3);margin-top:6px">${t('sch.currentMonth')}</div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">${t('ots.close')}</button></div>`;
  document.getElementById('overlay').classList.add('show');
}

/* ── PAYMENTS RENDER ───────────────────────────────────────────────── */
function renderPay(){
  const bSel=document.getElementById('p-who');const cur=bSel.value;
  bSel.innerHTML='<option value="">'+t('pay.selectBorrower')+'</option>'+borrowers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  if(cur)bSel.value=cur;updateLoanSelect();renderPendingThumbs();
  const rec=[...payments].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,25);
  if(rec.length===0){document.getElementById('pay-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>'+t('pay.noPayments')+'</div>';return;}
  document.getElementById('pay-list').innerHTML=`<div class="tw"><table><thead><tr><th>${t('th.borrower')}</th><th>${t('th.loan')}</th><th>${t('th.date')}</th><th>${t('th.type')}</th><th class="r">${t('th.amount')}</th><th>${t('th.note')}</th></tr></thead>
    <tbody>${rec.map(p=>{const l=loans.find(x=>x.id===p.lid);const b=l?borrowers.find(x=>x.id===l.bid):null;return`<tr><td class="p">${b?b.name:'?'}</td><td style="color:var(--text3);font-family:var(--mono);font-size:12px">${l?fmt(l.prin):'?'}</td><td>${pDateTime(p)}</td><td style="color:var(--text3)">${p.type}</td><td class="r" style="color:var(--green)">${fmt(p.amt)}</td><td style="color:var(--text3)">${p.note||'—'}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function updateLoanSelect(){
  const bid=document.getElementById('p-who').value;const lSel=document.getElementById('p-loan');
  if(!bid){lSel.innerHTML='<option value="">'+t('pay.selectFirst')+'</option>';document.getElementById('p-amt').value='';return;}
  const bl=bLoans(bid).filter(l=>!l.closed);
  if(bl.length===0){lSel.innerHTML='<option value="">'+t('dash.noActive')+'</option>';return;}
  lSel.innerHTML=bl.map(l=>`<option value="${l.id}">${fmt(l.prin)} @ ${l.rate}%/mo · ${t('status.'+lStatus(l))}</option>`).join('');
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
  if(items.length===0){document.getElementById('rem-list').innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>'+t('rem.nothing')+'</div>';return;}
  document.getElementById('rem-list').innerHTML=items.map(({b,al,ov,tot,totMI,daysLeft})=>{
    const cls=ov?'urg':daysLeft<=5?'wrn':'ok';const label=ov?'🔴 '+t('rem.overdue'):(daysLeft<=5?'🟡 ':'🟢 ')+daysLeft+' '+t('rem.days');
    return`<div class="ri ${cls}"><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px">${b.name} ${b.phone?`<span style="color:var(--text3);font-weight:400">· ${b.phone}</span>`:''}</div><div style="font-size:12px;color:var(--text3)">${label} · ${al.length} ${t('bd.loans')} · ${t('rem.monthly')}: ${fmt(totMI)} · ${t('rem.outstanding')}: <span style="color:var(--amber)">${fmt(tot)}</span></div></div><div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" onclick="sendWhatsApp('${b.id}')">📲</button><button class="btn btn-g btn-sm" onclick="copyRem('${b.id}')">📋</button><button class="btn btn-g btn-sm" onclick="callBorrower('${b.id}')">📞</button><button class="btn btn-p btn-sm" onclick="goToBorrower('${b.id}')">${t('rem.view')}</button></div></div>`;
  }).join('');
}
function waMessage(b){
  const al=bActiveLoans(b.id);const tot=bTotalOut(b.id);const totMI=al.reduce((s,l)=>s+lMI(l),0);
  return `नमस्ते ${b.name} जी 🙏\n\nआपके loan की जानकारी:\n• Active loans: ${al.length}\n• कुल मासिक ब्याज: ${fmt(totMI)}\n• कुल बकाया: ${fmt(tot)}\n\nकृपया जल्द भुगतान करें।\nधन्यवाद।`;
}
// Borrower ka mobile → WhatsApp format (India: 10-digit ho to 91 apne-aap lagta hai)
function waNumber(phone){
  let d=(phone||'').replace(/\D/g,'');
  if(d.length===10) d='91'+d;
  else if(d.length===11 && d.charAt(0)==='0') d='91'+d.slice(1);
  return d;
}
// Aapke apne WhatsApp se: chat khulti hai message ready ke saath — aap bas Send dabate ho
function sendWhatsApp(bid){
  const b=borrowers.find(x=>x.id===bid);if(!b)return;
  const num=waNumber(b.phone);
  if(num.length<12){toast('Is borrower ka sahi mobile number nahi hai — pehle number add/edit karein.','err');return;}
  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(waMessage(b)),'_blank');
}
function copyRem(bid){
  const b=borrowers.find(x=>x.id===bid);if(!b)return;
  navigator.clipboard.writeText(waMessage(b)).then(()=>toast(t('msg.reminderCopied'))).catch(()=>toast(t('msg.copyFail'),'err'));
}

/* ── REPORTS ───────────────────────────────────────────────────────── */
function renderReports(){
  const actL=loans.filter(l=>lStatus(l)==='active');const ovL=loans.filter(l=>lStatus(l)==='overdue');const openL=loans.filter(l=>!l.closed);
  document.getElementById('report-body').innerHTML=`
    <div class="metrics">
      <div class="met"><div class="met-l">${t('dash.borrowers')}</div><div class="met-v">${borrowers.length}</div></div>
      <div class="met"><div class="met-l">${t('rep.totalLoans')}</div><div class="met-v">${loans.length}</div></div>
      <div class="met"><div class="met-l">${t('bor.active')}</div><div class="met-v" style="color:var(--green)">${actL.length}</div></div>
      <div class="met"><div class="met-l">${t('bor.overdue')}</div><div class="met-v" style="color:var(--red)">${ovL.length}</div></div>
      <div class="met"><div class="met-l">${t('dash.portfolio')}</div><div class="met-v">${fmt(openL.reduce((s,l)=>s+l.prin,0))}</div></div>
      <div class="met"><div class="met-l">${t('dash.outstanding')}</div><div class="met-v" style="color:var(--amber)">${fmt(openL.reduce((s,l)=>s+lOutstanding(l),0))}</div></div>
      <div class="met"><div class="met-l">${t('rep.collected')}</div><div class="met-v" style="color:var(--green)">${fmt(payments.reduce((s,p)=>s+p.amt,0))}</div></div>
      <div class="met"><div class="met-l">${t('rep.interestEarned')}</div><div class="met-v" style="color:var(--red)">${fmt(loans.reduce((s,l)=>s+lIntAccrued(l),0))}</div></div>
    </div><div style="font-size:11px;color:var(--text3);margin-top:8px">${t('rep.asOf')} ${new Date().toLocaleString('en-IN')}</div>`;
}

/* ── OVERLAY ───────────────────────────────────────────────────────── */
function closeOverlay(e){if(!e||e.target===document.getElementById('overlay'))document.getElementById('overlay').classList.remove('show');}

/* ── QUICK LOAN CALCULATOR (no loan created — just a what-if) ──────── */
function showCalc(){
  document.getElementById('modal-body').innerHTML=`<h2>🧮 ${t('calc.title')}</h2>
    <div class="fgrid">
      <div class="fg"><label>${t('calc.amount')}</label><input type="number" id="calc-amt" value="50000" oninput="calcCompute()"></div>
      <div class="fg"><label>${t('calc.rate')}</label><input type="number" id="calc-rate" value="2" step="0.01" oninput="calcCompute()"></div>
      <div class="fg"><label>${t('calc.months')}</label><input type="number" id="calc-mo" value="12" oninput="calcCompute()"></div>
    </div>
    <div id="calc-res" style="margin-top:8px"></div>
    <div class="brow"><button class="btn btn-g" onclick="closeOverlay()">${t('ots.close')}</button></div>`;
  document.getElementById('overlay').classList.add('show');
  calcCompute();
}
function calcCompute(){
  const amt=parseFloat(document.getElementById('calc-amt').value)||0;
  const rate=parseFloat(document.getElementById('calc-rate').value)||0;
  const mo=parseInt(document.getElementById('calc-mo').value)||0;
  const mi=amt*rate/100, ti=mi*mo, td=amt+ti;
  const cell=(lbl,val,col)=>`<div style="background:var(--bg3);border-radius:var(--rs);padding:12px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase">${lbl}</div><div style="font-size:18px;font-weight:700;font-family:var(--mono)${col?';color:'+col:''}">${val}</div></div>`;
  document.getElementById('calc-res').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    ${cell(t('calc.monthlyInt'),fmt(mi),'var(--red)')}
    ${cell(t('calc.perDay'),fmtd(mi/30))}
    ${cell(t('calc.totalInt'),fmt(ti),'var(--amber)')}
    ${cell(t('calc.totalDue'),fmt(td),'var(--green)')}
  </div>`;
}

/* ── DOCUMENTS / PHOTOS (UI) ───────────────────────────────────────── */
function renderPendingThumbs(){
  const html=pendingDocs.map((d,i)=>`<div class="docthumb"><img src="${d.image}" alt=""><button class="docx" onclick="removePending(${i})">✕</button></div>`).join('');
  document.querySelectorAll('.pending-docs').forEach(el=>el.innerHTML=html);
}
function removePending(i){ pendingDocs.splice(i,1); renderPendingThumbs(); }
function docLabel(d){
  if(d.refType==='borrower') return t('doc.id');
  if(d.refType==='loan'){ const l=loans.find(x=>x.id===d.refId); return t('doc.loan')+(l?' '+fmt(l.prin):''); }
  if(d.refType==='payment'){ const p=payments.find(x=>x.id===d.refId); return t('doc.payment')+(p?' '+fmt(p.amt):''); }
  return '';
}
function docGalleryHtml(b){
  const all=bAllDocs(b);
  return `<div class="divider"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
      <div style="font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em">📷 ${t('doc.documents')} (${all.length})</div>
      <button class="btn btn-g btn-sm" onclick="pickDoc({mode:'borrower',id:'${b.id}'})">📷 ${t('doc.addId')}</button>
    </div>
    ${all.length===0?`<div style="font-size:12px;color:var(--text3)">${t('doc.none')}</div>`:`<div class="docgrid">${all.map(d=>`<div class="docthumb" onclick="showDoc('${d.id}')"><img src="${d.image}" alt=""><span class="doclbl">${docLabel(d)}</span></div>`).join('')}</div>`}`;
}
function showDoc(id){
  const d=docs.find(x=>x.id===id); if(!d) return;
  document.getElementById('modal-body').innerHTML=`<h2>📷 ${docLabel(d)}</h2>
    <img src="${d.image}" alt="" style="width:100%;border-radius:var(--rs);margin-bottom:14px">
    <div class="brow"><button class="btn btn-d" onclick="delDoc('${id}')">${t('doc.delete')}</button><button class="btn btn-g" onclick="closeOverlay()">${t('ots.close')}</button></div>`;
  document.getElementById('overlay').classList.add('show');
}
