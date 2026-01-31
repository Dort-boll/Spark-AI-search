
/**
 * Puter AI Service
 * Strictly frontend-only implementation using Puter.js SDK.
 * Utilizes 'openai/gpt-4o-mini' with 'web_search' capabilities.
 */

declare const puter: any;

export interface AttachedFile {
  data: string; // base64
  mimeType: string;
}

export interface StreamResponse {
  text: string;
  done: boolean;
  sources: Array<{ title: string; uri: string }>;
  engine?: 'Puter AI (GPT-4o-mini)' | 'Local Cache';
  isCached?: boolean;
  step?: string;
}

interface CacheEntry {
  text: string;
  sources: Array<{ title: string; uri: string }>;
  relatedQueries: string[];
  timestamp: number;
  engine: string;
}

const CACHE_TTL = 3600000; // 1 hour

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class PuterService {
  private cache: Record<string, CacheEntry> = {};

  constructor() {
    try {
      const saved = localStorage.getItem('spark_puter_cache_v3');
      if (saved) {
        this.cache = JSON.parse(saved);
        this.cleanupCache();
      }
    } catch (e) {
      console.warn("Vayu Memory Sector initialization failed", e);
    }
  }

  private cleanupCache() {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > CACHE_TTL) {
        delete this.cache[key];
      }
    });
  }

  private persistCache() {
    try {
      localStorage.setItem('spark_puter_cache_v3', JSON.stringify(this.cache));
    } catch (e) {
      console.warn("Could not persist Vayu cache", e);
    }
  }

  private getCacheKey(query: string, file?: AttachedFile): string {
    const fileHash = file ? file.data.substring(0, 32) : 'no-file';
    return `vayu_${query.trim().toLowerCase()}_${fileHash}`;
  }

  async getSuggestions(input: string): Promise<string[]> {
    if (!input || input.length < 2) return [];
    try {
      const response = await puter.ai.chat(
        `Provide 4 logical search completions for: "${input}". Return ONLY a JSON array of strings. No extra text or markdown.`,
        { model: 'openai/gpt-4o-mini' }
      );
      const text = response.toString().trim();
      const match = text.match(/\[.*\]/s);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return [];
    }
  }

  async generateRelatedQueries(query: string, context: string): Promise<string[]> {
    try {
      const response = await puter.ai.chat(
        `Based on this summary: "${context.substring(0, 400)}", suggest 3 intelligent follow-up questions for the search: "${query}". Return only a JSON array of strings.`,
        { model: 'openai/gpt-4o-mini' }
      );
      const text = response.toString().trim();
      const match = text.match(/\[.*\]/s);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return ["Future of Vayu AGI", "Quantum Neural Architectures", "Real-time Synthesis"];
    }
  }

  async searchWebImages(query: string): Promise<string[]> {
    try {
      const response = await puter.ai.chat(
        `Provide 3 simple keywords for finding images related to: "${query}". Comma separated only.`,
        { model: 'openai/gpt-4o-mini' }
      );
      const keywords = response.toString().split(',').map((s: string) => s.trim().toLowerCase());
      return keywords.map((kw: string, i: number) => `https://loremflickr.com/1200/800/${encodeURIComponent(kw)}?lock=${i}`).slice(0, 3);
    } catch {
      return [`https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200`];
    }
  }

  async *streamSearch(query: string, file?: AttachedFile): AsyncGenerator<StreamResponse> {
    const cacheKey = this.getCacheKey(query, file);
    
    // Check local storage memory cache
    if (this.cache[cacheKey]) {
      const cached = this.cache[cacheKey];
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        yield { text: "", done: false, sources: [], step: "Accessing Local Memory Sector..." };
        const words = cached.text.split(' ');
        for (let i = 0; i < words.length; i += 12) {
          await sleep(15);
          yield { text: words.slice(i, i + 12).join(' ') + ' ', done: false, sources: [], isCached: true, engine: 'Local Cache' };
        }
        yield { text: "", done: true, sources: cached.sources, isCached: true, engine: 'Local Cache' };
        return;
      }
    }

    yield { text: "", done: false, sources: [], step: "Initializing Vayu Neural Bridge..." };
    
    try {
      yield { text: "", done: false, sources: [], step: "Engaging AGI with live web search tools..." };
      
      // Execute Puter AI Chat with Web Search Tool (Frontend Only)
      const response = await puter.ai.chat(query, {
        model: 'openai/gpt-4o-mini',
        tools: [{ type: 'web_search' }]
      });

      const fullText = response.toString();
      
      yield { text: "", done: false, sources: [], step: "Synthesizing real-time neural artifacts..." };
      
      // Reconstitute streaming effect for the AGI interface
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i += 10) {
        await sleep(20);
        yield { text: words.slice(i, i + 10).join(' ') + ' ', done: false, sources: [], engine: 'Puter AI (GPT-4o-mini)' };
      }

      // Persist to cache
      this.cache[cacheKey] = {
        text: fullText,
        sources: [], 
        relatedQueries: [],
        timestamp: Date.now(),
        engine: 'Puter AI (GPT-4o-mini)'
      };
      this.persistCache();

      yield { text: "", done: true, sources: [], engine: 'Puter AI (GPT-4o-mini)' };
    } catch (error: any) {
      console.error("Vayu Execution Error:", error);
      yield { text: "CRITICAL FAILURE: Neural connection to Vayu AGI core disrupted.", done: true, sources: [] };
    }
  }

  updateCacheRelated(query: string, file: AttachedFile | null, related: string[]) {
    const key = this.getCacheKey(query, file || undefined);
    if (this.cache[key]) {
      this.cache[key].relatedQueries = related;
      this.persistCache();
    }
  }
}

export const puterService = new PuterService();
