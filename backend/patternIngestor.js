// backend/patternIngestor.js

import dbConnect from "../lib/mongodb.js";
import TrusteLog from "../models/TrusteLog.js";
import PatternBrain from "../models/PatternBrain.js";
import { updateAISignatures } from "./brains/aiSignatureBrain.js";

/**
 * Pattern Ingestor - Nightly ML Training Pipeline
 * Aggregates TrusteLog data into PatternBrain clusters
 */

export async function ingestPatternsNightly() {
  console.log("[Pattern Ingestor] Starting nightly ingestion...");
  
  await dbConnect();

  try {
    // Get all logs from the last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await TrusteLog.find({ createdAt: { $gte: cutoff } });

    console.log(`[Pattern Ingestor] Processing ${logs.length} logs...`);

    // ✨ NEW: AI Signature Detection
    await updateAISignatures(logs);

    // Group by platform/domain
    const platformGroups = {};
    
    logs.forEach(log => {
      const platform = detectPlatform(log.domain);
      if (!platformGroups[platform]) {
        platformGroups[platform] = [];
      }
      platformGroups[platform].push(log);
    });

    // Process each platform
    for (const [platform, platformLogs] of Object.entries(platformGroups)) {
      await processPlatformCluster(platform, platformLogs);
    }

    console.log("[Pattern Ingestor] Nightly ingestion complete.");
  } catch (error) {
    console.error("[Pattern Ingestor] Error:", error);
    throw error;
  }
}

/**
 * Process logs for a specific platform and update clusters
 */
async function processPlatformCluster(platform, logs) {
  console.log(`[Pattern Ingestor] Processing ${platform}: ${logs.length} logs`);

  // Separate by score ranges to create human/ai/mixed clusters
  const humanLogs = logs.filter(l => l.score >= 0.7);
  const aiLogs = logs.filter(l => l.score < 0.3);
  const mixedLogs = logs.filter(l => l.score >= 0.3 && l.score < 0.7);

  // Update or create clusters
  await updateCluster("human", platform, humanLogs);
  await updateCluster("ai", platform, aiLogs);
  await updateCluster("mixed", platform, mixedLogs);
}

/**
 * Update or create a pattern cluster
 */
async function updateCluster(clusterType, platform, logs) {
  if (logs.length === 0) return;

  // Calculate centroid statistics
  const centroid = calculateCentroid(logs);
  const signature = calculateSignature(logs);

  // Find existing cluster or create new
  let cluster = await PatternBrain.findOne({ clusterType, platform });

  if (cluster) {
    // Update existing cluster with weighted average
    const totalSamples = cluster.sampleCount + logs.length;
    const weight = cluster.sampleCount / totalSamples;
    const newWeight = logs.length / totalSamples;

    cluster.centroid = {
      lengthAvg: (cluster.centroid.lengthAvg * weight) + (centroid.lengthAvg * newWeight),
      lengthStd: (cluster.centroid.lengthStd * weight) + (centroid.lengthStd * newWeight),
      punctuationRate: (cluster.centroid.punctuationRate * weight) + (centroid.punctuationRate * newWeight),
      capsRate: (cluster.centroid.capsRate * weight) + (centroid.capsRate * newWeight),
      emojiRate: (cluster.centroid.emojiRate * weight) + (centroid.emojiRate * newWeight),
      digitRate: (cluster.centroid.digitRate * weight) + (centroid.digitRate * newWeight),
      urlRate: (cluster.centroid.urlRate * weight) + (centroid.urlRate * newWeight),
      entropy: (cluster.centroid.entropy * weight) + (centroid.entropy * newWeight),
      burstiness: (cluster.centroid.burstiness * weight) + (centroid.burstiness * newWeight),
    };

    cluster.signature = signature;
    cluster.sampleCount = totalSamples;
    cluster.updatedAt = new Date();
  } else {
    // Create new cluster
    cluster = new PatternBrain({
      clusterType,
      platform,
      centroid,
      signature,
      sampleCount: logs.length,
    });
  }

  await cluster.save();
  console.log(`[Pattern Ingestor] Updated ${clusterType} cluster for ${platform}: ${logs.length} samples`);
}

/**
 * Calculate statistical centroid from logs
 */
function calculateCentroid(logs) {
  const lengths = logs.map(l => l.heuristics.length);
  const punctRates = logs.map(l => l.heuristics.punctuation / Math.max(l.heuristics.length, 1));
  const capsRates = logs.map(l => l.heuristics.caps / Math.max(l.heuristics.length, 1));
  const emojiRates = logs.map(l => l.heuristics.emojis / Math.max(l.heuristics.length, 1));
  const digitRates = logs.map(l => l.heuristics.digits / Math.max(l.heuristics.length, 1));
  const urlRates = logs.map(l => l.heuristics.urls / Math.max(l.heuristics.length, 1));

  return {
    lengthAvg: avg(lengths),
    lengthStd: std(lengths),
    punctuationRate: avg(punctRates),
    capsRate: avg(capsRates),
    emojiRate: avg(emojiRates),
    digitRate: avg(digitRates),
    urlRate: avg(urlRates),
    entropy: calculateEntropyAvg(logs),
    burstiness: calculateBurstiness(logs),
  };
}

/**
 * Calculate writing style signature
 */
function calculateSignature(logs) {
  // Extract common function words across all texts
  const functionWords = extractCommonWords(logs, /\b(however|therefore|thus|moreover|furthermore|nevertheless)\b/gi);
  const transitionWords = extractCommonWords(logs, /\b(firstly|secondly|finally|additionally|consequently)\b/gi);

  return {
    functionWords: functionWords.slice(0, 10),
    transitionWords: transitionWords.slice(0, 10),
    semanticDensity: calculateSemanticDensity(logs),
    coherenceScore: 0.5, // Placeholder for future implementation
    repetitiveness: calculateRepetitiveness(logs),
  };
}

/**
 * Detect platform from domain
 */
function detectPlatform(domain) {
  if (!domain) return "unknown";
  if (domain.includes("tiktok")) return "tiktok";
  if (domain.includes("reddit")) return "reddit";
  if (domain.includes("youtube")) return "youtube";
  if (domain.includes("instagram")) return "instagram";
  if (domain.includes("twitter") || domain.includes("x.com")) return "twitter";
  if (domain.includes("facebook")) return "facebook";
  return "other";
}

// Helper functions
function avg(arr) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function std(arr) {
  const mean = avg(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function calculateEntropyAvg(logs) {
  // Simplified Shannon entropy calculation
  return logs.reduce((sum, log) => {
    const text = log.textSignature || "";
    const freq = {};
    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / text.length;
      entropy -= p * Math.log2(p);
    }
    return sum + entropy;
  }, 0) / logs.length;
}

function calculateBurstiness(logs) {
  // Measure variability in sentence lengths
  const lengths = logs.map(l => l.heuristics.length);
  return std(lengths) / (avg(lengths) + 1);
}

function extractCommonWords(logs, regex) {
  const allMatches = [];
  logs.forEach(log => {
    const text = log.textSignature || "";
    const matches = text.match(regex);
    if (matches) allMatches.push(...matches.map(m => m.toLowerCase()));
  });
  
  // Count frequency
  const freq = {};
  allMatches.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });
  
  // Return sorted by frequency
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

function calculateSemanticDensity(logs) {
  // Ratio of unique words to total words (simplified)
  const allWords = [];
  logs.forEach(log => {
    const text = log.textSignature || "";
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    allWords.push(...words);
  });
  
  const uniqueWords = new Set(allWords);
  return allWords.length > 0 ? uniqueWords.size / allWords.length : 0;
}

function calculateRepetitiveness(logs) {
  // Measure how often similar patterns repeat
  const signatures = logs.map(l => l.textSignature || "");
  const uniqueSignatures = new Set(signatures);
  return signatures.length > 0 ? 1 - (uniqueSignatures.size / signatures.length) : 0;
}

// Export for cron job or API trigger
export default ingestPatternsNightly;
