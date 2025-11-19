import type { NextApiRequest, NextApiResponse } from "next";
import { calculateEffortScore } from "../../utils/effortRecipe";

/**
 * This interface defines the unified metadata format expected by the
 * EVE Proof-of-Human scoring engine.
 */
export interface ContentMetadata {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;

  followerCount?: number;
  username?: string;
  channelName?: string;
  author?: string;
  handle?: string;

  title?: string;
  description?: string;
  caption?: string;
  rawText?: string;
  hashtags?: string[];

  uploadDate?: string;
  lastMessageTimeMs?: number;
  lastMessages?: string[];

  platform?: string;

  arkhamData?: any;
  plaidData?: any;

  engagementRate?: number;
}

/**
 * Normalizes incoming JSON into unified ContentMetadata
 */
function normalizeMetadata(body: any): ContentMetadata {
  const meta: ContentMetadata = {};

  // Core metrics
  if (body.viewCount !== undefined) meta.viewCount = Number(body.viewCount);
  if (body.likeCount !== undefined) meta.likeCount = Number(body.likeCount);
  if (body.commentCount !== undefined) meta.commentCount = Number(body.commentCount);
  if (body.shareCount !== undefined) meta.shareCount = Number(body.shareCount);

  // Follower / creator
  if (body.followerCount !== undefined) meta.followerCount = Number(body.followerCount);
  if (body.username) meta.username = body.username;
  if (body.channelName) meta.channelName = body.channelName;
  if (body.author) meta.author = body.author;
  if (body.handle) meta.handle = body.handle;

  // Text / caption
  if (body.title) meta.title = body.title;
  if (body.description) meta.description = body.description;
  if (body.caption) meta.caption = body.caption;
  if (body.rawText) meta.rawText = body.rawText;
  if (body.hashtags) meta.hashtags = Array.isArray(body.hashtags) ? body.hashtags : [];

  // Timing
  if (body.uploadDate) meta.uploadDate = body.uploadDate;
  if (body.lastMessageTimeMs) meta.lastMessageTimeMs = Number(body.lastMessageTimeMs);
  if (body.lastMessages) meta.lastMessages = body.lastMessages;

  // Engine flags
  if (body.platform) meta.platform = body.platform;
  if (body.arkhamData) meta.arkhamData = body.arkhamData;
  if (body.plaidData) meta.plaidData = body.plaidData;

  if (body.engagementRate !== undefined) {
    meta.engagementRate = Number(body.engagementRate);
  }

  return meta;
}

/**
 * Main handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const metadata = normalizeMetadata(req.body);

    const scoreResult = await calculateEffortScore(metadata);

    return res.status(200).json({
      success: true,
      input: metadata,
      ...scoreResult,
    });
  } catch (err: any) {
    console.error("❌ scoreEffort error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error",
    });
  }
}
