# मेरा हिसाब — Loan Manager (Cloud Edition)

Multi-user cloud version of the Loan Manager. Same UI and features as the
original single-file app, now with **Firebase Authentication** (email/password
+ Google), **per-user Firestore storage**, **offline localStorage backup**, and
**real-time multi-device sync**. JSON/CSV import-export and the optional linked
data file are all preserved.

---

## 📁 Folder structure

```
loan-manager/
├── index.html            # markup: auth screen + app shell + script includes
├── firestore.rules       # security rules (paste into Firebase console)
├── .gitignore
├── README.md
├── css/
│   └── style.css         # all styles (original + auth/profile/sync)
└── js/
    ├── config.js         # Firebase init + your project keys  ← EDIT THIS
    ├── app.js            # state, domain logic, CRUD, init flow
    ├── ui.js             # rendering, navigation, modals, toast
    ├── backup.js         # localStorage + File System Access + JSON/CSV
    ├── firestore.js      # cloud load / migrate / sync / live listeners
    └── auth.js           # auth UI, session gate, profile menu
```

Scripts load as classic (non-module) scripts in a fixed order so every existing
global function and inline `onclick=` keeps working unchanged.

---

## 🔥 A. Firebase setup

1. Go to <https://console.firebase.google.com> → **Add project** (any name).
2. Inside the project, click the **`</>` (Web)** icon → register a web app
   (no Hosting needed). Firebase shows a `firebaseConfig` object.
3. Open **`js/config.js`** and replace the placeholder values with yours:

   ```js
   const firebaseConfig = {
     apiKey:            "AIza...",
     authDomain:        "your-project.firebaseapp.com",
     projectId:         "your-project",
     storageBucket:     "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId:             "1:1234567890:web:abcdef"
   };
   ```
   > These web keys are **not secrets** — security comes from the Firestore
   > rules + the authorised-domains list, not from hiding the key.

---

## 🔑 B. Authentication setup

In the Firebase console → **Build → Authentication → Get started**, then under
**Sign-in method** enable:

- **Email/Password**  → toggle *Enable* → Save.
- **Google**          → toggle *Enable*, pick a support email → Save.

Then **Authentication → Settings → Authorized domains → Add domain** and add the
domains you will serve from:

- `localhost` (already present — for local testing)
- `your-username.github.io` (your GitHub Pages domain)

Forgot-password emails work automatically once Email/Password is enabled
(Firebase sends them from its default template — customise under
*Authentication → Templates* if you like).

---

## 🗄️ C. Firestore setup + rules

1. **Build → Firestore Database → Create database** → *Start in production mode*
   → choose a region close to you (e.g. `asia-south1` for India).
2. Open the **Rules** tab, paste the contents of **`firestore.rules`**, and
   click **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null
                            && request.auth.uid == userId;
       }
     }
   }
   ```

This guarantees every user can touch **only** `users/{their-own-uid}/…` — no
cross-account data leakage.

### Schema written by the app
```
users/{uid}                      → email, displayName, photoURL,
                                    migrationCompleted, lastSync, createdAt
users/{uid}/borrowers/{id}       → { id, name, phone, addr, notes, idno, createdAt }
users/{uid}/loans/{id}           → { id, bid, prin, rate, start, dur, type,
                                      coll, notes, closed, createdAt }
users/{uid}/payments/{id}        → { id, lid, amt, date, type, note }
```

---

## 🚀 D. GitHub Pages deployment

```bash
# from inside the loan-manager/ folder
git init
git add .
git commit -m "Loan Manager — Firebase cloud edition"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment**
→ Source = **Deploy from a branch** → Branch = **main** / **/(root)** → **Save**.

Your app goes live at `https://<you>.github.io/<repo>/`.

> ⚠️ After the URL is known, go back to **Firebase → Authentication → Settings
> → Authorized domains** and add `<you>.github.io`, or Google sign-in will be
> rejected with `auth/unauthorized-domain`.

`.gitignore` excludes `*.json` so you never accidentally commit a borrower-data
backup file.

---

## 💻 E. Running locally

`file://` won't work (Firebase Auth + module loading need http). Serve it:

```bash
# Python
python -m http.server 8000
# or Node
npx serve .
```
Open <http://localhost:8000>. `localhost` is already an authorised domain.

---

## 🔄 F. How sync & migration work

- **First login** with old data: if your browser still has the original
  `localStorage` key (`mh_v3`) and your cloud account is empty, the app uploads
  that data to Firestore once and sets `migrationCompleted = true`.
- **Every change** saves instantly to localStorage, then a debounced batch write
  pushes to Firestore (`Saving… → Synced`, shown in the top-bar badge).
- **Other devices** receive changes live via Firestore `onSnapshot` listeners.
- **Offline**: Firestore's offline cache + localStorage keep the app fully
  usable; changes flush automatically when you reconnect (badge shows
  `Offline`).
- localStorage is namespaced per user (`mh_v3_<uid>`) so multiple accounts on one
  browser stay isolated.

---

## ✅ Preserved from the original (nothing removed)

Dashboard · borrowers · add/edit borrower · loans (add/edit/delete) · payments ·
reminders · OTS calculator · repayment schedule · reports · search & filters ·
WhatsApp reminder copy · JSON export/import · CSV export · optional linked data
file (File System Access API) · all interest/outstanding calculations.
