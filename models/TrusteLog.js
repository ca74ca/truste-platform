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
  deviceId: { type: String, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export default mongoose.models.TrusteLog ||
  mongoose.model("TrusteLog", TrusteLogSchema);
