export type ContentMetadata = {
  viewCount?: number;
  commentCount?: number;
  followerCount?: number;
  engagementRate?: number;

  title?: string;
  description?: string;
  uploadDate?: string;

  arkhamData?: {
    blockchainSignals?: string[];
  };

  plaidData?: {
    plaidRiskScore?: number;
    plaidIdentityMismatch?: boolean;
    plaidBeaconSignals?: string[];
  };

  rawText?: string;
  caption?: string;

  username?: string;
  author?: string;
  channelName?: string;
  handle?: string;

  hashtags?: string[];
  lastMessages?: string[];
  lastMessageTimeMs?: number;
};
