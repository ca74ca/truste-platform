console.log("[TRUSTE] content.js loaded");

/* --------------------------
   Extract readable text
--------------------------- */
function extractTextBlocks() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const blocks = [];
  let id = 0;

  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue.trim();
    if (text.length > 40) {
      blocks.push({
        id: "txt_" + id++,
        text,
        context: {
          url: location.href,
          platform: location.hostname
        }
      });
    }
  }

  return blocks;
}

/* --------------------------
   Label Mapping
--------------------------- */
function scoreToLabel(score) {
  if (score >= 85) return "Real Human";
  if (score >= 70) return "Mostly Human";
  if (score >= 55) return "AI Assisted";
  if (score >= 40) return "Suspected AI";
  return "AI Generated";
}

/* --------------------------
   Tooltip Creation
--------------------------- */
function createTooltip(label) {
  const tooltip = document.createElement("div");
  tooltip.className = "truste-tooltip";
  tooltip.innerText = label;
  return tooltip;
}

/* --------------------------
   Badge Creation
--------------------------- */
function injectBadge(score) {
  const existing = document.querySelector(".truste-badge");
  if (existing) existing.remove();

  const badge = document.createElement("div");
  badge.className = "truste-badge";
  badge.innerText = `TRUSTE • ${score}%`;

  if (score < 40) badge.classList.add("low");
  else if (score < 70) badge.classList.add("mid");
  else badge.classList.add("high");

  const label = scoreToLabel(score);
  const tooltip = createTooltip(label);

  document.body.appendChild(badge);
  document.body.appendChild(tooltip);

  // Hover handlers
  badge.addEventListener("mouseenter", () => {
    tooltip.classList.add("visible");
  });

  badge.addEventListener("mouseleave", () => {
    tooltip.classList.remove("visible");
  });

  // Bubble particles (every 250ms)
  setInterval(() => spawnBubble(badge), 250);
}

/* --------------------------
   Bubble Generator
--------------------------- */
function spawnBubble(badge) {
  const bubble = document.createElement("div");
  bubble.className = "truste-bubble";

  const size = Math.random() * 6 + 4;
  bubble.style.width = size + "px";
  bubble.style.height = size + "px";

  const offset = (Math.random() * 30) - 15;
  bubble.style.left = `calc(50% + ${offset}px)`;

  badge.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1600);
}

/* --------------------------
   RUN
--------------------------- */
(async function run() {
  const blocks = extractTextBlocks();
  if (!blocks.length) return;

  chrome.runtime.sendMessage(
    { type: "EVE_SCORE_BATCH", items: blocks },
    (response) => {
      if (!response?.ok) return;

      const scores = response.results.map(r => r.score);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      injectBadge(avg);
    }
  );
})();
