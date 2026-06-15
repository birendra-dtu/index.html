/* =====================================================================
   i18n.js — Hindi / English language toggle
   ---------------------------------------------------------------------
   Hindi mode = Devanagari + aam-fehm English words (Loan, Mobile,
   WhatsApp, Login, Email, Password, Date, Save, OK …) waise hi rehte.
   - Static HTML:  elements par  data-i18n="key"  ya  data-i18n-ph="key"
   - Dynamic (ui.js): t('key') use karo
   ===================================================================== */

const I18N = {
  en: {
    /* nav */
    'nav.dash':'Dashboard','nav.borrowers':'Borrowers','nav.addBorrower':'Add Borrower',
    'nav.payments':'Payments','nav.reminders':'Reminders','nav.reports':'Reports',
    'app.tagline':'Loan Manager v4.0 · Cloud',
    /* topbar / sync */
    'sync.synced':'Synced','sync.syncing':'Syncing…','sync.saving':'Saving…','sync.offline':'Offline',
    'app.saveToFile':'Save to File','app.logout':'Log out','app.lastSync':'Last sync',
    /* dashboard */
    'dash.borrowers':'Borrowers','dash.activeLoans':'Active Loans','dash.overdue':'Overdue',
    'dash.portfolio':'Portfolio','dash.outstanding':'Outstanding','dash.interestMonth':'Interest/Month',
    'dash.totalCollected':'Total Collected','dash.portfolioOverview':'Portfolio Overview',
    'dash.principal':'Principal','dash.interestDue':'Interest due','dash.activeOverdue':'Active & Overdue',
    'dash.noLoans':'No loans yet.','dash.noActive':'No active loans.',
    /* borrowers list */
    'bor.searchPh':'Search name, phone…','bor.all':'All','bor.active':'Active','bor.overdue':'Overdue',
    'bor.new':'+ New','bor.outstanding':'outstanding','bor.noBorrowers':'No borrowers.',
    'bor.addOne':'Add one','bor.loans':'loans','bor.activeWord':'active','bor.overdueWord':'overdue',
    'bor.noLoansYet':'No loans yet','bor.more':'more',
    /* add borrower */
    'ab.title':'New Borrower','ab.fullName':'Full Name *','ab.phone':'Mobile','ab.address':'Address',
    'ab.id':'ID / Aadhaar (optional)','ab.notes':'Notes','ab.clear':'Clear','ab.save':'Save Borrower',
    'ab.phNote':'Any notes about this borrower',
    'eb.title':'Edit Borrower','eb.name':'Name',
    /* borrower detail */
    'bd.newLoan':'+ New Loan','bd.whatsapp':'WhatsApp','bd.copy':'Copy','bd.edit':'Edit','bd.delete':'Delete',
    'bd.totalLoans':'Total loans','bd.totalPrincipal':'Total principal','bd.totalPaid':'Total paid',
    'bd.outstanding':'Outstanding','bd.loans':'Loans','bd.monthlyInt':'Monthly int.','bd.accrued':'Accrued',
    'bd.totalDue':'Total due','bd.paid':'Paid','bd.perDay':'Per day','bd.monthsElapsed':'Months elapsed',
    'bd.recovery':'Recovery','bd.left':'left','bd.recordPayment':'Record Payment','bd.ots':'OTS',
    'bd.schedule':'Schedule','bd.paymentHistory':'Payment History','bd.noLoans':'No loans yet.',
    'bd.noPayments':'No payments yet.','bd.reminder':'Reminder',
    /* table headers */
    'th.date':'Date','th.loan':'Loan','th.type':'Type','th.amount':'Amount','th.note':'Note',
    'th.borrower':'Borrower','th.month':'Month','th.interest':'Interest','th.payment':'Payment','th.balance':'Balance',
    /* loan modal */
    'lm.newLoanFor':'New Loan —','lm.editLoan':'Edit Loan','lm.principal':'Principal ₹ *',
    'lm.monthlyRate':'Monthly Rate (%)','lm.startDate':'Start Date *','lm.duration':'Duration (months)',
    'lm.loanType':'Loan Type','lm.interestOnly':'Interest only','lm.emi':'EMI','lm.flat':'Flat rate',
    'lm.collateral':'Collateral','lm.notes':'Notes','lm.addLoan':'Add Loan','lm.save':'Save','lm.cancel':'Cancel',
    /* payments */
    'pay.record':'Record Payment','pay.borrower':'Borrower *','pay.loan':'Loan *','pay.date':'Date',
    'pay.amount':'Amount ₹ *','pay.type':'Type','pay.note':'Note','pay.recordBtn':'Record Payment',
    'pay.recent':'Recent Payments','pay.selectBorrower':'— Select borrower —','pay.selectFirst':'— Select borrower first —',
    'pay.noPayments':'No payments yet.','pay.tMonthly':'Monthly interest','pay.tPrincipal':'Principal repayment',
    'pay.tOts':'OTS settlement','pay.tPartial':'Partial payment','pay.tPenalty':'Penalty',
    /* reminders */
    'rem.dueThisMonth':'Due This Month','rem.overdue':'Overdue','rem.allActive':'All Active',
    'rem.nothing':'Nothing here.','rem.view':'View','rem.overdueLbl':'🔴 Overdue','rem.dueIn':'Due in',
    'rem.days':'days','rem.monthly':'Monthly','rem.outstanding':'Outstanding',
    /* reports */
    'rep.storageBackup':'Storage & Backup','rep.syncNow':'☁️ Sync to Cloud Now','rep.openFile':'📂 Open / Link Data File',
    'rep.saveFile':'💾 Save to File Now','rep.exportLoans':'📥 Export Loans (Excel)','rep.exportPays':'📥 Export Payments (Excel)',
    'rep.downloadJSON':'📤 Download JSON Backup','rep.importJSON':'📤 Import JSON Backup','rep.summary':'Summary Report',
    'rep.totalLoans':'Total loans','rep.collected':'Collected','rep.interestEarned':'Interest earned','rep.asOf':'As of:',
    /* OTS modal */
    'ots.title':'OTS —','ots.settlementOffered':'Settlement Offered ₹','ots.close':'Close',
    'ots.fullRecovery':'✓ Full recovery','ots.waiver':'Waiver','ots.belowPrincipal':'⚠ Below principal — LOSS of',
    /* schedule */
    'sch.title':'Schedule —','sch.currentMonth':'★ = current month',
    /* status */
    'status.active':'active','status.overdue':'overdue','status.closed':'closed',
    /* welcome */
    'wel.h2':'मेरा हिसाब — Loan Manager','wel.addFirst':'+ Add First Borrower',
    /* auth */
    'auth.login':'Login','auth.createAccount':'Create account','auth.email':'Email','auth.password':'Password',
    'auth.forgot':'Forgot password?','auth.loginBtn':'Log in','auth.createBtn':'Create account','auth.or':'or',
    'auth.google':'Continue with Google','auth.tagline':'Loan Manager · Cloud Edition',
    'auth.foot':'Your data is private and tied to your account. Works offline · syncs across all your devices.',
    /* documents */
    'doc.documents':'Documents','doc.add':'Add Photo','doc.addId':'Add ID','doc.id':'ID','doc.loan':'Loan','doc.payment':'Payment','doc.none':'No documents yet.','doc.delete':'Delete','doc.confirmDelete':'Delete this photo?','doc.photos':'Photos / Documents (optional)',
    /* toasts & confirms */
    'msg.nameReq':'Name required.','msg.borrowerAdded':'Borrower added','msg.updated':'Updated!','msg.deleted':'Deleted.',
    'msg.principalReq':'Enter a valid principal.','msg.startReq':'Start date required.','msg.loanAdded':'Loan added!','msg.loanUpdated':'Loan updated!','msg.loanDeleted':'Loan deleted.',
    'msg.selBorrower':'Select a borrower.','msg.selLoan':'Select a loan.','msg.validAmt':'Enter a valid amount.','msg.paymentRec':'Payment recorded',
    'msg.reminderCopied':'Reminder copied!','msg.copyFail':'Copy failed.','msg.exported':'Exported!','msg.backupDl':'Backup downloaded!','msg.restored':'Restored!',
    'msg.delBorrowerConfirm':'Delete this borrower and all their loans + payments?','msg.delLoanConfirm':'Delete this loan and all its payments?','msg.restoreConfirm':'Restore this backup? It replaces current data.',
    /* welcome */
    'wel.welcomeBack':'Welcome back! Your data is synced across all your devices.','wel.start':'Add your first borrower to get started — everything saves to your account automatically.',
    'wel.step1':'Add borrowers & loans','wel.step1d':'Everything tied to your account','wel.step2':'Auto cloud sync','wel.step2d':'Saved to cloud + offline backup','wel.step3':'Use on any device','wel.step3d':'Phone, tablet, desktop — same login','wel.linkFile':'📂 Link a backup file (optional)',
    /* auth errors & messages */
    'err.invalid-email':'That email address looks invalid.','err.user-disabled':'This account has been disabled.','err.user-not-found':'No account found with that email.','err.wrong-password':'Incorrect password.','err.invalid-credential':'Incorrect email or password.','err.email-already-in-use':'An account already exists with this email. Try logging in.','err.weak-password':'Password is too weak (min 6 characters).','err.too-many-requests':'Too many attempts. Please wait and try again.','err.network':'Network error. Check your connection.','err.popup-blocked':'Popup blocked — allow popups for Google sign-in.','err.operation-not-allowed':'This sign-in method is not enabled in Firebase.','err.unauthorized-domain':'This domain is not authorised in Firebase Auth settings.','err.generic':'Something went wrong.',
    'authmsg.enterBoth':'Enter email and password.','authmsg.passShort':'Password must be at least 6 characters.','authmsg.enterEmailFirst':'Enter your email above first, then tap "Forgot password?".',
    'msg.noLoans':'No loans.','msg.noPayments':'No payments.','msg.invalidFile':'Invalid file.','msg.failed':'Failed.',
    /* calculator + call + receipt */
    'calc.title':'Loan Calculator','calc.amount':'Amount ₹','calc.rate':'Monthly Rate %','calc.months':'Months','calc.monthlyInt':'Monthly interest','calc.totalInt':'Total interest','calc.totalDue':'Total (with principal)','calc.perDay':'Per day','calc.open':'Calculator','bd.call':'Call','rcpt.btn':'Send receipt','msg.noPhone':'No mobile number.','msg.receiptSent':'Opening WhatsApp…','msg.confirmPay':'Record this payment?'
  },
  hi: {
    /* nav */
    'nav.dash':'होम','nav.borrowers':'ग्राहक','nav.addBorrower':'नया ग्राहक',
    'nav.payments':'जमा','nav.reminders':'याद दिलाएं','nav.reports':'रिपोर्ट',
    'app.tagline':'Loan Manager v4.0 · Cloud',
    /* topbar / sync */
    'sync.synced':'सेव हो गया','sync.syncing':'सेव हो रहा…','sync.saving':'सेव हो रहा…','sync.offline':'ऑफलाइन',
    'app.saveToFile':'File में Save','app.logout':'बाहर निकलें','app.lastSync':'आखिरी सेव',
    /* dashboard */
    'dash.borrowers':'ग्राहक','dash.activeLoans':'चालू Loan','dash.overdue':'बकाया',
    'dash.portfolio':'कुल दिया हुआ','dash.outstanding':'बकाया रकम','dash.interestMonth':'महीने का ब्याज',
    'dash.totalCollected':'कुल वसूली','dash.portfolioOverview':'कुल कर्ज़ का ब्यौरा',
    'dash.principal':'असल रकम','dash.interestDue':'बकाया ब्याज','dash.activeOverdue':'चालू और बकाया',
    'dash.noLoans':'अभी कोई Loan नहीं।','dash.noActive':'कोई चालू Loan नहीं।',
    /* borrowers list */
    'bor.searchPh':'नाम, Mobile खोजें…','bor.all':'सभी','bor.active':'चालू','bor.overdue':'बकाया',
    'bor.new':'+ नया','bor.outstanding':'बकाया','bor.noBorrowers':'कोई ग्राहक नहीं।',
    'bor.addOne':'एक जोड़ें','bor.loans':'Loan','bor.activeWord':'चालू','bor.overdueWord':'बकाया',
    'bor.noLoansYet':'अभी कोई Loan नहीं','bor.more':'और',
    /* add borrower */
    'ab.title':'नया ग्राहक','ab.fullName':'पूरा नाम *','ab.phone':'Mobile','ab.address':'पता',
    'ab.id':'ID / Aadhaar (ज़रूरी नहीं)','ab.notes':'नोट','ab.clear':'साफ करें','ab.save':'ग्राहक सेव करें',
    'ab.phNote':'इस ग्राहक के बारे में कोई नोट',
    'eb.title':'ग्राहक बदलें','eb.name':'नाम',
    /* borrower detail */
    'bd.newLoan':'+ नया Loan','bd.whatsapp':'WhatsApp','bd.copy':'कॉपी','bd.edit':'बदलें','bd.delete':'हटाएं',
    'bd.totalLoans':'कुल Loan','bd.totalPrincipal':'कुल असल रकम','bd.totalPaid':'कुल जमा',
    'bd.outstanding':'बकाया रकम','bd.loans':'Loan','bd.monthlyInt':'महीने का ब्याज','bd.accrued':'अब तक का ब्याज',
    'bd.totalDue':'कुल बकाया','bd.paid':'जमा','bd.perDay':'रोज़ का','bd.monthsElapsed':'कितने महीने हुए',
    'bd.recovery':'वसूली','bd.left':'बाकी','bd.recordPayment':'जमा दर्ज करें','bd.ots':'एकमुश्त समझौता',
    'bd.schedule':'किस्त का हिसाब','bd.paymentHistory':'जमा का इतिहास','bd.noLoans':'अभी कोई Loan नहीं।',
    'bd.noPayments':'अभी कोई जमा नहीं।','bd.reminder':'याद दिलाएं',
    /* table headers */
    'th.date':'तारीख','th.loan':'Loan','th.type':'प्रकार','th.amount':'रकम','th.note':'नोट',
    'th.borrower':'ग्राहक','th.month':'महीना','th.interest':'ब्याज','th.payment':'जमा','th.balance':'बाकी',
    /* loan modal */
    'lm.newLoanFor':'नया Loan —','lm.editLoan':'Loan बदलें','lm.principal':'असल रकम ₹ *',
    'lm.monthlyRate':'महीने का ब्याज (%)','lm.startDate':'शुरू तारीख *','lm.duration':'कितने महीने',
    'lm.loanType':'Loan का प्रकार','lm.interestOnly':'सिर्फ ब्याज','lm.emi':'EMI','lm.flat':'सीधा ब्याज',
    'lm.collateral':'गिरवी','lm.notes':'नोट','lm.addLoan':'Loan जोड़ें','lm.save':'सेव','lm.cancel':'रद्द करें',
    /* payments */
    'pay.record':'जमा दर्ज करें','pay.borrower':'ग्राहक *','pay.loan':'Loan *','pay.date':'तारीख',
    'pay.amount':'रकम ₹ *','pay.type':'प्रकार','pay.note':'नोट','pay.recordBtn':'जमा दर्ज करें',
    'pay.recent':'हाल के जमा','pay.selectBorrower':'— ग्राहक चुनें —','pay.selectFirst':'— पहले ग्राहक चुनें —',
    'pay.noPayments':'अभी कोई जमा नहीं।','pay.tMonthly':'महीने का ब्याज','pay.tPrincipal':'असल रकम वापसी',
    'pay.tOts':'एकमुश्त समझौता','pay.tPartial':'आंशिक जमा','pay.tPenalty':'जुर्माना',
    /* reminders */
    'rem.dueThisMonth':'इस महीने बकाया','rem.overdue':'बकाया','rem.allActive':'सभी चालू',
    'rem.nothing':'यहां कुछ नहीं।','rem.view':'देखें','rem.overdueLbl':'🔴 बकाया','rem.dueIn':'बकाया',
    'rem.days':'दिन में','rem.monthly':'महीने का','rem.outstanding':'बकाया',
    /* reports */
    'rep.storageBackup':'सेव और बैकअप','rep.syncNow':'☁️ अभी Cloud में Sync करें','rep.openFile':'📂 Data File खोलें/जोड़ें',
    'rep.saveFile':'💾 अभी File में Save','rep.exportLoans':'📥 Loan डाउनलोड (Excel)','rep.exportPays':'📥 जमा डाउनलोड (Excel)',
    'rep.downloadJSON':'📤 JSON बैकअप डाउनलोड','rep.importJSON':'📤 JSON बैकअप अपलोड','rep.summary':'सारांश रिपोर्ट',
    'rep.totalLoans':'कुल Loan','rep.collected':'वसूली','rep.interestEarned':'कमाया ब्याज','rep.asOf':'तारीख तक:',
    /* OTS modal */
    'ots.title':'एकमुश्त समझौता —','ots.settlementOffered':'समझौते की रकम ₹','ots.close':'बंद करें',
    'ots.fullRecovery':'✓ पूरी वसूली','ots.waiver':'छूट','ots.belowPrincipal':'⚠ असल रकम से कम — नुकसान',
    /* schedule */
    'sch.title':'किस्त का हिसाब —','sch.currentMonth':'★ = इस महीने',
    /* status */
    'status.active':'चालू','status.overdue':'बकाया','status.closed':'बंद',
    /* welcome */
    'wel.h2':'मेरा हिसाब — Loan Manager','wel.addFirst':'+ पहला ग्राहक जोड़ें',
    /* auth */
    'auth.login':'Login','auth.createAccount':'नया खाता','auth.email':'Email','auth.password':'Password',
    'auth.forgot':'Password भूल गए?','auth.loginBtn':'Login करें','auth.createBtn':'खाता बनाएं','auth.or':'या',
    'auth.google':'Google से Login','auth.tagline':'Loan Manager · Cloud Edition',
    'auth.foot':'आपका data निजी है और आपके खाते से जुड़ा है। ऑफलाइन भी चलता है · सभी devices पर sync होता है।',
    /* documents */
    'doc.documents':'दस्तावेज़','doc.add':'Photo जोड़ें','doc.addId':'ID जोड़ें','doc.id':'ID','doc.loan':'Loan','doc.payment':'जमा','doc.none':'अभी कोई दस्तावेज़ नहीं।','doc.delete':'हटाएं','doc.confirmDelete':'ये photo हटाएं?','doc.photos':'Photos / दस्तावेज़ (ज़रूरी नहीं)',
    /* toasts & confirms */
    'msg.nameReq':'नाम ज़रूरी है।','msg.borrowerAdded':'ग्राहक जुड़ गया','msg.updated':'अपडेट हो गया!','msg.deleted':'हटा दिया।',
    'msg.principalReq':'सही असल रकम डालें।','msg.startReq':'शुरू तारीख ज़रूरी है।','msg.loanAdded':'Loan जुड़ गया!','msg.loanUpdated':'Loan अपडेट हुआ!','msg.loanDeleted':'Loan हटा दिया।',
    'msg.selBorrower':'ग्राहक चुनें।','msg.selLoan':'Loan चुनें।','msg.validAmt':'सही रकम डालें।','msg.paymentRec':'जमा दर्ज हो गया',
    'msg.reminderCopied':'Reminder copy हो गया!','msg.copyFail':'Copy नहीं हुआ।','msg.exported':'Export हो गया!','msg.backupDl':'Backup download हो गया!','msg.restored':'Restore हो गया!',
    'msg.delBorrowerConfirm':'इस ग्राहक और इसके सभी loan + जमा हटा दें?','msg.delLoanConfirm':'इस loan और इसके सभी जमा हटा दें?','msg.restoreConfirm':'ये backup restore करें? मौजूदा data बदल जाएगा।',
    /* welcome */
    'wel.welcomeBack':'वापसी पर स्वागत है! आपका data सभी devices पर sync है।','wel.start':'शुरू करने के लिए पहला ग्राहक जोड़ें — सब अपने-आप आपके account में save होता है।',
    'wel.step1':'ग्राहक और loan जोड़ें','wel.step1d':'सब आपके account से जुड़ा','wel.step2':'अपने-आप cloud sync','wel.step2d':'Cloud + offline backup','wel.step3':'किसी भी device पर चलाएं','wel.step3d':'Phone, tablet, desktop — एक ही login','wel.linkFile':'📂 Backup file जोड़ें (ज़रूरी नहीं)',
    /* auth errors & messages */
    'err.invalid-email':'Email address galat lag raha hai.','err.user-disabled':'Ye account band kar diya gaya hai.','err.user-not-found':'Is email se koi account nahi mila.','err.wrong-password':'Password galat hai.','err.invalid-credential':'Email ya password galat hai.','err.email-already-in-use':'Is email se account pehle se hai. Login karein.','err.weak-password':'Password kamzor hai (kam se kam 6 akshar).','err.too-many-requests':'Bahut baar try kiya. Thodi der baad karein.','err.network':'Network error. Connection check karein.','err.popup-blocked':'Popup block ho gaya — Google login ke liye popup allow karein.','err.operation-not-allowed':'Ye sign-in method Firebase me enable nahi hai.','err.unauthorized-domain':'Ye domain Firebase Auth me allowed nahi hai.','err.generic':'Kuch galat ho gaya.',
    'authmsg.enterBoth':'Email aur password daalein.','authmsg.passShort':'Password kam se kam 6 akshar ka ho.','authmsg.enterEmailFirst':'Pehle upar apna email daalein, fir "Forgot password?" dabayein.',
    'msg.noLoans':'Koi loan nahi.','msg.noPayments':'Koi jama nahi.','msg.invalidFile':'Galat file.','msg.failed':'Nahi hua.',
    /* calculator + call + receipt */
    'calc.title':'Loan Calculator','calc.amount':'रकम ₹','calc.rate':'महीने का ब्याज %','calc.months':'कितने महीने','calc.monthlyInt':'महीने का ब्याज','calc.totalInt':'कुल ब्याज','calc.totalDue':'कुल (असल सहित)','calc.perDay':'रोज़ का','calc.open':'Calculator','bd.call':'Call','rcpt.btn':'रसीद भेजें','msg.noPhone':'Mobile number nahi hai.','msg.receiptSent':'WhatsApp khul raha hai…','msg.confirmPay':'क्या ये जमा दर्ज करें?'
  }
};

let LANG = (function(){ try{ return localStorage.getItem('mh_lang') || 'hi'; }catch(e){ return 'hi'; } })();

/* Translate one key for the current language (fallback: English, then key itself). */
function t(key){
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

/* Apply translations to all static [data-i18n] elements + placeholders. */
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  document.documentElement.setAttribute('lang', LANG);
  updateLangButton();
}

function updateLangButton(){
  document.querySelectorAll('.lang-btn').forEach(b=>{ b.textContent = (LANG==='hi') ? 'EN' : 'हिं'; });
}

function setLang(l){
  LANG = (l==='en') ? 'en' : 'hi';
  try{ localStorage.setItem('mh_lang', LANG); }catch(e){}
  applyI18n();
  if(typeof rerenderCurrent==='function') rerenderCurrent();   // dynamic content (ui.js)
}

function toggleLang(){ setLang(LANG==='hi' ? 'en' : 'hi'); }

document.addEventListener('DOMContentLoaded', applyI18n);
