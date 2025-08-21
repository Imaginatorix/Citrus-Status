function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateProgressBar(solved, total) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  const bar = document.getElementById('juiceBar');
  if (bar) bar.style.width = pct + '%';
}

function openUrl(id, url) {
  const el = document.getElementById(id);
  if (el) el.href = url;
}

document.addEventListener("DOMContentLoaded", () => {
  // Year
  setText("year", new Date().getFullYear());

  // GCash opens QR popup
  const gcash = document.getElementById("gcashLink");
  if (gcash) {
    gcash.addEventListener("click", e => {
      e.preventDefault();
      chrome.windows.create({
        url: chrome.runtime.getURL("popup/gcash.html"),
        type: "popup",
        width: 400,
        height: 400
      });
    });
  }

  // Defaults for donation + repo links (replace with your real links)
  openUrl("paypalLink", "https://paypal.me/eitjumawanpay");
  openUrl("githubRepo", "https://github.com/Imaginatorix/Citrus-Status");
  openUrl("githubIssues", "https://github.com/Imaginatorix/Citrus-Status/issues");

  // Load statuses
  // chrome.runtime.sendMessage({ type: "getAllStatuses" }, map => {
  //   const entries = Object.entries(map || {});
  //   let solved = 0;
  //   let total = entries.length;
  //   for (const [, obj] of entries) {
  //     const s = (obj && obj.status) || "";
  //     if (s.includes("accepted") || s.includes("perfect") || s.includes("correct")) {
  //       solved += 1;
  //     }
  //   }
  //   setText("solved", solved);
  //   setText("total", total);
  //   setText("activity-name", "Sample");
  //   updateProgressBar(solved, total);
  // });
});