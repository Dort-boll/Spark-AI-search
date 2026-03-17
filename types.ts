
export interface SearchResult {
  text: string;
  sources: Array<{
    title: string;
    uri: string;
  }>;
}

export interface UsageStats {
  estimatedTokens: number;
  engine: 'Vayu AGI Synthesis' | 'Local Cache';
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
  sources?: Array<{ title: string; uri: string }>;
  relatedQueries?: string[]; 
  usage?: UsageStats;
}
