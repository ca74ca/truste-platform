// pages/api/truste-log.js

import dbConnect from "../../lib/mongodb";
import TrusteLog from "../../models/TrusteLog";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { batch } = req.body;

    if (!Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid batch format" });
    }

    // BULK INSERT FOR MAX PERFORMANCE
    await TrusteLog.insertMany(batch, { ordered: false });

    return res.status(200).json({
      success: true,
      inserted: batch.length,
    });
  } catch (error) {
    console.error("Error logging TRUSTE batch:", error);
    return res.status(500).json({
      error: "Failed to log TRUSTE batch",
      details: error.message,
    });
  }
}
