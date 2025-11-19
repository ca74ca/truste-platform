// backend/brains/aiSignatureBrain.js
// ============================================================================
// TRUSTE 2026 — Hybrid Pattern Brain
// Multi-tier AI signature detection with:
//   1. Fast heuristics (style + phrasing)
//   2. Token rhythm + entropy (local, no API)
//   3. PatternBrain clusters (self-learning from TrusteLog)
//   4. Optional LLM fallback for uncertain cases
// ============================================================================

import dbConnect from "../db.js";
import TrusteLog from "../../models/TrusteLog.js";
import PatternBrain from "../../models/PatternBrain.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const USE_LLM_FALLBACK = !!OPENAI_API_KEY;

// Scores in this band will be considered "uncertain" and get extra attention
const UNCERTAIN_LOW = 0.40;
const UNCERTAIN_HIGH = 0.65;

// Hard clamp helpers
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const safeDiv = (a, b) => (b === 0 ? 0 : a / b);

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Enriches an array of TrusteLog docs with aiSignature objects.
 *
 * @param {Array<TrusteLog>} logs - Mongoose docs or plain objects with textSignature, heuristics, score, domain.
 * @param {Object} options
 * @param {string} [options.platform] - Optional platform hint (tiktok, reddit, etc).
 * @param {boolean} [options.includeLLM] - Force-enable LLM even if disabled globally.
 * @returns {Promise<Array<TrusteLog>>}
 */
export async function updateAISignatures(logs, options = {}) {
  if (!logs || logs.length === 0) return [];

  console.log(`[AI Signature Brain 2026] Start — ${logs.length} logs`);

  await dbConnect();

  const platformHint = options.platform || null;
  const includeLLM = options.includeLLM ?? USE_LLM_FALLBACK;

  // Preload PatternBrain clusters for all platforms we touch
  const domains = new Set(
    logs
      .map((l) => l.domain || "")
      .filter(Boolean)
  );
  const platforms = new Set(
    [...domains].map((d) => detectPlatform(d))
  );

  const patternBrainByPlatform = await loadPatternBrains([...platforms]);

  let heuristicDetections = 0;
  let rhythmDetections = 0;
  let patternDetections = 0;
  let llmDetections = 0;

  const uncertainForLLM = [];

  // Pass 1: local + PatternBrain
  for (const log of logs) {
    const text = (log.textSignature || "").trim();
    if (text.length < 32) {
      // Too short to say much, treat as low-confidence human/unknown
      log.aiSignature = {
        isAI: false,
        confidence: 0.35,
        method: "too-short",
        model: "unknown",
        markers: ["short_text"],
        sourceScores: {},
        version: "2026.1",
      };
      continue;
    }

    const platform = platformHint || detectPlatform(log.domain || "");
    const patternBrains = patternBrainByPlatform[platform] || null;

    // 1) Heuristics
    const heuristicResult = detectAIHeuristics(text);
    const hScore = heuristicResult.confidence;

    // 2) Rhythm
    const rhythmResult = detectTokenRhythm(text);
    const rScore = rhythmResult.confidence;

    // 3) PatternBrain (if available)
    const featureVector = buildFeatureVectorFromLog(log, text);
    const patternResult = patternBrains
      ? compareWithPatternBrain(patternBrains, featureVector)
      : {
          isAI: null,
          confidence: null,
          label: "no_pattern",
          markers: [],
        };
    const pScore =
      typeof patternResult.confidence === "number"
        ? patternResult.confidence
        : null;

    // 4) Core Truste heuristic score from SW (log.score)
    const calibratedScore =
      typeof log.score === "number" ? clamp01(log.score) : 0.5;

    // ---------------------------------------------------------------------
    // Hybrid fusion:
    // We blend:
    // - heuristics (40%)
    // - rhythm (25%)
    // - pattern brain (20% if available, otherwise redistributed)
    // - calibrated Truste score (15%)
    // ---------------------------------------------------------------------
    let weightH = 0.4;
    let weightR = 0.25;
    let weightP = pScore === null ? 0 : 0.20;
    let weightC = 0.15;

    // Re-normalize if patternBrain isn't giving us a score yet
    const wSum = weightH + weightR + weightP + weightC || 1;
    weightH /= wSum;
    weightR /= wSum;
    weightP /= wSum;
    weightC /= wSum;

    const combinedScore = clamp01(
      hScore * weightH +
        rScore * weightR +
        (pScore ?? 0.5) * weightP +
        calibratedScore * weightC
    );

    // Decide method/source for explanation
    const markers = [
      ...heuristicResult.markers,
      ...rhythmResult.markers,
      ...(patternResult.markers || []),
      `truste_calibrated:${calibratedScore.toFixed(2)}`,
    ];

    const modelGuess = guessModelFromSignals(
      text,
      markers,
      heuristicResult,
      rhythmResult,
      patternResult
    );

    const preliminarySignature = {
      isAI: combinedScore >= 0.6,
      confidence: combinedScore,
      method: "hybrid-local+pattern",
      model: modelGuess,
      markers,
      platform,
      sourceScores: {
        heuristics: hScore,
        rhythm: rScore,
        pattern: pScore,
        trusteCalibrated: calibratedScore,
      },
      version: "2026.1",
    };

    // Count local decisions
    if (preliminarySignature.isAI && combinedScore >= 0.8) {
      // Confident AI by local + PatternBrain alone
      if (patternResult.label === "ai") patternDetections++;
      else if (rhythmResult.isAI) rhythmDetections++;
      else heuristicDetections++;

      log.aiSignature = preliminarySignature;
      continue;
    }

    // If clearly human
    if (!preliminarySignature.isAI && combinedScore <= 0.35) {
      log.aiSignature = preliminarySignature;
      heuristicDetections++; // bucket as "human/low"
      continue;
    }

    // Otherwise uncertain; optionally queue for LLM
    if (includeLLM && combinedScore >= UNCERTAIN_LOW && combinedScore <= UNCERTAIN_HIGH) {
      uncertainForLLM.push({ log, text, preliminarySignature });
    } else {
      // Keep the hybrid result as-is
      log.aiSignature = preliminarySignature;
    }
  }

  // Pass 2: LLM fallback for uncertain cases
  if (includeLLM && uncertainForLLM.length > 0) {
    console.log(
      `[AI Signature Brain 2026] ${uncertainForLLM.length} uncertain cases → LLM fallback`
    );

    const batchSize = 6;
    for (let i = 0; i < uncertainForLLM.length; i += batchSize) {
      const batch = uncertainForLLM.slice(i, i + batchSize);

      // Process each in series within the batch to stay under rate limits
      for (const item of batch) {
        const { log, text, preliminarySignature } = item;
        try {
          const llmSig = await detectAIWithLLM(text);

          const mergedScore = clamp01(
            0.5 * preliminarySignature.confidence + 0.5 * llmSig.confidence
          );

          log.aiSignature = {
            ...preliminarySignature,
            isAI: mergedScore >= 0.6,
            confidence: mergedScore,
            method: "hybrid+llm",
            model: llmSig.model || preliminarySignature.model,
            markers: [
              ...(preliminarySignature.markers || []),
              ...(llmSig.markers || []),
            ],
            sourceScores: {
              ...(preliminarySignature.sourceScores || {}),
              llm: llmSig.confidence,
            },
          };

          llmDetections++;
        } catch (err) {
          console.error("[AI Signature Brain 2026] LLM fallback error:", err);

          // If LLM fails, keep the preliminary hybrid result
          log.aiSignature = preliminarySignature;
        }
      }

      // Small pause between batches
      await new Promise((res) => setTimeout(res, 120));
    }
  }

  console.log(
    `[AI Signature Brain 2026] Complete:
    - Heuristic / Human bucket: ${heuristicDetections}
    - Rhythm-dominant:        ${rhythmDetections}
    - PatternBrain-dominant:  ${patternDetections}
    - LLM-refined:            ${llmDetections}
    - Total logs:             ${logs.length}
  `
  );

  return logs;
}

export default updateAISignatures;

// ---------------------------------------------------------------------------
// PatternBrain loading & comparison
// ---------------------------------------------------------------------------

async function loadPatternBrains(platformList) {
  if (!platformList || platformList.length === 0) return {};

  const brains = await PatternBrain.find({
    platform: { $in: platformList },
  }).lean();

  const byPlatform = {};
  for (const brain of brains) {
    if (!byPlatform[brain.platform]) {
      byPlatform[brain.platform] = {
        human: null,
        ai: null,
        mixed: null,
      };
    }
    byPlatform[brain.platform][brain.clusterType] = brain;
  }

  return byPlatform;
}

/**
 * Compare a feature vector to PatternBrain clusters and derive an AI probability.
 */
function compareWithPatternBrain(patternBrains, featureVector) {
  const clusters = ["human", "ai", "mixed"];
  const sims = {};

  for (const type of clusters) {
    const brain = patternBrains[type];
    if (!brain || !brain.centroid) continue;
    sims[type] = similarityToCentroid(featureVector, brain.centroid);
  }

  const allVals = Object.values(sims).filter((v) => typeof v === "number");
  if (allVals.length === 0) {
    return {
      isAI: null,
      confidence: null,
      label: "no_pattern",
      markers: ["pattern:no_clusters"],
    };
  }

  // Normalize sims to a pseudo-probability distribution
  const sum = allVals.reduce((a, b) => a + b, 0) || 1;
  const probs = {};
  for (const type of clusters) {
    if (typeof sims[type] === "number") {
      probs[type] = sims[type] / sum;
    }
  }

  // AI probability = probability mass on "ai" + half of "mixed"
  const aiProb = clamp01(
    (probs.ai || 0) + 0.5 * (probs.mixed || 0)
  );

  let label = "unknown";
  let maxType = null;
  let maxVal = -Infinity;
  for (const [type, val] of Object.entries(probs)) {
    if (val > maxVal) {
      maxVal = val;
      maxType = type;
    }
  }
  label = maxType || "unknown";

  const markers = [
    `pattern_aiProb:${aiProb.toFixed(2)}`,
    `pattern_label:${label}`,
    ...Object.entries(probs).map(
      ([t, v]) => `pattern_${t}:${v.toFixed(2)}`
    ),
  ];

  return {
    isAI: aiProb >= 0.6,
    confidence: aiProb,
    label,
    markers,
  };
}

/**
 * Cosine-like similarity between feature vector and centroid.
 * Both are expected to have the same numeric keys.
 */
function similarityToCentroid(features, centroid) {
  const keys = [
    "lengthAvg",
    "punctuationRate",
    "capsRate",
    "emojiRate",
    "digitRate",
    "urlRate",
    "entropy",
    "burstiness",
  ];

  let dot = 0;
  let magF = 0;
  let magC = 0;

  for (const k of keys) {
    const fVal = Number(features[k] ?? 0);
    const cVal = Number(centroid[k] ?? 0);

    dot += fVal * cVal;
    magF += fVal * fVal;
    magC += cVal * cVal;
  }

  magF = Math.sqrt(magF);
  magC = Math.sqrt(magC);

  if (magF === 0 || magC === 0) return 0.0;
  return clamp01(dot / (magF * magC));
}

// ---------------------------------------------------------------------------
// Feature extraction from TrusteLog
// ---------------------------------------------------------------------------

/**
 * Build feature vector compatible with PatternBrain centroid fields.
 */
function buildFeatureVectorFromLog(log, text) {
  const h = log.heuristics || {};

  const length = Number(h.length ?? text.length ?? 0);

  const punct = Number(h.punctuation ?? (text.match(/[.,!?]/g) || []).length);
  const caps = Number(
    h.caps ?? (text.match(/[A-Z]{2,}/g) || []).length
  );
  const emojis = Number(
    h.emojis ?? (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length
  );
  const digits = Number(h.digits ?? (text.match(/\d/g) || []).length);
  const urls = Number(
    h.urls ?? (text.match(/https?:\/\//gi) || []).length
  );

  const punctuationRate = safeDiv(punct, Math.max(length, 1));
  const capsRate = safeDiv(caps, Math.max(length, 1));
  const emojiRate = safeDiv(emojis, Math.max(length, 1));
  const digitRate = safeDiv(digits, Math.max(length, 1));
  const urlRate = safeDiv(urls, Math.max(length, 1));

  const entropy = calculateEntropy(text);
  const burstiness = calculateBurstinessFromText(text);

  return {
    lengthAvg: length,
    punctuationRate,
    capsRate,
    emojiRate,
    digitRate,
    urlRate,
    entropy,
    burstiness,
  };
}

// ---------------------------------------------------------------------------
// Tier 1 — Heuristics
// ---------------------------------------------------------------------------

function detectAIHeuristics(text) {
  let aiScore = 0;
  const markers = [];

  const lower = text.toLowerCase();

  // 1. Transition word overuse
  const transitions =
    lower.match(
      /\b(however|moreover|furthermore|therefore|thus|consequently|additionally|nevertheless|in summary|in conclusion)\b/gi
    ) || [];
  if (transitions.length > 2) {
    aiScore += Math.min(0.3, 0.1 + transitions.length * 0.05);
    markers.push(`excessive_transitions:${transitions.length}`);
  }

  // 2. Perfect intro/outro framing
  if (
    /in today's (digital|online|ai|technology) (age|landscape)/i.test(lower) ||
    /it's important to note/i.test(lower)
  ) {
    aiScore += 0.2;
    markers.push("ai_meta_intro");
  }

  // 3. Sentence length regime (AI loves ~20–35 chars)
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = safeDiv(
    text.length,
    Math.max(sentences.length, 1)
  );
  if (avgSentenceLength > 22 && avgSentenceLength < 38) {
    aiScore += 0.15;
    markers.push(`optimal_sentence_length:${avgSentenceLength.toFixed(1)}`);
  }

  // 4. Typos vs. polished
  const hasSlang = /\b(ur|gonna|wanna|kinda|tho|cuz|lol|lmao|smh|wtf)\b/i.test(
    lower
  );
  const trimmed = text.trim();
  const perfectPunctuation = /^[A-Z].*[.!?]$/.test(trimmed);
  if (!hasSlang && perfectPunctuation && text.length > 80) {
    aiScore += 0.2;
    markers.push("perfect_writing_low_slang");
  }

  // 5. Style drift between halves
  const firstHalf = text.slice(0, Math.floor(text.length / 2));
  const secondHalf = text.slice(Math.floor(text.length / 2));
  const styleConsistency = calculateStyleConsistency(firstHalf, secondHalf);
  if (styleConsistency > 0.9) {
    aiScore += 0.15;
    markers.push(`no_style_drift:${styleConsistency.toFixed(2)}`);
  }

  // 6. AI stock phrases
  const aiPhrases = [
    "let's break this down",
    "step-by-step",
    "this guide will help you",
    "navigate the landscape",
    "unlock the potential",
    "it's worth noting that",
    "to summarize",
    "key takeaway",
  ];

  const foundPhrases = aiPhrases.filter((p) => lower.includes(p));
  if (foundPhrases.length > 0) {
    aiScore += Math.min(0.3, foundPhrases.length * 0.1);
    markers.push(...foundPhrases.map((p) => `ai_phrase:${p}`));
  }

  // 7. Emoji absence in clearly casual contexts
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}]/gu.test(text);
  if (!hasEmoji && /lol|haha|bro|dude|lmao|omg/i.test(text) && text.length > 60) {
    aiScore += 0.1;
    markers.push("no_emoji_casual");
  }

  aiScore = clamp01(aiScore);

  return {
    isAI: aiScore > 0.6,
    confidence: aiScore,
    model: "unknown",
    markers,
    method: "heuristic",
  };
}

// ---------------------------------------------------------------------------
// Tier 2 — Rhythm / Entropy
// ---------------------------------------------------------------------------

function detectTokenRhythm(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount = words.length || 1;

  // Token entropy
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / wordCount;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(wordCount);
  const normalizedEntropy = maxEntropy ? entropy / maxEntropy : 0;

  // Burstiness (variance in word repetition)
  const reps = Object.values(freq);
  const avgRep = reps.reduce((a, b) => a + b, 0) / reps.length;
  const variance =
    reps.reduce((sum, r) => sum + Math.pow(r - avgRep, 2), 0) / reps.length;
  const burstiness = avgRep ? Math.sqrt(variance) / avgRep : 0;

  // Sentence length uniformity
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
  const sentenceLengths = sentences.map((s) => s.length);
  const avgLength =
    sentenceLengths.reduce((a, b) => a + b, 0) /
    Math.max(sentenceLengths.length, 1);
  const lengthVar =
    sentenceLengths.reduce(
      (sum, l) => sum + Math.pow(l - avgLength, 2),
      0
    ) / Math.max(sentenceLengths.length, 1);
  const uniformity =
    avgLength > 0 ? 1 - Math.sqrt(lengthVar) / avgLength : 0;

  // Scoring:
  // AI tends to:
  // - medium-high entropy (0.70–0.85)
  // - lower burstiness (<0.5)
  // - higher uniformity (>0.7)
  let aiScore = 0;

  if (normalizedEntropy > 0.7 && normalizedEntropy < 0.86) {
    aiScore += 0.3;
  }
  if (burstiness < 0.5) {
    aiScore += 0.25;
  }
  if (uniformity > 0.7) {
    aiScore += 0.2;
  }

  aiScore = clamp01(aiScore);

  const markers = [
    `entropy:${normalizedEntropy.toFixed(2)}`,
    `burstiness:${burstiness.toFixed(2)}`,
    `uniformity:${uniformity.toFixed(2)}`,
  ];

  return {
    isAI: aiScore > 0.55,
    confidence: aiScore,
    model: "unknown",
    markers,
    method: "rhythm",
  };
}

// ---------------------------------------------------------------------------
// Tier 3 — LLM fallback
// ---------------------------------------------------------------------------

async function detectAIWithLLM(text) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const truncated =
    text.length > 2500 ? text.slice(0, 2500) + " …[truncated]" : text;

  const prompt = `You are an expert in detecting whether a piece of text is written by an AI or a human.

Analyze the following text and respond ONLY with valid JSON. No explanation outside JSON.

Text:
"""${truncated}"""

Your JSON format:
{
  "isAI": true or false,
  "confidence": 0.0 - 1.0,
  "model": "gpt-4" | "claude" | "gemini" | "llama" | "human" | "unknown",
  "reasoning": "short explanation of key indicators"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI text signature expert. Respond only with strict JSON and never with markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.05,
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || "{}";

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    console.error("[AI Signature Brain 2026] JSON parse error from LLM:", e);
    parsed = {
      isAI: false,
      confidence: 0.5,
      model: "unknown",
      reasoning: "fallback_parse_failure",
    };
  }

  return {
    isAI: !!parsed.isAI,
    confidence: clamp01(Number(parsed.confidence || 0.5)),
    model: parsed.model || "unknown",
    markers: [String(parsed.reasoning || "no_reason")],
    method: "llm",
  };
}

// ---------------------------------------------------------------------------
// Helpers — Entropy, burstiness, style
// ---------------------------------------------------------------------------

function calculateEntropy(text) {
  const freq = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  const len = text.length || 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function calculateBurstinessFromText(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return 0;

  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  const reps = Object.values(freq);
  const avgRep = reps.reduce((a, b) => a + b, 0) / reps.length;
  const variance =
    reps.reduce((sum, r) => sum + Math.pow(r - avgRep, 2), 0) / reps.length;
  return avgRep ? Math.sqrt(variance) / avgRep : 0;
}

/**
 * Style consistency between two segments (0–1).
 */
function calculateStyleConsistency(text1, text2) {
  const style = (t) => {
    const words = t.toLowerCase().match(/\b\w+\b/g) || [];
    const avgWordLength =
      words.reduce((s, w) => s + w.length, 0) / Math.max(words.length, 1);
    const punctDensity =
      (t.match(/[.,!?]/g) || []).length / Math.max(t.length, 1);
    return { avgWordLength, punctDensity };
  };

  const s1 = style(text1);
  const s2 = style(text2);

  const wlDiff =
    Math.abs(s1.avgWordLength - s2.avgWordLength) /
    Math.max(s1.avgWordLength, s2.avgWordLength || 1);
  const pDiff = Math.abs(s1.punctDensity - s2.punctDensity);

  return clamp01(1 - (wlDiff + pDiff) / 2);
}

// ---------------------------------------------------------------------------
// Platform detection & model guessing
// ---------------------------------------------------------------------------

function detectPlatform(domain) {
  if (!domain) return "unknown";
  const d = domain.toLowerCase();
  if (d.includes("tiktok")) return "tiktok";
  if (d.includes("reddit")) return "reddit";
  if (d.includes("youtube")) return "youtube";
  if (d.includes("instagram")) return "instagram";
  if (d.includes("twitter") || d.includes("x.com")) return "twitter";
  if (d.includes("facebook")) return "facebook";
  return "other";
}

function guessModelFromSignals(
  text,
  markers,
  heuristicResult,
  rhythmResult,
  patternResult
) {
  const lower = text.toLowerCase();

  // GPT-4-ish: heavy transitions + very polished structure
  if (
    markers.some((m) => m.startsWith("excessive_transitions")) &&
    markers.some((m) => m.startsWith("ai_phrase:"))
  ) {
    return "gpt-4";
  }

  // Claude-ish: conversational "let's", "we can", gentle tone
  if (
    /\b(let's|we can|we'll|we could)\b/i.test(lower) &&
    /here's the thing|the cool part|the nice part/i.test(lower)
  ) {
    return "claude";
  }

  // Gemini / list-heavy: long bulleted or enumerated content
  const bulletCount = (text.match(/\n[-*]\s/g) || []).length;
  const numberedCount = (text.match(/\n\d+\.\s/g) || []).length;
  if (bulletCount + numberedCount >= 3) {
    return "gemini";
  }

  // LLaMA-ish / open-weight: slightly more slang but still structured
  if (/open-source|meta ai|llama/i.test(lower)) {
    return "llama";
  }

  return "unknown";
}
