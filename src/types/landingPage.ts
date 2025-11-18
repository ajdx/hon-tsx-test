// ==========================================
// LANDING PAGE TYPE DEFINITIONS
// ==========================================

export interface AIModel {
  name: string;
  logo: string;
}

export interface Story {
  id: number;
  creator: string;
  video: string;
  profileImage: string;
}

export interface FeatureVideos {
  COLLABORATION: string;
  MONETIZATION: string;
}

export interface ManifestoImages {
  MAIN: string;
  OVERLAY: string;
}

// Video optimization types (already exist in videoOptimization.ts)
export interface VideoOptimizationOptions {
  quality?: 'auto' | 'low' | 'good' | 'best';
  format?: 'auto' | 'mp4' | 'webm';
  bitrate?: string;
  isMobile?: boolean;
}