
export interface SearchResult {
  text: string;
  sources: Array<{
    title: string;
    uri: string;
  }>;
}

export interface UsageStats {
  estimatedTokens: number;
  engine: 'Puter AI (GPT-4o-mini)' | 'Local Cache';
  isCached: boolean;
  latency?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; 
  sources?: Array<{ title: string; uri: string }>;
  relatedQueries?: string[]; 
  usage?: UsageStats;
}
