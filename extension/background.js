/**
 * PhishShield - Chrome Extension Background Service Worker (Manifest V3)
 * Evaluates active tab URLs in real-time against the local PhishShield ML engine.
 */

const API_BASE = "http://localhost:5000/api/v1";
const ALT_API_BASE = "http://127.0.0.1:5000/api/v1";

// Cache analyses for the session to avoid duplicate calls
const cache = new Map();

// Default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    blockHighRisk: true,
  });
  console.log("PhishShield extension successfully installed.");
});

async function analyzeUrl(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  // Attempt localhost first, fallback to 127.0.0.1
  for (const base of [API_BASE, ALT_API_BASE]) {
    try {
      const response = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (response.ok) {
        const data = await response.json();
        cache.set(url, data);
        return data;
      }
    } catch (err) {
      // Try next host
    }
  }

  return null;
}

function updateBadge(tabId, result) {
  if (!result) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  const score = result.risk_score;
  if (score >= 60) {
    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#EF4444" });
  } else if (score >= 30) {
    chrome.action.setBadgeText({ tabId, text: "▲" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#F59E0B" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "✓" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#10B981" });
  }
}

// Intercept URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    const { enabled = true, blockHighRisk = true } = await chrome.storage.local.get(["enabled", "blockHighRisk"]);
    if (!enabled) {
      chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }

    try {
      const result = await analyzeUrl(tab.url);
      if (result) {
        updateBadge(tabId, result);

        if (blockHighRisk && result.risk_score >= 60) {
          // Tell content script to display the warning banner
          chrome.tabs.sendMessage(tabId, {
            action: "PHISHSHIELD_WARNING",
            data: result
          }).catch(() => {
            // Content script may not be ready or page restricted
          });
        }
      }
    } catch (e) {
      console.warn("PhishShield analysis failed:", e);
    }
  }
});

// Respond to popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CHECK_CURRENT_TAB") {
    analyzeUrl(request.url).then((res) => sendResponse(res));
    return true; // Keep message channel open for async response
  }
});
