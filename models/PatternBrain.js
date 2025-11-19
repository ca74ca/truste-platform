// models/PatternBrain.js

import mongoose from "mongoose";

const PatternBrainSchema = new mongoose.Schema({
  // Cluster type: "human", "ai", "mixed", "creator", "platform"
  clusterType: { type: String, required: true, index: true },

  // Platform (tiktok, reddit, youtube, ig, twitter, etc.)
  platform: { type: String, index: true },

  // Text shape fingerprints
  centroid: {
    lengthAvg: Number,
    lengthStd: Number,
    punctuationRate: Number,
    capsRate: Number,
    emojiRate: Number,
    digitRate: Number,
    urlRate: Number,
    entropy: Number,
    burstiness: Number,
  },

  // Higher-level writing-style markers
  signature: {
    functionWords: [String],   // e.g. "therefore", "however"
    transitionWords: [String], // AI often uses these
    semanticDensity: Number,
    coherenceScore: Number,
    repetitiveness: Number,
  },

  // How many samples built this cluster
  sampleCount: { type: Number, default: 0 },

  // Timestamp for nightly updates
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.PatternBrain ||
  mongoose.model("PatternBrain", PatternBrainSchema);
