/* =====================================================================
   config.js — Firebase initialisation
   ---------------------------------------------------------------------
   SETUP (one time):
     1. Go to https://console.firebase.google.com  →  "Add project".
     2. Inside the project click the </> (Web) icon to register a web app.
     3. Copy the generated `firebaseConfig` object and paste its values
        over the placeholders below.
     4. Build → Authentication → Sign-in method:
          • enable "Email/Password"
          • enable "Google"
     5. Build → Firestore Database → "Create database" (production mode),
        then publish the contents of firestore.rules.
     6. Authentication → Settings → Authorized domains:
          add your GitHub Pages domain, e.g.  <user>.github.io
   ===================================================================== */

const firebaseConfig = {
  apiKey:            "AIzaSyDWZFDDHONt9XbkfZuZjhBYYqyJnps2Hmo",
  authDomain:        "loan-manager-391a0.firebaseapp.com",
  projectId:         "loan-manager-391a0",
  storageBucket:     "loan-manager-391a0.firebasestorage.app",
  messagingSenderId: "936169190977",
  appId:             "1:936169190977:web:bdeeeadc65db3fb04178c0"
};

/* ---- initialise ---------------------------------------------------- */
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

/* Keep the user signed in across reloads / restarts (auto-login). */
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(e => console.warn('[auth] persistence:', e && e.code));

/* Offline cache → the app keeps reading/writing with no connection.
   (synchronizeTabs lets multiple open tabs share one cache.)         */
db.enablePersistence({ synchronizeTabs: true })
  .catch(e => console.warn('[firestore] offline cache disabled:', e && e.code));

/* True only once real keys have been pasted in — used to warn nicely. */
const FIREBASE_CONFIGURED = !String(firebaseConfig.apiKey).startsWith('YOUR_');
