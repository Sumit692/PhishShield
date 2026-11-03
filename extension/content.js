/**
 * PhishShield - Webpage Injected Warning Script
 * Injects a dismissible, accessible security banner at the top of malicious pages.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PHISHSHIELD_WARNING" && message.data) {
    injectSecurityBanner(message.data);
  }
});

function injectSecurityBanner(result) {
  if (document.getElementById("phishshield-security-banner")) return;

  const banner = document.createElement("div");
  banner.id = "phishshield-security-banner";
  banner.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 2147483647 !important;
    background: #1B4332 !important;
    color: #FFFFFF !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
    border-bottom: 3px solid #EF4444 !important;
    padding: 12px 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
    animation: phishshieldSlideDown 0.3s ease-out !important;
  `;

  // Inject animation keyframes
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    @keyframes phishshieldSlideDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleTag);

  const indicatorsText = (result.indicators || [])
    .slice(0, 2)
    .map(i => i.title || i.name)
    .join(", ");

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;min-width:0;">
      <div style="width:32px;height:32px;border-radius:50%;background:#EF4444;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div>
        <div style="font-weight:700;font-size:14px;letter-spacing:0.02em;">
          PhishShield Alert: High-Risk Phishing Threat Detected (${result.risk_score}/100)
        </div>
        <div style="font-size:12px;color:#D8F3DC;margin-top:2px;">
          ${indicatorsText ? `Red flags: ${indicatorsText}. ` : ""}Do not enter passwords, credit card numbers, or sensitive credentials.
        </div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <button id="phishshield-btn-safety" style="
        background:#EF4444 !important;
        color:#FFFFFF !important;
        border:none !important;
        padding:8px 14px !important;
        border-radius:6px !important;
        font-weight:600 !important;
        font-size:13px !important;
        cursor:pointer !important;
        transition:background 0.2s !important;
      ">
        Get Me to Safety
      </button>
      <button id="phishshield-btn-dismiss" style="
        background:transparent !important;
        color:#D8F3DC !important;
        border:1px solid rgba(255,255,255,0.3) !important;
        padding:7px 12px !important;
        border-radius:6px !important;
        font-size:12px !important;
        cursor:pointer !important;
      ">
        Dismiss
      </button>
    </div>
  `;

  document.body.prepend(banner);

  document.getElementById("phishshield-btn-safety").addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "https://www.google.com";
    }
  });

  document.getElementById("phishshield-btn-dismiss").addEventListener("click", () => {
    banner.remove();
  });
}
