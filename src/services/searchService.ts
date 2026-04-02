/**
 * Frontend-Only Search Service
 * Integrates DuckDuckGo (Web, Images, Videos) and Wikipedia API directly from the browser using Puter.js.
 */

export interface SearchResult {
  type: string;
  title: string;
  url: string;
  snippet: string;
  thumbnail?: string;
  favicon?: string;
  metadata?: {
    domain: string;
    engine?: string;
    score?: number;
  };
}

export interface SearchAggregations {
  count: number;
  time: string;
  engines: string[];
  instance: string | null;
}

export interface SearchResponse {
  query: string;
  category: string;
  results: SearchResult[];
  aggregations: SearchAggregations;
}

// Simple in-memory cache
const searchCache = new Map<string, { data: SearchResponse, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

declare const puter: any;

async function fetchWithPuter(url: string, options?: any) {
  if (typeof puter !== 'undefined' && puter.net && puter.net.fetch) {
    try {
      const response = await puter.net.fetch(url, options);
      if (response.ok) {
        return await response.text();
      }
    } catch (e) {
      console.warn("Puter fetch failed, falling back to direct fetch", e);
    }
  }
  
  // Fallback to direct fetch (might fail due to CORS)
  const response = await fetch(url, options);
  if (response.ok) {
    return await response.text();
  }
  throw new Error(`Fetch failed for ${url}`);
}

async function getDDGVqd(query: string): Promise<string | null> {
  try {
    const html = await fetchWithPuter(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
    const match = html.match(/vqd=["']?([^"'\s&]+)["']?/);
    return match ? match[1] : null;
  } catch (e) {
    console.error("Failed to get DDG vqd", e);
    return null;
  }
}

async function searchDDGWeb(query: string): Promise<SearchResult[]> {
  try {
    const html = await fetchWithPuter(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results: SearchResult[] = [];
    
    const resultElements = doc.querySelectorAll('.result');
    resultElements.forEach(el => {
      const titleEl = el.querySelector('.result__title a');
      const snippetEl = el.querySelector('.result__snippet');
      const urlEl = el.querySelector('.result__url');
      
      if (titleEl && snippetEl) {
        const title = titleEl.textContent?.trim() || '';
        const url = titleEl.getAttribute('href') || '';
        const snippet = snippetEl.textContent?.trim() || '';
        
        let actualUrl = url;
        if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
          try {
            actualUrl = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          } catch (e) {}
        }
        
        let domain = "unknown";
        try { domain = new URL(actualUrl).hostname; } catch(e) {}
        
        results.push({
          type: 'general',
          title,
          url: actualUrl,
          snippet,
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
          metadata: { domain, engine: 'DuckDuckGo' }
        });
      }
    });
    return results;
  } catch (e) {
    console.error("DDG Web search failed", e);
    return [];
  }
}

async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    // Wikipedia API supports CORS
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
    const data = await res.json();
    
    if (!data.query || !data.query.search) return [];
    
    return data.query.search.map((item: any) => {
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`;
      const snippet = item.snippet.replace(/<[^>]*>?/gm, ''); // Strip HTML
      return {
        type: 'general',
        title: `${item.title} - Wikipedia`,
        url,
        snippet,
        favicon: `https://www.google.com/s2/favicons?domain=en.wikipedia.org&sz=32`,
        metadata: { domain: 'en.wikipedia.org', engine: 'Wikipedia' }
      };
    });
  } catch (e) {
    console.error("Wikipedia search failed", e);
    return [];
  }
}

async function searchDDGImages(query: string, vqd: string): Promise<SearchResult[]> {
  try {
    const jsonStr = await fetchWithPuter(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}`);
    const data = JSON.parse(jsonStr);
    
    if (!data.results) return [];
    
    return data.results.map((item: any) => {
      let domain = "unknown";
      try { domain = new URL(item.url).hostname; } catch(e) {}
      
      return {
        type: 'images',
        title: item.title || 'Image',
        url: item.url,
        snippet: item.title || '',
        thumbnail: item.thumbnail || item.image,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        metadata: { domain, engine: 'DuckDuckGo Images' }
      };
    });
  } catch (e) {
    console.error("DDG Image search failed", e);
    return [];
  }
}

async function searchDDGVideos(query: string, vqd: string): Promise<SearchResult[]> {
  try {
    const jsonStr = await fetchWithPuter(`https://duckduckgo.com/v.js?q=${encodeURIComponent(query)}&o=json&vqd=${vqd}`);
    const data = JSON.parse(jsonStr);
    
    if (!data.results) return [];
    
    return data.results.map((item: any) => {
      let domain = "unknown";
      try { domain = new URL(item.content).hostname; } catch(e) {}
      
      return {
        type: 'videos',
        title: item.title || 'Video',
        url: item.content,
        snippet: item.description || '',
        thumbnail: item.images?.medium || item.images?.small,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        metadata: { domain, engine: 'DuckDuckGo Videos' }
      };
    });
  } catch (e) {
    console.error("DDG Video search failed", e);
    return [];
  }
}

export async function performSearch(query: string, category: string = 'general', safebased: boolean = true, fastMode: boolean = false): Promise<SearchResponse> {
  const cacheKey = `${query}:${category}:${safebased}:${fastMode}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const startTime = Date.now();
  let finalResults: SearchResult[] = [];
  let enginesUsed: Set<string> = new Set();

  try {
    if (category === 'general') {
      const [ddgResults, wikiResults, summaryResult] = await Promise.all([
        searchDDGWeb(query),
        searchWikipedia(query),
        fetchSummary(query)
      ]);
      
      // Add Instant Answer first if available
      if (summaryResult) {
        if (summaryResult.AbstractText) {
          finalResults.push({
            type: 'instant_answer',
            title: summaryResult.Heading || 'Instant Answer',
            url: summaryResult.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: summaryResult.AbstractText,
            favicon: `https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=32`,
            metadata: { domain: summaryResult.AbstractSource || 'DuckDuckGo', engine: 'DuckDuckGo Instant Answer' }
          });
          enginesUsed.add('DuckDuckGo Instant Answer');
        } else if (summaryResult.Answer) {
           finalResults.push({
            type: 'instant_answer',
            title: summaryResult.Heading || 'Answer',
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: summaryResult.Answer,
            favicon: `https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=32`,
            metadata: { domain: 'DuckDuckGo', engine: 'DuckDuckGo Instant Answer' }
          });
          enginesUsed.add('DuckDuckGo Instant Answer');
        }
        
        // If DDG Web fails, use RelatedTopics as fallback
        if (ddgResults.length === 0 && summaryResult.RelatedTopics) {
          summaryResult.RelatedTopics.forEach((topic: any) => {
            if (topic.Text && topic.FirstURL) {
              ddgResults.push({
                type: 'general',
                title: topic.Text.split(' - ')[0] || 'Related Topic',
                url: topic.FirstURL,
                snippet: topic.Text,
                favicon: `https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=32`,
                metadata: { domain: 'duckduckgo.com', engine: 'DuckDuckGo Related' }
              });
            }
          });
        }
      }

      // Interleave results
      const maxLength = Math.max(ddgResults.length, wikiResults.length);
      for (let i = 0; i < maxLength; i++) {
        if (wikiResults[i]) finalResults.push(wikiResults[i]);
        if (ddgResults[i]) finalResults.push(ddgResults[i]);
      }
      
      if (ddgResults.length > 0) enginesUsed.add('DuckDuckGo');
      if (wikiResults.length > 0) enginesUsed.add('Wikipedia');
      
    } else if (category === 'images' || category === 'videos') {
      const vqd = await getDDGVqd(query);
      if (vqd) {
        if (category === 'images') {
          finalResults = await searchDDGImages(query, vqd);
          enginesUsed.add('DuckDuckGo Images');
        } else {
          finalResults = await searchDDGVideos(query, vqd);
          enginesUsed.add('DuckDuckGo Videos');
        }
      }
    }
  } catch (e) {
    console.error("Search failed", e);
  }

  // Deduplicate by URL
  const uniqueResults = Array.from(new Map(finalResults.map(item => [item.url, item])).values());

  const endTime = Date.now();
  const searchTime = ((endTime - startTime) / 1000).toFixed(2);

  const response: SearchResponse = {
    query,
    category,
    results: uniqueResults.slice(0, 25),
    aggregations: {
      count: uniqueResults.length,
      engines: Array.from(enginesUsed),
      instance: "Frontend AI Search",
      time: searchTime
    }
  };

  searchCache.set(cacheKey, { data: response, timestamp: Date.now() });
  return response;
}

export async function fetchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
    const data: any = await response.json();
    return data[1] || [];
  } catch (err) {
    return [];
  }
}

export async function fetchSummary(query: string): Promise<any> {
  if (!query) return null;
  try {
    const jsonStr = await fetchWithPuter(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

