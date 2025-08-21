/**
 * Citrus Status content script
 * Adds emojis next to problem links and fraction summary on activity pages.
 */

const VERDICT_TO_EMOJI = new Map([
  ["AC", "✅"],
  ["WA", "❌"],
  ["IR", "⚠️"],
  ["CE", "👀"],
]);


/** --- Storage helpers --- */
function saveStatus(status) {
  chrome.runtime.sendMessage({ type: "setStatus", status });
}
function getAllStatuses() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "getAllStatuses" }, map => resolve(map || {}));
  });
}


/** --- Emoji injection for problems page --- */
function inferProblemId(anchor) {
  return anchor.getAttribute("href");
}

async function extractVerdictText(row) {
  // Visit the submissions link in the row
  const link = row.querySelector("a[href*='/submissions/']");
  if (!link) return null;

  // Fetch the submissions page
  const res = await fetch(link.href);
  if (!res.ok) return null;
  const html = await res.text();

    // Loop all submissions and find verdict text
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll(".submission-row");

  var verdict = null;
  for (const row of rows) {
    const verdictCell = row.querySelector("div.state > span.status");
    if (verdictCell) {
      const verdictText = verdictCell.innerText;

      if (VERDICT_TO_EMOJI.has(verdictText)) {
        // Some verdicts have priority than others (AC > WA > IR > CE)
        if (!verdict) {
          verdict = verdictText;
        } else if (verdictText === "AC" && verdict !== "AC") {
          // If we already have a verdict, only replace if it's AC
          verdict = "AC";
        } else if (verdictText === "WA" && !["AC", "WA"].includes(verdict)) {
          // If we have WA, only replace if we don't have AC
          verdict = "WA";
        } else if (verdictText === "IR" && !["AC", "WA", "IR"].includes(verdict)) {
          // If we have IR, only replace if we don't have AC or WA
          verdict = "IR";
        } else if (verdictText === "CE" && !["AC", "WA", "IR", "CE"].includes(verdict)) {
          // If we have CE, only replace if we don't have AC, WA or IR
          verdict = "CE";
        }
      }
    }
  }

  return verdict;
}

function applyEmoji(anchor, emoji) {
  if (!anchor || !emoji) return;
  // if (anchor.dataset.citrusPatched === "1") return;

  const span = document.createElement("span");
  span.className = "citrus-status-emoji";
  span.textContent = emoji;
  anchor.prepend(span);
  // anchor.dataset.citrusPatched = "1";
}

/** --- Summary injector for activities/contests page --- */
function upsertSummary(container, solved, total) {
  if (!container) return;

  const text = `${solved}/${total} solved`;
  badge = document.createElement("span");
  badge.className = "citrus-activity-summary";
  badge.textContent = text;
  container.append(badge);

  // let badge = container.querySelector(".citrus-activity-summary");
  // if (!badge) {
  //   badge = document.createElement("span");
  //   badge.className = "citrus-activity-summary";
  //   badge.textContent = text;
  //   container.append(badge);
  // } else {
  //   badge.textContent = text;
  // }
}


/** --- Page-specific scans --- */
async function scanProblemsPage() {
  const map = await getAllStatuses();
  // Get all problem links in td class="problem" with a href containing "/problem/"
  var contest_name = document.querySelector("#contest-info > a[href*='/contest/']")
  if (contest_name) {
    contest_name = contest_name.getAttribute("href");
  }

  const anchors = Array.from(document.querySelectorAll("td.problem a[href*='/problem/']"));

  let solvedCount = 0, totalCount = 0;
  var problem_status = {};
  
  // Use a blocking loop to process each anchor
  for (const anchor of anchors) {
    const row = anchor.closest("tr") || anchor.parentElement;
    const problemId = inferProblemId(anchor);

    let verdictKey = await extractVerdictText(row);
    if (!verdictKey && map[contest_name][problemId]) {
      verdictKey = map[contest_name][problemId].status;
    }

    const emoji = VERDICT_TO_EMOJI.get(verdictKey || "");
    if (emoji) {
      applyEmoji(anchor, emoji);
    }
    // Save status for this problem
    problem_status[problemId] = { status: verdictKey || "" };

    totalCount++;
    if (verdictKey === "AC") {
      solvedCount++;
    }
  }

  if (totalCount > 0) {
    const container = document.querySelector("div.tabs > h2");
    upsertSummary(container, solvedCount, totalCount);
    // Save locally
    // Format of json is: {contest_name: { problemId: status }}
    const status = {
      [contest_name]: problem_status
    };
    saveStatus(status);
  }
}

async function scanContestsPage() {
  // This is petty, but will change the label from "Activities Currently Joined" to "Activities Recently Joined"
  const activityLabel = document.querySelector("div.content-description > h4");
  if (activityLabel && activityLabel.textContent == "Activities Currently Joined") {
    activityLabel.textContent = "Activities Recently Joined";
  }

  const map = await getAllStatuses();

  // Get all contest blocks
  const contests = document.querySelectorAll("div.contest-block");

  contests.forEach(contest => {
    // Get contest_name
    var contest_link = contest.querySelector("a[href*='/contest/']");
    if (!contest_link) return;
    contest_name = contest_link.getAttribute("href");

    // Loop problems in map to identify solved/total
    let solved = 0, total = 0;
    for (const problemId in map[contest_name]) {
      const status = map[contest_name][problemId].status;
      if (status === "AC") {
        solved++;
      }
      total++;
    }

    if (total > 0) {
      upsertSummary(contest_link, solved, total);
    }
  });
}


/** --- Router --- */
function run() {
  const path = window.location.pathname;

  if (path === "/problems/") {
    scanProblemsPage();
  } else if (path === "/contests/") {
    scanContestsPage();
  }
}


/** --- Run once and observe --- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}

// I keep getting issues with MutationObserver, so for now we just run once
// const target = document.getElementById("page-container");
// if (target) {
//   const mo = new MutationObserver(() => run());
//   mo.observe(target, { childList: true, subtree: true });
// }
