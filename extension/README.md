# PhishShield Live Protection - Chrome Extension

> **Real-time AI-powered phishing and deceptive website detection directly in your browser.**

---

## 🚀 How to Load & Test in 15 Seconds

1. Open **Google Chrome**, **Brave**, or **Microsoft Edge**.
2. In the address bar, go to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left toolbar.
5. Select this directory:
   ```
   c:\Users\raj\Downloads\phishshield-project\extension
   ```
6. **Done!** The PhishShield shield icon will now appear in your browser toolbar.

---

## ⚡ What it Does During a Live Demo

- **Real-Time Active Tab Interception:** When navigating to any URL, evaluates it against PhishShield's local Random Forest model running at `http://localhost:5000`.
- **Dynamic Risk Badge:**
  - 🟢 **Safe:** Standard verified domains.
  - 🟡 **Suspicious:** Unusual formatting or non-standard ports.
  - 🔴 **Danger:** High-risk threat indicator (`!`) with red badge.
- **In-Page Threat Interstitial:** Injects a top security banner on high-risk phishing websites alerting the user before credentials can be entered.
- **One-Click Deep Inspection:** Click "Open Full Inspection in App" to jump directly into the PhishShield forensic dashboard.
