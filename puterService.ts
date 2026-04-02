
/**
 * Spark AI Service
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
  sources: Array<{ title: string; uri: string; snippet?: string; type?: string }>;
  images?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  videos?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  engine?: 'Spark AI Synthesis' | 'Local Cache' | 'Quick Search Fallback';
  isCached?: boolean;
  step?: string;
}

interface CacheEntry {
  text: string;
  sources: Array<{ title: string; uri: string; snippet?: string; type?: string }>;
  images?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  videos?: Array<{ url: string; title: string; thumbnail?: string; metadata?: { domain: string; engine?: string } }>;
  relatedQueries: string[];
  timestamp: number;
  engine: string;
}

const CACHE_TTL = 3600000; // 1 hour

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MODELS = [
  { name: "⚡ Fast", model: "openai/gpt-4o-mini", timeout: 10000 },
  { name: "🧠 Deep", model: "openai/gpt-4o", timeout: 25000 },
  { name: "🚀 Claude", model: "anthropic/claude-3.5-sonnet", timeout: 20000 },
  { name: "🤖 Llama", model: "meta/llama-3.1-70b-instruct", timeout: 15000 }
];

async function browseUrl(url: string): Promise<string> {
  try {
    const res = await puter.net.fetch(url);
    const text = await res.text();
    // Simple HTML to text conversion (removing scripts and styles)
    return text
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 10000); // Limit to 10k chars for context
  } catch (e) {
    console.error("Failed to browse URL:", url, e);
    return "";
  }
}

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
      console.warn("Spark Memory Sector initialization failed", e);
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
      console.warn("Could not persist Spark cache", e);
    }
  }

  private getCacheKey(query: string, file?: AttachedFile): string {
    const fileHash = file ? file.data.substring(0, 32) : 'no-file';
    return `spark_${query.trim().toLowerCase()}_${fileHash}`;
  }

  async getSuggestions(input: string): Promise<string[]> {
    if (!input || input.length < 2) return [];
    try {
      const response = await puter.ai.chat(
        `Provide 4 logical search completions for: "${input}". Return ONLY a JSON array of strings. No extra text or markdown.`,
        { model: 'openai/gpt-4o-mini' }
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
        { model: 'openai/gpt-4o-mini' }
      );
      const text = (response.message?.content || response.toString()).trim();
      const match = text.match(/\[.*\]/s);
      return match ? JSON.parse(match[0]) : [];
    } catch {
      return ["Future of Spark AI", "Quantum Neural Architectures", "Real-time Synthesis"];
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

    yield { text: "", done: false, sources: [], step: "Initializing Spark Neural Bridge..." };
    
    try {
      // 1. START PARALLEL TASKS
      const urls = extractLinks(query);
      let webContext = "";
      
      const browsePromise = urls.length > 0 ? browseUrl(urls[0]) : Promise.resolve("");
      
      const searchPromise = Promise.all([
        performSearch(query, 'general', true, true).catch(() => ({ results: [] })),
        performSearch(query, 'images', true, true).catch(() => ({ results: [] })),
        performSearch(query, 'videos', true, true).catch(() => ({ results: [] }))
      ]);

      // AI Synthesis Promise
      const aiSynthesisPromise = (async () => {
        const webContext = await browsePromise;
        let bestResponse: any = null;
        let usedModelName = "";

        for (const m of MODELS) {
          try {
            bestResponse = await runWithTimeout(() => 
              puter.ai.chat(
                webContext 
                  ? `You are Spark AI. I have fetched the content of ${urls[0]} for you:
                     CONTEXT: ${webContext}
                     USER REQUEST: ${query}
                     Please analyze the provided context and answer the user's request. Include relevant URLs.`
                  : `You are Spark AI. Perform a deep web search and synthesize a comprehensive answer for: "${query}". 
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
        return bestResponse;
      })();

      // 2. RACE: AI vs SEARCH + 3s TIMEOUT
      let aiResult: any = null;
      let searchResult: any = null;
      let aiError: any = null;

      // We use a simple polling/wait mechanism to yield search results if AI is slow
      const startTime = Date.now();
      let fallbackYielded = false;

      while (!aiResult && !aiError) {
        // Check if AI finished or failed
        const aiCheck = await Promise.race([
          aiSynthesisPromise.then(res => ({ type: 'ai' as const, res })),
          aiSynthesisPromise.catch(err => ({ type: 'error' as const, err })),
          sleep(500).then(() => ({ type: 'wait' as const }))
        ]);

        if (aiCheck.type === 'ai') {
          aiResult = aiCheck.res;
          break;
        }
        
        if (aiCheck.type === 'error') {
          aiError = aiCheck.err;
          break;
        }

        // If 3 seconds passed and search is ready, yield search results as fallback
        if (!fallbackYielded && Date.now() - startTime > 3000) {
          const searchCheck = await Promise.race([
            searchPromise.then(res => ({ type: 'search' as const, res })),
            sleep(100).then(() => ({ type: 'not-ready' as const }))
          ]);

          if (searchCheck.type === 'search') {
            searchResult = searchCheck.res;
            const [genRes, imgRes, vidRes] = searchResult;
            
            const sources = genRes.results.slice(0, 8).map((r: any) => ({ 
              title: r.title || r.url.split('/')[2] || "Source", 
              uri: r.url,
              snippet: r.snippet,
              type: r.type
            }));

            if (sources.length > 0 || imgRes.results.length > 0) {
              yield { 
                text: "AI is synthesizing a deep response... Here are some quick results in the meantime.", 
                done: false, 
                sources, 
                images: imgRes.results.slice(0, 12), 
                videos: vidRes.results.slice(0, 12), 
                step: "Displaying Quick Search Fallback...",
                engine: 'Quick Search Fallback'
              };
              fallbackYielded = true;
            }
          }
        }

        // Safety break after 45s
        if (Date.now() - startTime > 45000) break; 
      }

      if (aiError || !aiResult) {
        console.warn("AI Synthesis failed, falling back to pure search results.");
        if (!searchResult) {
          searchResult = await searchPromise;
        }
        const [genRes, imgRes, vidRes] = searchResult;
        
        const searchSources = genRes.results.slice(0, 15).map((r: any) => ({
          title: r.title || r.url.split('/')[2] || "Source",
          uri: r.url,
          snippet: r.snippet,
          type: r.type
        }));
        
        const images = imgRes.results.slice(0, 12);
        const videos = vidRes.results.slice(0, 12);
        
        let fallbackText = "I could not synthesize an AI response at this time. However, here are the top search results for your query:\n\n";
        searchSources.forEach((s: any, i: number) => {
          fallbackText += `**${i+1}. [${s.title}](${s.uri})**\n${s.snippet}\n\n`;
        });
        
        yield { text: fallbackText, done: true, sources: searchSources, images, videos, engine: 'Quick Search Fallback' };
        return;
      }

      let fullText = "";
      if (typeof aiResult === 'string') {
        fullText = aiResult;
      } else if (aiResult.message?.content) {
        fullText = aiResult.message.content;
      } else if (aiResult.content) {
        fullText = aiResult.content;
      } else {
        fullText = JSON.stringify(aiResult);
      }

      const foundLinks = extractLinks(fullText);
      
      // Get search results if not already fetched
      if (!searchResult) {
        searchResult = await searchPromise;
      }
      const [genRes, imgRes, vidRes] = searchResult;

      const aiSources = foundLinks.slice(0, 8).map(url => ({ 
        title: url.split('/')[2] || "Source", 
        uri: url,
        type: 'ai_link'
      }));
      
      const searchSources = genRes.results.slice(0, 15).map((r: any) => ({
        title: r.title || r.url.split('/')[2] || "Source",
        uri: r.url,
        snippet: r.snippet,
        type: r.type
      }));
      
      // Deduplicate sources by URI
      const allSources = [...aiSources, ...searchSources];
      const uniqueSourcesMap = new Map();
      for (const s of allSources) {
        if (!uniqueSourcesMap.has(s.uri)) {
          uniqueSourcesMap.set(s.uri, s);
        }
      }
      const sources = Array.from(uniqueSourcesMap.values());

      // Combine AI-extracted images with search results
      const aiImages = extractImages(foundLinks).map(url => ({
        url,
        title: "Web Image",
        metadata: { domain: url.split('/')[2] || "web" }
      }));
      const images = [...aiImages, ...imgRes.results].slice(0, 12);

      // Combine AI-extracted videos with search results
      const aiVideos = extractVideos(foundLinks).map(url => ({
        url,
        title: "Web Video",
        metadata: { domain: url.split('/')[2] || "video" }
      }));
      const videos = [...aiVideos, ...vidRes.results].slice(0, 12);

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
          engine: 'Spark AI Synthesis' 
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
        engine: 'Spark AI Synthesis'
      };
      this.persistCache();

      yield { text: "", done: true, sources, images, videos, engine: 'Spark AI Synthesis' };
    } catch (error: any) {
      console.error("Spark Execution Error:", error);
      yield { text: "CRITICAL FAILURE: Neural connection to Spark AI core disrupted.", done: true, sources: [] };
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
