// backend/brains/aiSignatureBrain.js
// Version B: Full Hybrid Intelligence
// Detects GPT-4, Claude, Gemini, and other LLM fingerprints

import dbConnect from "../../lib/mongodb.js";
import TrusteLog from "../../models/TrusteLog.js";

/**
 * AI Signature Brain - Hybrid Detection System
 * 
 * Three-tier approach:
 * 1. Fast heuristics (catches 80% of obvious cases)
 * 2. Token-rhythm classifier (local, no API)
 * 3. LLM fallback for uncertain cases (GPT-4o mini)
 */

// LLM API Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_LLM_FALLBACK = !!OPENAI_API_KEY;

/**
 * Main entry point: Analyze logs for AI signatures
 */
export async function updateAISignatures(logs) {
  console.log(`[AI Signature Brain] Analyzing ${logs.length} logs...`);

  let heuristicDetections = 0;
  let rhythmDetections = 0;
  let llmDetections = 0;
  let uncertainCases = [];

  for (const log of logs) {
    const text = log.textSignature || "";
    if (text.length < 20) continue; // Too short to analyze

    // TIER 1: Fast Heuristics
    const heuristicResult = detectAIHeuristics(text);
    
    if (heuristicResult.confidence > 0.85) {
      // High confidence - trust heuristics
      heuristicDetections++;
      log.aiSignature = heuristicResult;
      continue;
    }

    // TIER 2: Token Rhythm Classifier (local)
    const rhythmResult = detectTokenRhythm(text);
    
    if (rhythmResult.confidence > 0.75) {
      // Medium-high confidence - trust rhythm
      rhythmDetections++;
      log.aiSignature = rhythmResult;
      continue;
    }

    // TIER 3: Uncertain - queue for LLM analysis
    uncertainCases.push({ log, text });
  }

  // Batch LLM analysis for uncertain cases
  if (USE_LLM_FALLBACK && uncertainCases.length > 0) {
    console.log(`[AI Signature Brain] ${uncertainCases.length} uncertain cases → LLM analysis`);
    
    // Process in batches to minimize API costs
    const batchSize = 10;
    for (let i = 0; i < uncertainCases.length; i += batchSize) {
      const batch = uncertainCases.slice(i, i + batchSize);
      
      for (const { log, text } of batch) {
        try {
          const llmResult = await detectAIWithLLM(text);
          log.aiSignature = llmResult;
          llmDetections++;
        } catch (error) {
          console.error("[AI Signature Brain] LLM error:", error.message);
          // Fallback to rhythm result
          log.aiSignature = detectTokenRhythm(text);
        }
      }
      
      // Rate limiting - wait 100ms between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[AI Signature Brain] Complete:
    - Heuristic: ${heuristicDetections}
    - Rhythm: ${rhythmDetections}
    - LLM: ${llmDetections}
    - Total: ${heuristicDetections + rhythmDetections + llmDetections}
  `);

  return logs;
}

/**
 * TIER 1: Fast Heuristic Detection
 * Catches obvious AI patterns without API calls
 */
function detectAIHeuristics(text) {
  let aiScore = 0;
  const markers = [];

  // 1. Transition word overuse (AI loves these)
  const transitions = (text.match(/\b(however|moreover|furthermore|therefore|thus|consequently|additionally|nevertheless)\b/gi) || []).length;
  if (transitions > 2) {
    aiScore += 0.25;
    markers.push("excessive_transitions");
  }

  // 2. Perfect grammar + complex sentences
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  const avgSentenceLength = text.length / Math.max(sentences.length, 1);
  if (avgSentenceLength > 25 && avgSentenceLength < 35) {
    aiScore += 0.15;
    markers.push("optimal_sentence_length");
  }

  // 3. No typos + perfect punctuation
  const hasTypos = /\b(ur|gonna|wanna|kinda|shoulda|coulda|tho|cuz)\b/i.test(text);
  const perfectPunctuation = /^[A-Z].*[.!?]$/.test(text.trim());
  if (!hasTypos && perfectPunctuation && text.length > 50) {
    aiScore += 0.2;
    markers.push("perfect_writing");
  }

  // 4. Semantic uniformity (no style drift)
  const firstHalf = text.slice(0, text.length / 2);
  const secondHalf = text.slice(text.length / 2);
  const styleConsistency = calculateStyleConsistency(firstHalf, secondHalf);
  if (styleConsistency > 0.9) {
    aiScore += 0.15;
    markers.push("no_style_drift");
  }

  // 5. AI-specific phrases
  const aiPhrases = [
    "it's important to note",
    "it's worth noting",
    "delve into",
    "navigate the landscape",
    "in today's digital age",
    "revolutionize the way",
    "unlock the potential",
    "game-changer",
  ];
  
  const foundPhrases = aiPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase)
  );
  
  if (foundPhrases.length > 0) {
    aiScore += 0.25 * foundPhrases.length;
    markers.push(...foundPhrases.map(p => `ai_phrase:${p}`));
  }

  // 6. Emoji absence in casual contexts
  const hasEmoji = /[\u{1F600}-\u{1F64F}]/gu.test(text);
  if (!hasEmoji && text.length > 100) {
    aiScore += 0.1;
    markers.push("no_emoji_casual");
  }

  aiScore = Math.min(aiScore, 1);

  return {
    isAI: aiScore > 0.6,
    confidence: aiScore,
    model: detectModel(text, markers),
    markers,
    method: "heuristic"
  };
}

/**
 * TIER 2: Token Rhythm Classifier
 * Detects probability rhythm patterns (local, no API)
 */
function detectTokenRhythm(text) {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  // Calculate token entropy
  const freq = {};
  words.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / words.length;
    entropy -= p * Math.log2(p);
  }

  // Normalized entropy (0-1)
  const maxEntropy = Math.log2(words.length);
  const normalizedEntropy = entropy / maxEntropy;

  // AI tends to have entropy between 0.7-0.85
  // Humans: 0.6-0.95 (wider range)
  let aiScore = 0;
  
  if (normalizedEntropy > 0.7 && normalizedEntropy < 0.85) {
    aiScore += 0.3;
  }

  // Burstiness: variance in word repetition
  const repetitions = Object.values(freq);
  const avgRep = repetitions.reduce((a, b) => a + b, 0) / repetitions.length;
  const variance = repetitions.reduce((sum, r) => sum + Math.pow(r - avgRep, 2), 0) / repetitions.length;
  const burstiness = Math.sqrt(variance) / avgRep;

  // AI: lower burstiness (more uniform)
  // Humans: higher burstiness (style shifts)
  if (burstiness < 0.5) {
    aiScore += 0.25;
  }

  // Sentence length uniformity
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  const sentenceLengths = sentences.map(s => s.length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const lengthVariance = sentenceLengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / sentenceLengths.length;
  const uniformity = 1 - (Math.sqrt(lengthVariance) / avgLength);

  if (uniformity > 0.7) {
    aiScore += 0.2;
  }

  aiScore = Math.min(aiScore, 1);

  return {
    isAI: aiScore > 0.55,
    confidence: aiScore,
    model: detectModel(text, []),
    markers: [
      `entropy:${normalizedEntropy.toFixed(2)}`,
      `burstiness:${burstiness.toFixed(2)}`,
      `uniformity:${uniformity.toFixed(2)}`
    ],
    method: "rhythm"
  };
}

/**
 * TIER 3: LLM Fallback (GPT-4o mini)
 * For uncertain cases only
 */
async function detectAIWithLLM(text) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const prompt = `Analyze this text and determine if it was written by AI or a human.

Text: "${text}"

Respond in JSON format:
{
  "isAI": true/false,
  "confidence": 0.0-1.0,
  "model": "gpt-4" | "claude" | "gemini" | "human" | "unknown",
  "reasoning": "brief explanation"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an AI text detection expert. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      isAI: result.isAI,
      confidence: result.confidence,
      model: result.model,
      markers: [result.reasoning],
      method: "llm"
    };
  } catch (error) {
    console.error("[AI Signature Brain] LLM detection failed:", error);
    throw error;
  }
}

/**
 * Detect specific AI model from writing patterns
 */
function detectModel(text, markers) {
  // GPT-4 signatures
  if (markers.includes("excessive_transitions") && 
      markers.some(m => m.includes("ai_phrase"))) {
    return "gpt-4";
  }

  // Claude signatures (more casual, narrative style)
  if (text.includes("let's") || text.includes("we can")) {
    return "claude";
  }

  // Gemini signatures (very structured, list-heavy)
  if ((text.match(/\n-/g) || []).length > 2) {
    return "gemini";
  }

  return "unknown";
}

/**
 * Calculate style consistency between two text segments
 */
function calculateStyleConsistency(text1, text2) {
  const getStyle = (text) => {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const punctuation = (text.match(/[.,!?]/g) || []).length / text.length;
    return { avgWordLength, punctuation };
  };

  const style1 = getStyle(text1);
  const style2 = getStyle(text2);

  const wordLengthDiff = Math.abs(style1.avgWordLength - style2.avgWordLength) / 
                         Math.max(style1.avgWordLength, style2.avgWordLength);
  const punctDiff = Math.abs(style1.punctuation - style2.punctuation);

  return 1 - ((wordLengthDiff + punctDiff) / 2);
}

export default updateAISignatures;
