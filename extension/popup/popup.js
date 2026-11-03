/**
 * PhishShield Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("shield-toggle");
  const tabUrlEl = document.getElementById("tab-url");
  const loadingEl = document.getElementById("loading-state");
  const resultEl = document.getElementById("result-state");
  const unsupportedEl = document.getElementById("unsupported-state");
  const scoreText = document.getElementById("score-text");
  const gaugeFill = document.getElementById("gauge-fill");
  const riskBadge = document.getElementById("risk-badge");
  const modelConf = document.getElementById("model-conf");
  const signalsList = document.getElementById("signals-list");
  const deepScanBtn = document.getElementById("deep-scan-btn");

  // Load toggle preference
  const { enabled = true } = await chrome.storage.local.get("enabled");
  toggle.checked = enabled;

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  // Query active browser tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    tabUrlEl.textContent = tab ? tab.url || "Local System Page" : "No active tab";
    loadingEl.style.display = "none";
    unsupportedEl.style.display = "block";
    return;
  }

  tabUrlEl.textContent = tab.url;

  try {
    // Request analysis from background or API
    const response = await fetch("http://localhost:5000/api/v1/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url })
    });

    if (!response.ok) {
      throw new Error("Local analysis backend unavailable");
    }

    const data = await response.json();
    renderAnalysis(data, tab.url);
  } catch (err) {
    // Attempt fallback to 127.0.0.1
    try {
      const response = await fetch("http://127.0.0.1:5000/api/v1/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tab.url })
      });
      const data = await response.json();
      renderAnalysis(data, tab.url);
    } catch {
      loadingEl.innerHTML = `
        <div style="font-size:12px;color:#EF4444;font-weight:600;">Backend Offline</div>
        <div style="font-size:11px;color:#777;margin-top:4px;">
          Start PhishShield ('npm run dev') to enable real-time detection.
        </div>
      `;
    }
  }

  function renderAnalysis(data, url) {
    loadingEl.style.display = "none";
    resultEl.style.display = "block";

    const score = data.risk_score;
    scoreText.textContent = score;

    // SVG arc stroke-dashoffset: 125.6 is empty (0), 0 is full (100)
    const offset = 125.6 - (125.6 * (score / 100));
    gaugeFill.style.strokeDashoffset = offset;

    if (score >= 60) {
      gaugeFill.style.stroke = "#EF4444";
      riskBadge.className = "badge badge-high";
      riskBadge.textContent = "DANGER";
    } else if (score >= 30) {
      gaugeFill.style.stroke = "#F59E0B";
      riskBadge.className = "badge badge-moderate";
      riskBadge.textContent = "SUSPICIOUS";
    } else {
      gaugeFill.style.stroke = "#10B981";
      riskBadge.className = "badge badge-low";
      riskBadge.textContent = "SAFE";
    }

    modelConf.textContent = `${data.model_confidence}% ML Confidence`;

    // Render signals
    signalsList.innerHTML = "";
    const indicators = data.indicators || [];
    if (indicators.length === 0) {
      signalsList.innerHTML = `<div style="font-size:11px;color:#10B981;">✓ Standard lexical & domain hierarchy</div>`;
    } else {
      indicators.slice(0, 3).forEach((ind) => {
        const item = document.createElement("div");
        item.className = "signal-pill";
        item.innerHTML = `
          <div class="signal-dot" style="background:${ind.severity === 'high' ? '#EF4444' : '#F59E0B'}"></div>
          <span>${ind.title || ind.name}</span>
        `;
        signalsList.appendChild(item);
      });
    }

    deepScanBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: `http://localhost:5173/analyze?url=${encodeURIComponent(url)}`
      });
    });
  }
});
