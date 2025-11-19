import type { ContentMetadata } from "../pages/api/runEffortScore";

/**
 * Calculates a Proof-of-Human score from social metadata and fraud signals.
 * This is the core of EVE's "Proof of Human" recipe."
 */
export async function calculateEffortScore(
  metadata: ContentMetadata
): Promise<{
  score: number;
  tags: string[];
  reasons: string[];
}> {
  let score = 100;
  const tags: string[] = [];
  const reasons: string[] = [];

  // --- RAW METRICS ---
  const views = metadata.viewCount || 0;
  const comments = metadata.commentCount || 0;
  const followers = metadata.followerCount || 0;
  const engagementRate = metadata.engagementRate || 0;

  // a. Engagement Rate vs. Followers
  if (followers > 1000) {
    const expectedMinEngagement = 0.01;
    if (engagementRate < expectedMinEngagement) {
      const penalty = Math.min(
        20,
        (expectedMinEngagement - engagementRate) * 500
      );
      score -= penalty;
      tags.push("disproportionate_engagement");
      reasons.push(
        `Engagement rate (${(engagementRate * 100).toFixed(
          2
        )}%) is significantly low for follower count.`
      );
    }
  } else if (followers < 50 && views > 10000 && comments < 5) {
    score -= 30;
    tags.push("synthetic_reach_inflation");
    reasons.push(
      "High views with very low followers/comments suggest synthetic reach."
    );
  }

  // b. Comment gaps
  if (comments < 3 && views > 5000) {
    score -= 10;
    tags.push("comment_gap");
    reasons.push("High views with disproportionately few comments.");
  }

  // c. Description AI check (placeholder)
  if (metadata.description) {
    try {
      const isAIDescription = await analyzeTextForAI(metadata.description);
      if (isAIDescription) {
        score -= 25;
        tags.push("ai_generated_description");
        reasons.push("Description shows patterns of AI-generated content.");
      }
    } catch {
      reasons.push("Description AI analysis failed");
    }
  } else {
    score -= 5;
    tags.push("missing_description");
    reasons.push("Content is missing a description.");
  }

  // d. Time-based anomalies
  if (metadata.uploadDate) {
    const uploadMs = new Date(metadata.uploadDate).getTime();
    const ageHrs = (Date.now() - uploadMs) / 36e5;

    if (ageHrs < 72 && views > 500000 && engagementRate < 0.005) {
      score -= 20;
      tags.push("rapid_synthetic_growth");
      reasons.push(
        "Unnaturally fast view growth with very low engagement."
      );
    }
  }

  // Arkham signals (optional)
  if (metadata.arkhamData) {
    const sig = metadata.arkhamData.blockchainSignals || [];

    if (sig.includes("sybil_activity_detected")) {
      score -= 40;
      tags.push("web3_sybil_attack");
      reasons.push("Sybil activity detected.");
    }
    if (sig.includes("wash_trading_pattern")) {
      score -= 35;
      tags.push("web3_wash_trading");
      reasons.push("Wash trading behavior flagged.");
    }
    if (sig.includes("known_scam_address_interaction")) {
      score -= 50;
      tags.push("web3_scam_interaction");
      reasons.push("Interaction with a known scam address.");
    }
  }

  // Plaid signals (optional)
  if (metadata.plaidData) {
    const pd = metadata.plaidData;

    if (pd.plaidRiskScore && pd.plaidRiskScore > 0.75) {
      score -= 30;
      tags.push("plaid_high_risk");
      reasons.push(`High Plaid risk score (${(pd.plaidRiskScore * 100).toFixed(0)}%).`);
    }
    if (pd.plaidIdentityMismatch === true) {
      score -= 50;
      tags.push("plaid_identity_mismatch");
      reasons.push("Plaid detected an identity mismatch.");
    }
    if (pd.plaidBeaconSignals?.includes("known_fraudster")) {
      score -= 60;
      tags.push("plaid_known_fraudster");
      reasons.push("Identity flagged as known fraudster.");
    }
  }

  // --- Human-Signal Micro Engine ---
  const humanSignal = computeHumanSignalFromMetadata(metadata);

  if (humanSignal) {
    const original = score;
    score = Math.round(original * 0.6 + humanSignal.score * 0.4);

    if (humanSignal.label === "ai" || humanSignal.label === "suspect") {
      tags.push("low_human_signal");
      reasons.push(
        `Micro-engine flagged as "${humanSignal.label}" (${humanSignal.score}).`
      );
    } else {
      tags.push("strong_human_signal");
      reasons.push(
        `Micro-engine supports human authenticity (${humanSignal.label}).`
      );
    }
  }

  // Final clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 70) tags.push("low_effort_or_fraud");
  else tags.push("human_effort_detected");

  return {
    score,
    tags,
    reasons: reasons.length ? reasons : ["No specific red flags detected."]
  };
}

// ---- AI description placeholder ----
async function analyzeTextForAI(_text: string): Promise<boolean> {
  return false;
}

// ---- Human Signal Micro Engine ----

type HumanSignalResult = {
  score: number;
  label: "human" | "likely-human" | "suspect" | "ai";
};

function computeHumanSignalFromMetadata(
  metadata: ContentMetadata
): HumanSignalResult | null {
  const m: any = metadata;

  const text =
    m.rawText ||
    m.caption ||
    metadata.description ||
    metadata.title ||
    "";

  if (!text.trim()) return null;

  const username =
    m.username ||
    m.author ||
    m.channelName ||
    m.handle ||
    "";

  const hashtags: string[] = m.hashtags || [];
  const context =
    [metadata.title, hashtags.join(" ")].filter(Boolean).join(" ");

  const lastMessages: string[] = m.lastMessages || [];
  const lastMessageTime: number = m.lastMessageTimeMs ?? 9999;

  return calculateHumanSignalScore({
    text,
    username,
    context,
    lastMessages,
    lastMessageTime,
  });
}

function calculateHumanSignalScore(input: {
  text: string;
  username?: string;
  context?: string;
  lastMessages?: string[];
  lastMessageTime?: number;
}): HumanSignalResult {
  let {
    text,
    username = "",
    context = "",
    lastMessages = [],
    lastMessageTime = 9999,
  } = input;

  let score = 50;
  const lower = text.toLowerCase();

  // Linguistics
  if (/[a-z]{3,}[^a-z\s]{1,}/i.test(lower)) score += 8;
  if (/(bro|bruh|lmao|lol|idk|nah|fr|on god|rn|wtf)/i.test(lower)) score += 6;
  if (/(wow|pls|wild|insane|i swear)/i.test(lower)) score += 6;

  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  if (sentences.length >= 2 && sentences[0].length !== sentences[1]?.length)
    score += 8;

  if (/^[A-Z].*[a-z]+\.$/.test(text) && text.length > 25) score -= 6;
  if (text.length < 10) score -= 8;

  // Repetition cues
  if (/(😂😂|😭😭|🔥🔥|😍😍)/.test(lower)) score -= 10;
  if (/(.)\1{3,}/.test(lower)) score -= 6;
  if (/[?!]{2,}|\.{2,}/.test(lower)) score += 4;

  // Timing cues
  if (lastMessageTime < 2000) score -= 12;
  if (lastMessageTime < 1000) score -= 20;
  if (lastMessageTime > 4000) score += 12;

  // Context matching
  if (context) {
    const cWords = context.toLowerCase().split(/\W+/);
    const tWords = lower.split(/\W+/);
    const intersection = tWords.filter(w => cWords.includes(w));

    if (intersection.length >= 2) score += 10;
    if (intersection.length === 0 && tWords.length >= 3) score -= 10;
  }

  // Username entropy
  const entropy = usernameEntropy(username);
  if (entropy > 0.75) score -= 12;
  if (entropy < 0.45 && username.trim()) score += 6;

  // Comment diversity
  if (lastMessages.length) {
    const lengths = lastMessages.map(m => m.length);
    if (lengths.every(l => l < 8)) score -= 6;

    const emojiHeavy = lastMessages.filter(
      m => /[😂😭🔥😍💯]/.test(m)
    ).length;
    if (emojiHeavy >= 3) score -= 4;

    const variance =
      Math.max(...lengths) - Math.min(...lengths);
    if (variance > 10) score += 6;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 80
      ? "human"
      : score >= 60
        ? "likely-human"
        : score >= 40
          ? "suspect"
          : "ai";

  return { score, label };
}

function usernameEntropy(name: string): number {
  if (!name) return 0.5;

  const chars = name.split("");
  const freq: Record<string, number> = {};

  chars.forEach(c => {
    freq[c] = (freq[c] ?? 0) + 1;
  });

  let entropy = 0;
  for (const c in freq) {
    const p = freq[c] / chars.length;
    entropy -= p * Math.log2(p);
  }

  return entropy / 5;
}
