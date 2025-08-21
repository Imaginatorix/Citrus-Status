// Background service worker for Citrus Status
chrome.runtime.onInstalled.addListener(() => {
  console.log("Citrus Status installed.");
});

// Message hub if needed later
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "getAllStatuses") {
    chrome.storage.local.get(["citrus_statuses"], data => {
      sendResponse(data.citrus_statuses || {});
    });
    return true; // async
  }

  if (msg && msg.type === "setStatus") {
    const newStatus = msg.status; // an object { contestName: { problemId: statusObj } }

    chrome.storage.local.get(["citrus_statuses"], data => {
      const map = data.citrus_statuses || {};
      for (const contestName in newStatus) {
        map[contestName] = {
          ...(map[contestName] || {}),
          ...newStatus[contestName]
        };
      }
      chrome.storage.local.set({ citrus_statuses: map }, () => sendResponse({ ok: true }));
    });

    return true;
  }
});