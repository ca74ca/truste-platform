// pages/api/message.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { message, url } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Missing message" });
    }

    // Your extension ONLY cares that this endpoint returns success.
    return res.status(200).json({
      success: true,
      received: message,
      url,
    });
  } catch (err: any) {
    console.error("MESSAGE ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
