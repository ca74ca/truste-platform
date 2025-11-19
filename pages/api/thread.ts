// pages/api/thread.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    return res.status(200).json({
      success: true,
      threadId: "local-thread", // Extension only needs ANY valid string
    });
  } catch (err: any) {
    console.error("THREAD ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
