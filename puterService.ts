
/**
 * Vayu AGI Service
 * Strictly frontend-only implementation using Puter.js SDK.
 * Utilizes 'nvidia/nemotron-3-super-120b-a12b:free' for synthesis.
 */

import { performSearch } from './src/services/searchService';

declare const puter: any;

export interface AttachedFile {
  data: string; // base64
  mimeType: string;
}

export interface StreamResponse {
  text: string;
  done: boolean;
  sources: Array<{ title: string; uri: string }>;
  images?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  videos?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  engine?: 'Vayu AGI Synthesis' | 'Local Cache';
  isCached?: boolean;
  step?: string;
}

interface CacheEntry {
  text: string;
  sources: Array<{ title: string; uri: string }>;
  images?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  videos?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  relatedQueries: string[];
  timestamp: number;
  engine: string;
}

const CACHE_TTL = 3600000; // 1 hour

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MODELS = [
  { name: "⚡ Fast", model: "z-ai/glm-4.7-flash", timeout: 10000 },
  { name: "🧠 Balanced", model: "z-ai/glm-4.6", timeout: 15000 },
  { name: "🔬 Reasoning", model: "moonshotai/kimi-k2.5", timeout: 20000 },
  { name: "🛡️ Safe", model: "gpt-4o-mini", timeout: 15000 }
];

function runWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    fn().then(r => { clearTimeout(t); resolve(r); })
        .catch(e => { clearTimeout(t); reject(e); });
  });
}

function extractLinks(text: string): string[] {
  // Improved regex to avoid trailing punctuation and common false positives
  const urlRegex = /(https?:\/\/[^\s<"']+)/g;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches.map(url => {
    // Remove trailing punctuation that's likely not part of the URL
    return url.replace(/[.,;:)\]!?"']+$/, '');
  })));
}

function extractVideos(links: string[]): string[] {
  return links.filter(l => l.includes("youtube.com") || l.includes("youtu.be") || l.includes("vimeo.com") || l.includes("dailymotion.com"));
}

function extractImages(links: string[]): string[] {
  return links.filter(l =>
    l.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)/)
  );
}

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
        { model: 'nvidia/nemotron-3-super-120b-a12b:free' }
      );
      const text = (response.message?.content || response.toString()).trim();
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
        { model: 'nvidia/nemotron-3-super-120b-a12b:free' }
      );
      const text = (response.message?.content || response.toString()).trim();
      const match = text.match(/\[.*\]/s);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return ["Future of Vayu AGI", "Quantum Neural Architectures", "Real-time Synthesis"];
    }
  }

  async searchWebImages(query: string): Promise<string[]> {
    try {
      const res = await performSearch(query, 'images');
      return res.results.map(r => r.url).slice(0, 8);
    } catch {
      return [`https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200`];
    }
  }

  async generateAIImage(prompt: string): Promise<string | null> {
    try {
      // Ensure puter is ready
      if (typeof puter === 'undefined') return null;
      const res = await puter.ai.txt2img(prompt);
      if (res && typeof res === 'object' && 'src' in res) return res.src;
      if (res instanceof HTMLImageElement) return res.src;
      if (typeof res === 'string') return res;
      return null;
    } catch (e) {
      console.error("AI Image Generation failed", e);
      return null;
    }
  }

  async generateAIVideo(prompt: string): Promise<string | null> {
    try {
      if (typeof puter === 'undefined') return null;
      const res = await puter.ai.txt2vid(prompt);
      if (res && typeof res === 'object' && 'src' in res) return res.src;
      if (res instanceof HTMLVideoElement) return res.src;
      if (typeof res === 'string') return res;
      return null;
    } catch (e) {
      console.error("AI Video Generation failed", e);
      return null;
    }
  }

  async *streamSearch(query: string, file?: AttachedFile): AsyncGenerator<StreamResponse> {
    if (typeof puter === 'undefined') {
      yield { text: "Puter SDK not initialized. Please refresh.", done: true, sources: [] };
      return;
    }
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
        yield { text: "", done: true, sources: cached.sources, images: cached.images, videos: cached.videos, isCached: true, engine: 'Local Cache' };
        return;
      }
    }

    yield { text: "", done: false, sources: [], step: "Initializing Vayu Neural Bridge..." };
    
    try {
      yield { text: "", done: false, sources: [], step: "Engaging AGI with live web search tools..." };
      
      // Parallel fetch for images and videos to ensure we have them even if AI doesn't link them
      const mediaPromise = Promise.all([
        performSearch(query, 'images').catch(() => ({ results: [] })),
        performSearch(query, 'videos').catch(() => ({ results: [] }))
      ]);

      let bestResponse: any = null;
      let usedModelName = "";

      // Model Racing / Fallback
      for (const m of MODELS) {
        try {
          yield { text: "", done: false, sources: [], step: `Synchronizing with ${m.name} Neural Core...` };
          bestResponse = await runWithTimeout(() => 
            puter.ai.chat(
              `You are Vayu AGI. Perform a deep web search and synthesize a comprehensive answer for: "${query}". 
              Include relevant URLs in your response. Format with markdown.`, 
              { 
                model: m.model,
                tools: [{ type: "web_search" }]
              }
            ), 
            m.timeout
          );
          usedModelName = m.name;
          if (bestResponse) break;
        } catch (e) {
          console.warn(`Model ${m.name} failed or timed out, trying next...`);
        }
      }

      if (!bestResponse) {
        throw new Error("All neural cores failed to respond.");
      }

      let fullText = "";
      if (typeof bestResponse === 'string') {
        fullText = bestResponse;
      } else if (bestResponse.message?.content) {
        fullText = bestResponse.message.content;
      } else if (bestResponse.content) {
        fullText = bestResponse.content;
      } else {
        fullText = JSON.stringify(bestResponse);
      }

      const foundLinks = extractLinks(fullText);
      
      // Wait for media results
      const [imageRes, videoRes] = await mediaPromise;

      const sources = foundLinks.slice(0, 8).map(url => ({ 
        title: url.split('/')[2] || "Source", 
        uri: url 
      }));

      // Combine AI-extracted images with search results
      const aiImages = extractImages(foundLinks).map(url => ({
        url,
        title: "Web Image",
        metadata: { domain: url.split('/')[2] || "web" }
      }));
      const images = [...aiImages, ...imageRes.results].slice(0, 12);

      // Combine AI-extracted videos with search results
      const aiVideos = extractVideos(foundLinks).map(url => ({
        url,
        title: "Web Video",
        metadata: { domain: url.split('/')[2] || "video" }
      }));
      const videos = [...aiVideos, ...videoRes.results].slice(0, 12);

      yield { text: "", done: false, sources, images, videos, step: "Neural Synthesis Complete. Finalizing Artifacts..." };
      
      // Reconstitute streaming effect
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i += 15) {
        await sleep(10);
        yield { 
          text: words.slice(i, i + 15).join(' ') + ' ', 
          done: false, 
          sources, 
          images, 
          videos, 
          engine: 'Vayu AGI Synthesis' 
        };
      }

      // Persist to cache
      this.cache[cacheKey] = {
        text: fullText,
        sources, 
        images,
        videos,
        relatedQueries: [],
        timestamp: Date.now(),
        engine: 'Vayu AGI Synthesis'
      };
      this.persistCache();

      yield { text: "", done: true, sources, images, videos, engine: 'Vayu AGI Synthesis' };
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
