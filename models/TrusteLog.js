// models/TrusteLog.js

import mongoose from "mongoose";

const TrusteLogSchema = new mongoose.Schema({
  domain: { type: String, index: true },
  textSignature: { type: String },
  score: { type: Number },
  heuristics: {
    length: Number,
    caps: Number,
    punctuation: Number,
    digits: Number,
    emojis: Number,
    urls: Number,
  },
  // AI Signature Detection Results
  aiSignature: {
    isAI: Boolean,
    confidence: Number,
    model: String, // gpt-4, claude, gemini, human, unknown
    markers: [String],
    method: String, // heuristic, rhythm, llm
  },
  deviceId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.TrusteLog ||
  mongoose.model("TrusteLog", TrusteLogSchema);
