/* =====================================================================
   auth.js — Firebase Authentication UI + session gate
   ===================================================================== */

let authMode = 'login';     // 'login' | 'signup'
let suppressVerifyGuard = false;  // true while signUp/login handle the email-verify check themselves

/* ── WIRE UP THE FORM ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const form=document.getElementById('auth-form');
  if(form) form.addEventListener('submit', e=>{
    e.preventDefault();
    authMode==='login' ? login() : signUp();
  });
  if(!FIREBASE_CONFIGURED){
    showAuthError('⚠ Firebase is not configured yet. Open js/config.js and paste your project keys.');
  }
  // Close the profile dropdown when clicking elsewhere.
  document.addEventListener('click', e=>{
    const menu=document.getElementById('profile-menu');
    const dd=document.getElementById('profile-dropdown');
    if(dd && dd.classList.contains('show') && menu && !menu.contains(e.target)){
      dd.classList.remove('show');
    }
  });
});

/* ── MODE TOGGLE (login ↔ signup) ──────────────────────────────────── */
function setAuthMode(mode){
  authMode=mode;
  document.getElementById('tab-login').classList.toggle('active',mode==='login');
  document.getElementById('tab-signup').classList.toggle('active',mode==='signup');
  const submit=document.getElementById('auth-submit');
  submit.textContent = mode==='login' ? 'Log in' : 'Create account';
  document.getElementById('auth-pass').setAttribute('autocomplete', mode==='login'?'current-password':'new-password');
  document.getElementById('auth-forgot').style.display = mode==='login' ? 'block' : 'none';
  clearAuthMsg();
}

/* ── MESSAGE / LOADING HELPERS ─────────────────────────────────────── */
function showAuthError(msg){
  const e=document.getElementById('auth-error');e.textContent=msg;e.classList.add('show');
  document.getElementById('auth-note').classList.remove('show');
}
function showAuthNote(msg){
  const n=document.getElementById('auth-note');n.textContent=msg;n.classList.add('show');
  document.getElementById('auth-error').classList.remove('show');
}
function clearAuthMsg(){
  document.getElementById('auth-error').classList.remove('show');
  document.getElementById('auth-note').classList.remove('show');
}
function setAuthLoading(on,label){
  const submit=document.getElementById('auth-submit');
  const google=document.getElementById('auth-google-btn');
  submit.disabled=on;google.disabled=on;
  if(on){submit.innerHTML='<span class="spinner"></span> '+(label||'Please wait…');}
  else{submit.textContent=authMode==='login'?'Log in':'Create account';}
}

/* ── EMAIL / PASSWORD ──────────────────────────────────────────────── */
function login(){
  clearAuthMsg();
  const email=document.getElementById('auth-email').value.trim();
  const pass =document.getElementById('auth-pass').value;
  if(!email||!pass){showAuthError('Enter email and password.');return;}
  setAuthLoading(true,'Logging in…');
  suppressVerifyGuard=true;
  auth.signInWithEmailAndPassword(email,pass)
    .then(cred=>{
      if(!cred.user.emailVerified){
        // Email abhi verify nahi → naya link bhejo, sign out, andar mat aane do.
        return cred.user.sendEmailVerification().catch(()=>{})
          .then(()=>auth.signOut())
          .then(()=>showAuthError('Aapka email abhi verify nahi hua. '+email+' par bheje link par click karke verify karein, fir login karein. (Naya link dobara bhej diya — spam folder bhi dekh lein.)'));
      }
      // verified → onAuthStateChanged app khol dega
    })
    .catch(err=>{showAuthError(authErrorMessage(err.code));})
    .finally(()=>{suppressVerifyGuard=false;setAuthLoading(false);});
}
function signUp(){
  clearAuthMsg();
  const email=document.getElementById('auth-email').value.trim();
  const pass =document.getElementById('auth-pass').value;
  if(!email||!pass){showAuthError('Enter email and password.');return;}
  if(pass.length<6){showAuthError('Password must be at least 6 characters.');return;}
  setAuthLoading(true,'Creating account…');
  suppressVerifyGuard=true;
  auth.createUserWithEmailAndPassword(email,pass)
    .then(cred=>cred.user.sendEmailVerification())
    .then(()=>auth.signOut())
    .then(()=>{
      setAuthMode('login');
      showAuthNote('✓ Account ban gaya! Verification link '+email+' par bheja gaya hai. Email kholkar us link par click karein, fir yahan login karein. (Spam folder bhi check karein.)');
    })
    .catch(err=>{showAuthError(authErrorMessage(err.code));})
    .finally(()=>{suppressVerifyGuard=false;setAuthLoading(false);});
}

/* ── GOOGLE ────────────────────────────────────────────────────────── */
function googleLogin(){
  clearAuthMsg();
  const provider=new firebase.auth.GoogleAuthProvider();
  setAuthLoading(true,'Opening Google…');
  auth.signInWithPopup(provider)
    .catch(err=>{
      if(err.code!=='auth/popup-closed-by-user' && err.code!=='auth/cancelled-popup-request')
        showAuthError(authErrorMessage(err.code));
    })
    .finally(()=>setAuthLoading(false));
}

/* ── FORGOT PASSWORD ───────────────────────────────────────────────── */
function forgotPassword(){
  clearAuthMsg();
  const email=document.getElementById('auth-email').value.trim();
  if(!email){showAuthError('Enter your email above first, then tap "Forgot password?".');return;}
  auth.sendPasswordResetEmail(email)
    .then(()=>showAuthNote('Password reset link sent to '+email+'. Check your inbox.'))
    .catch(err=>showAuthError(authErrorMessage(err.code)));
}

/* ── LOGOUT ────────────────────────────────────────────────────────── */
function logout(){
  const dd=document.getElementById('profile-dropdown');if(dd)dd.classList.remove('show');
  auth.signOut().then(()=>{ resetAppState(); }).catch(e=>toast('Logout failed.','err'));
}

/* ── FRIENDLY ERROR MESSAGES ───────────────────────────────────────── */
function authErrorMessage(code){
  const map={
    'auth/invalid-email':'That email address looks invalid.',
    'auth/user-disabled':'This account has been disabled.',
    'auth/user-not-found':'No account found with that email.',
    'auth/wrong-password':'Incorrect password.',
    'auth/invalid-credential':'Incorrect email or password.',
    'auth/email-already-in-use':'An account already exists with this email. Try logging in.',
    'auth/weak-password':'Password is too weak (min 6 characters).',
    'auth/too-many-requests':'Too many attempts. Please wait and try again.',
    'auth/network-request-failed':'Network error. Check your connection.',
    'auth/popup-blocked':'Popup blocked — allow popups for Google sign-in.',
    'auth/operation-not-allowed':'This sign-in method is not enabled in Firebase console.',
    'auth/unauthorized-domain':'This domain is not authorised in Firebase Auth settings.'
  };
  return map[code] || ('Something went wrong'+(code?(' ('+code+')'):'')+'.');
}

/* ── PROFILE MENU ──────────────────────────────────────────────────── */
function toggleProfileMenu(e){
  if(e)e.stopPropagation();
  document.getElementById('profile-dropdown').classList.toggle('show');
}
function buildProfileMenu(user){
  const name=user.displayName||(user.email?user.email.split('@')[0]:'User');
  const initial=(name[0]||'U').toUpperCase();
  const av=document.getElementById('profile-avatar');
  av.innerHTML = user.photoURL ? `<img src="${user.photoURL}" alt="">` : initial;
  document.getElementById('pm-name').textContent=name;
  document.getElementById('pm-email').textContent=user.email||'(no email)';
}

/* ── SHOW / HIDE SCREENS ───────────────────────────────────────────── */
function showApp(user){
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('app-root').classList.add('ready');
  buildProfileMenu(user);
}
function showAuthScreen(){
  document.getElementById('app-root').classList.remove('ready');
  const scr=document.getElementById('auth-screen');scr.classList.add('show');
  const pass=document.getElementById('auth-pass');if(pass)pass.value='';
  setAuthLoading(false);
}

/* =====================================================================
   THE GATE — App Start → Check Authentication
   ===================================================================== */
auth.onAuthStateChanged(async user=>{
  if(user){
    // Email/Password accounts must verify their email first.
    // (Google sign-in users are already verified, so they pass straight through.)
    if(!user.emailVerified){
      if(suppressVerifyGuard) return;          // signUp/login flow is handling it
      try{ await auth.signOut(); }catch(e){}    // safety net for an auto-logged-in unverified session
      showAuthScreen();
      showAuthError('Email verify karna baaki hai. Apne email me bheje link par click karein, fir login karein.');
      return;
    }
    showApp(user);
    await initApp(user);        // load cloud data, migrate, sync, render
    buildProfileMenu(user);     // refresh (displayName may arrive late)
  }else{
    showAuthScreen();
  }
});
