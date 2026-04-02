
export interface SearchResult {
  text: string;
  sources: Array<{
    title: string;
    uri: string;
    snippet?: string;
    type?: string;
  }>;
}

export interface UsageStats {
  estimatedTokens: number;
  engine: 'Spark AI Synthesis' | 'Local Cache' | 'Quick Search Fallback';
  isCached: boolean;
  latency?: number;
}

export interface MediaResult {
  url: string;
  title: string;
  thumbnail?: string;
  type?: string;
  snippet?: string;
  metadata?: {
    domain: string;
    engine?: string;
    score?: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: MediaResult[]; 
  videos?: MediaResult[];
  aiImage?: string;
  aiVideo?: string;
  sources?: Array<{ title: string; uri: string; snippet?: string; type?: string }>;
  relatedQueries?: string[]; 
  usage?: UsageStats;
}
