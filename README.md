# Bot Project

This document describes the workflow for the completed project: installing dependencies, configuring Security Rules, and deploying the site.

---

## 📋 Table of Contents

1. [Installing Dependencies](#installing-dependencies)
2. [Configuring Security Rules](#configuring-security-rules)
3. [Firebase Authentication](#firebase-authentication)
4. [Deploying to Firebase Hosting](#deploying-to-firebase-hosting)

---

## Installing Dependencies

```bash
npm install -g firebase-tools
npm install
```

---

## Configuring Security Rules

Security Rules are stored in `firestore.rules` or can be edited in the console at:

```
https://console.firebase.google.com/u/0/project/money-revenue/firestore/databases/weather-meta/rules
```

### Adding a New User

1. In the `[...]` array, add the new email in quotes, separated by a comma:
   ```js
   request.auth.token.email in [
     "user1@example.com",
     "user2@example.com",
     "new.user@example.com"  // ← added here
   ];
   ```
2. Click **Publish** in the Firebase console — changes take effect immediately.

---
## Firebase Authentication

Log in to your Google account:

```bash
firebase login
```

> After this, you'll be linked to the Firebase project specified in your `firebase.json`.

---
## Deploying to Firebase Hosting

1. **Build the front-end** (if applicable):
   ```bash
   npm run build
   ```
   Ensure the `dist` or `build` folder contains an `index.html` file.

2. **Deploy **:
   ```bash
   firebase deploy
   ```

> After a successful deployment, the console will show your site's URL  `https://money-revenue.web.app/`.

---


