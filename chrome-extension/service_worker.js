const API = "https://nao-sdk-api.onrender.com/api/scoreEffort";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type !== "EVE_SCORE_BATCH") return;

    const results = [];

    for (const item of msg.items) {
      let result;
      try {
        const r = await fetch(API, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: item.text,
            url: item.context?.url || "",
            platform: item.context?.platform || ""
          }),
        });

        result = await r.json();
      } catch (_e) {
        result = { score: 0, label: "Unknown Error" };
      }

      results.push({
        id: item.id,
        score: result.score || 0,
        label: result.label || "human"
      });
    }

    sendResponse({ ok: true, results });
  })();

  return true;
});
