# PhishShield 🛡️

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.9-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Chrome Extension](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **"Check the link before you trust it."**  
> An explainable, multi-vector phishing and deceptive threat detection ecosystem powered by machine learning, heuristic social engineering inspection, and live browser defense.

---

## 📑 Table of Contents

- [Overview & Value Proposition](#-overview--core-value-proposition)
- [Key Features](#-key-features)
  - [1. Real-Time URL Deep Inspector](#1-real-time-url-deep-inspector)
  - [2. Quishing (QR Code) Scanner](#2-quishing-qr-code-scanner)
  - [3. Email & SMS Phishing Inspector](#3-email--sms-phishing-inspector)
  - [4. Live Browser Extension (Manifest V3)](#4-live-browser-extension-manifest-v3)
  - [5. Phishing Arena (Cyber Defense Simulator)](#5-phishing-arena-cyber-defense-simulator)
  - [6. Admin Oversight & Analytics](#6-admin-oversight--analytics)
- [System Architecture](#-system-architecture)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start (One Command)](#quick-start-one-command)
  - [Manual Setup](#manual-setup)
- [Loading the Chrome / Brave Extension](#-loading-the-chrome--brave-extension)
- [REST API Reference](#-rest-api-reference)
- [Testing Suite](#-testing-suite)
- [Security & Defense-in-Depth](#-security--defense-in-depth)
- [Author & License](#-author--license)

---

## 🌟 Overview & Core Value Proposition

Modern phishing attacks no longer rely strictly on typo-squatted URLs. Attackers now leverage QR codes (quishing) printed on parking meters, targeted urgency SMS messages (smishing), IDN homograph punycode lookalikes, and multi-subdomain deception.

**PhishShield** is an accessible, multi-vector defense platform that does not simply return an opaque binary verdict. It:
1. **Deconstructs threats** across 25+ lexical and structural dimensions.
2. **Combines ML predictions** with deterministic heuristic red-flag verification.
3. **Delivers transparent, explainable threat indicators** explaining *why* a destination is dangerous in plain language.
4. **Operates 100% self-contained** with zero dependency on costly external APIs or remote third-party keys.

---

## ⚡ Key Features

### 1. Real-Time URL Deep Inspector
- **25+ Lexical & Structural Extractors:** Analyzes URL length, entropy, subdomains, path depth, suspicious TLDs, port configurations, and credential embeds (`@`).
- **Interactive 270° Arc Gauge:** Smooth animated risk score ($0–100$) with dynamic threshold color morphing.
- **Explainable Threat Indicators:** Pinpoints red flags such as raw IP addresses, IDN punycode tricks, brand name prepending, or token injection.
- **One-Click Exhibition Demos:** Preloaded live presets for instant demonstration (legitimate educational portals, IP credential traps, subdomain spoofing, and Cyrillic punycode attacks).

### 2. Quishing (QR Code) Scanner
- **Client-Side Decoding (`jsQR`):** Safely parses physical or digital QR codes without transmitting raw camera feeds to any external server.
- **Dual Scan Modes:** Drag-and-drop / file upload for saved images, or live webcam feed targeting physical QR code lures.
- **Immediate Analysis Handoff:** Automatically extracts destination URLs and invokes the ML evaluation pipeline in real time.

### 3. Email & SMS Phishing Inspector
- **Social Engineering Heuristics:** Natural language analysis targeting urgency triggers (*"account locked in 24 hours"*), financial lures, and threat language.
- **Sender Domain Discrepancy:** Flags mismatches between claimed sender identity and actual email headers or contact information.
- **Automated Link Extraction:** Strips and analyzes all embedded hyperlinks individually with full risk scoring.

### 4. Live Browser Extension (Manifest V3)
- **Active Navigation Interception:** Evaluates URLs against the local PhishShield engine as you browse.
- **Dynamic Security Badge:** Real-time toolbar indicator reflecting status (🟢 Safe, 🟡 Suspicious, 🔴 Malicious).
- **In-Page Emergency Interstitial:** Automatically overlays an emergency warning banner on high-risk phishing websites before credentials can be submitted.
- **Instant Forensic Drill-Down:** One-click transition to view complete URL dissection inside the main dashboard.

### 5. Phishing Arena (Cyber Defense Simulator)
- **Gamified Security Awareness:** Test your ability to identify realistic real-world phishing attacks vs legitimate portals.
- **Arcade & Speed Challenge:** Earn streak multipliers, unlock achievements, and review detailed forensic breakdowns.
- **Cyber Audio Synthesis:** Custom Web Audio API sound effects for interactive engagement.

### 6. Admin Oversight & Analytics
- **Live Database KPIs:** Real-time metrics with rolling counters (`AnimatedCounter`) tracking total analyses, threat rates, and active accounts.
- **Risk Distribution Progress:** Dynamic classification ratios (Low, Moderate, High).
- **Audit Logs & Isolated History:** Authenticated session management with IDOR-protected user histories.

---

## 🏛️ System Architecture

```
phishshield/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy schemas (User, Analysis)
│   │   ├── routes/            # REST endpoints (auth, analyze, history, admin, health)
│   │   ├── security/          # SSRF guard, rate limiter, security headers, message analyzer
│   │   ├── config.py          # Session cookies, CORS, and database configuration
│   │   ├── extensions.py      # SQLAlchemy, Flask-Login, CORS instances
│   │   └── __init__.py        # Application factory & error handlers
│   ├── ml/
│   │   ├── artifacts/         # Random Forest model (model.joblib), features, metrics.json
│   │   ├── data/              # Kaggle Malicious URLs dataset
│   │   ├── features.py        # 25+ feature extraction algorithms
│   │   ├── predict.py         # Scoring engine and recommendation logic
│   │   └── train.py           # Training pipeline with GroupShuffleSplit
│   ├── tests/                 # pytest test suite (62 test cases)
│   ├── cli.py                 # Admin creation and management CLI
│   ├── requirements.txt       # Version-pinned Python dependencies
│   └── run.py                 # Backend development server entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # UI components (RadarScanner, ScoreMeter, UrlDissector, etc.)
│   │   │   └── arc/           # Arc UI component system (Gauge, Badge, Input, MetricCard, etc.)
│   │   ├── context/           # AuthContext & ThemeContext (Light / Dark mode)
│   │   ├── pages/             # Landing, Analyze, Quishing, EmailInspector, Arena, Admin, History
│   │   ├── services/          # Axios API client wrapper
│   │   ├── styles/            # Design tokens (tokens.css) & global styles
│   │   └── utils/             # Cyber audio synthesizer engine
│   ├── e2e/                   # Playwright end-to-end browser test suite
│   ├── package.json           # React 19 + TypeScript + Vite build configuration
│   └── vite.config.ts         # Vite bundler & reverse proxy setup
├── extension/
│   ├── manifest.json          # Chrome Manifest V3 configuration
│   ├── background.js          # Service worker for active tab URL evaluation
│   ├── content.js             # In-page emergency warning interstitial injector
│   ├── popup/                 # Toolbar popup UI (HTML/CSS/JS)
│   └── icons/                 # Extension toolbar branding icons
├── start-dev.mjs              # Universal cross-platform multi-process launcher
├── package.json               # Root orchestrator script
├── .env.example               # Environment template
└── README.md                  # System documentation
```

---

## 🧠 Machine Learning Pipeline

- **Algorithm:** Random Forest Classifier (`v3.0.0-rf-malicious-urls`)
- **Dataset Source:** Kaggle [Malicious URLs Dataset](https://www.kaggle.com/datasets/sid321axn/malicious-urls-dataset) (651,191 raw records)
- **Leakage Prevention:** Evaluated using strict **Domain-Grouped Holdout** (`GroupShuffleSplit` on registered domain) to avoid overfitting on recurring domains.

```json
{
  "model_version": "3.0.0-rf-malicious-urls",
  "algorithm": "RandomForestClassifier(n_estimators=100, max_depth=16, class_weight='balanced')",
  "stratified_evaluation": {
    "accuracy": "82.84%",
    "precision": "82.57%",
    "recall": "83.24%",
    "f1_score": "82.91%",
    "roc_auc": "0.9101"
  },
  "domain_grouped_evaluation": {
    "accuracy": "77.04%",
    "precision": "76.41%",
    "recall": "77.62%",
    "f1_score": "77.01%",
    "roc_auc": "0.8532"
  }
}
```

### Risk Classification Tiers

| Score Range | Classification | Description |
| :---: | :---: | :--- |
| **0 – 29** | 🟢 **Low Risk** | Follows standard lexical conventions, valid domain hierarchy, and reputable TLD. |
| **30 – 59** | 🟡 **Moderate Risk** | Unusual formatting, brand mentions in path, or non-standard port assignments. |
| **60 – 100** | 🔴 **High Risk** | Verified threat heuristics (raw IP host, IDN homograph punycode, brand prepended in subdomain, credential syntax `@`). |

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5, Vite 8, CSS Modules |
| **Component System**| Arc UI (`@uiarc`), Motion Tokens, Spring Physics, Lucide Icons |
| **Backend** | Python 3.12, Flask 3.1, Flask-Login, Flask-CORS |
| **Machine Learning**| scikit-learn 1.9, NumPy, pandas, joblib |
| **Database** | SQLite 3 via SQLAlchemy 3.1 (Cascade deletion, indexed lookups) |
| **Browser Extension**| Manifest V3, Service Workers, Content Script Injections |
| **Testing** | pytest (Backend: 62 tests), Playwright (E2E: 8 tests) |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** (with pip)
- **Node.js 18+** & **npm 9+**
- Modern Web Browser (Chrome, Brave, Edge, or Firefox)

---

### Quick Start (One Command)

From the project root:

```bash
# 1. Setup Backend Virtual Environment & Dependencies
python -m venv backend/venv

# Windows:
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
# macOS / Linux:
# backend/venv/bin/python -m pip install -r backend/requirements.txt

# 2. Install Frontend Dependencies
npm --prefix frontend install

# 3. Start Both Backend & Frontend Together
npm run dev
```

Open **`http://localhost:5173`** in your browser. Both the Flask API (`:5000`) and the Vite React server (`:5173`) are actively running!

---

### Manual Setup

<details>
<summary>Click to view manual step-by-step setup</summary>

#### Backend
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
# source venv/bin/activate

pip install -r requirements.txt

# Optional: Create an Administrator account
python cli.py create-admin --name "Admin" --email admin@phishshield.local

# Run Flask backend server
python run.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
</details>

---

## 🧩 Loading the Chrome / Brave Extension

1. Open **Google Chrome**, **Brave**, or **Microsoft Edge**.
2. Navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **"Load unpacked"** in the top-left toolbar.
5. Select the `extension/` directory inside this repository.
6. The PhishShield shield icon is now active in your browser toolbar!

---

## 📡 REST API Reference

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/health` | `GET` | None | API health status and timestamp |
| `/api/v1/analyze` | `POST` | Optional | Evaluates a URL against the ML model and heuristics |
| `/api/v1/analyze/samples` | `GET` | None | Retrieves preloaded exhibition demo URLs |
| `/api/v1/analyze/message` | `POST` | Optional | Evaluates email/SMS text for social engineering & links |
| `/api/v1/analyze/message/samples`| `GET` | None | Retrieves preloaded smishing/phishing message samples |
| `/api/v1/auth/register` | `POST` | None | Creates a new user account |
| `/api/v1/auth/login` | `POST` | None | Authenticates user session |
| `/api/v1/auth/logout` | `POST` | Required | Terminates session |
| `/api/v1/auth/me` | `GET` | Required | Fetches current user profile |
| `/api/v1/history` | `GET` | Required | Lists historical analysis records for authenticated user |
| `/api/v1/history/<id>` | `GET` | Required | Detailed breakdown for a single analysis |
| `/api/v1/admin/stats` | `GET` | Admin | Real-time aggregate KPIs and risk breakdown |
| `/api/v1/admin/analyses` | `GET` | Admin | Global analysis audit log |

---

## 🧪 Testing Suite

### Backend Pytest Suite (62 Tests)
Tests cover URL validation, SSRF protection, message analyzer NLP heuristics, ML inference regression, user isolation (IDOR), and rate limiters:

```bash
# Windows
backend\venv\Scripts\python.exe -m pytest backend\tests -v

# macOS / Linux
backend/venv/bin/pytest backend/tests -v
```

### Frontend Playwright E2E Suite
```bash
cd frontend
npx playwright test
```

---

## 🔒 Security & Defense-in-Depth

- **SSRF Immunity:** Strictly performs lexical inspection of URL strings without fetching remote servers or triggering malicious payloads.
- **Rate Limiting:** Protects analysis and authentication endpoints against automated enumeration and DDoS.
- **OWASP Hardened Headers:** Enforces Content Security Policy (CSP), HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
- **Credential Protection:** Passwords securely hashed with `scrypt`/`pbkdf2` algorithms with HTTP-only, SameSite session cookies.
- **IDOR Protection:** Historical analysis records are strictly isolated by session user ID with administrator role guards.

---

## 👤 Author & License

Developed by **Raj Mishra** ([@RajMishra16](https://github.com/RajMishra16)).

This project is licensed under the **MIT License**.
