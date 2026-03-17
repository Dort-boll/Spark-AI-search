/**
 * Decentralized Search Service (Frontend Only)
 * This service aggregates results from multiple SearXNG instances directly in the browser.
 */

const SEARXNG_INSTANCES = Array.from(new Set([
  "https://searx.be",
  "https://searxng.site",
  "https://priv.au",
  "https://searx.work",
  "https://search.inetol.net",
  "https://opnxng.com",
  "https://searx.tiekoetter.com",
  "https://search.rhscz.eu",
  "https://searx.xyz",
  "https://searx.space",
  "https://searx.info",
  "https://searx.mx",
  "https://searx.divided-by-zero.eu",
  "https://searx.stuehmer.dk",
  "https://search.bus-hit.me",
  "https://searx.fyi",
  "https://searx.sethforprivacy.com",
  "https://searx.tuxcloud.net",
  "https://searx.gnous.eu",
  "https://searx.ctis.me",
  "https://searx.dresden.network",
  "https://searx.perennialte.ch",
  "https://searx.rofl.wtf",
  "https://searx.daetalytica.io",
  "https://searx.oakley.xyz",
  "https://searx.org",
  "https://search.ononoki.org",
  "https://searx.prvcy.eu",
  "https://searx.mha.fi",
  "https://searx.namei.net.au",
  "https://searx.ninja",
  "https://searx.ru",
  "https://searx.haxtrax.com",
  "https://searx.lre.io",
  "https://search.disroot.org",
  "https://searx.nixnet.services",
  "https://searx.zapashny.ru",
  "https://searx.rv.ua",
  "https://searx.mastodontech.de",
  "https://searx.sp-codes.de",
  "https://searx.ch",
  "https://searx.de",
  "https://searx.laquadrature.net",
  "https://searx.me",
  "https://searx.pw",
  "https://searx.run",
  "https://searx.sh",
  "https://searx.tv",
  "https://searx.uk",
  "https://searx.us",
  "https://searx.world",
  "https://searx.flandre.pw",
  "https://searx.neocities.org",
  "https://searx.gnu.style",
  "https://searx.open-source.io",
  "https://searx.web.id",
  "https://searx.win",
  "https://searx.top",
  "https://searx.pro",
  "https://searx.site",
  "https://searx.cloud",
  "https://searx.network",
  "https://searx.digital",
  "https://searx.tech",
  "https://searx.online",
  "https://searxng.nicfab.it",
  "https://searx.catfluori.de",
  "https://searx.si",
  "https://searx.sunshine.it",
  "https://searx.web-home.org",
  "https://search.rowie.at"
]));

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

export interface InstantAnswer {
  AbstractText: string;
  AbstractSource: string;
  AbstractURL: string;
  Image: string;
  Heading: string;
  RelatedTopics?: Array<{
    Text: string;
    FirstURL: string;
  }>;
}

const PROXIES = [
  "https://api.allorigins.win/get?url=",
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
  "https://cors-anywhere.herokuapp.com/"
];

// Simple in-memory cache
const searchCache = new Map<string, { data: SearchResponse, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

async function fetchWithProxy(url: string, signal: AbortSignal) {
  // Try direct fetch first (some instances support CORS)
  try {
    const directResponse = await fetch(url, { signal, mode: 'cors' });
    if (directResponse.ok) {
      const text = await directResponse.text();
      if (text && text.length > 100) return text;
    }
  } catch (e) {
    // Continue to proxies
  }

  const shuffledProxies = [...PROXIES].sort(() => Math.random() - 0.5);
  for (const proxy of shuffledProxies) {
    try {
      const proxyUrl = proxy.includes('allorigins') 
        ? `${proxy}${encodeURIComponent(url)}`
        : `${proxy}${url}`;
      
      const response = await fetch(proxyUrl, { 
        signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (response.ok) {
        if (proxy.includes('allorigins')) {
          const data: any = await response.json();
          if (data.contents) return data.contents;
        } else {
          const text = await response.text();
          if (text && text.length > 100) return text;
        }
      }
    } catch (e) {
      // Try next proxy
    }
  }
  throw new Error("Proxy failed");
}

async function fetchFromInstance(instance: string, query: string, category: string, safebased: boolean, signal: AbortSignal) {
  const categoriesToTry = category === 'images' ? ['images'] : category === 'videos' ? ['videos'] : ['general'];
  const safeParam = safebased ? '&safesearch=1' : '&safesearch=0';
  
  const engineParam = category === 'images' 
    ? '&engines=google images,bing images,qwant images,flickr,duckduckgo images'
    : category === 'videos'
      ? '&engines=youtube,vimeo,dailymotion,twitch,google videos'
      : '&engines=google,bing,duckduckgo,qwant,startpage';

  for (const catName of categoriesToTry) {
    const categoryParam = `&categories=${catName}`;
    const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json${categoryParam}${engineParam}${safeParam}`;
    
    // Try up to 2 times for each instance with different proxies if needed
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const content = await fetchWithProxy(searchUrl, signal);
        if (!content) continue;

        try {
          const data = JSON.parse(content);
          if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            const processedResults = data.results.map((r: any) => {
              // Enhanced thumbnail/image extraction
              let thumb = r.thumbnail || r.img_src || r.thumbnail_src || r.image || r.thumbnail_url || (r.content?.match(/src="([^"]+)"/)?.[1]) || null;
              
              // If it's a relative path, try to make it absolute
              if (thumb && thumb.startsWith('/')) {
                thumb = `${instance}${thumb}`;
              }

              const url = r.url || r.link || r.href || "#";
              
              return {
                ...r,
                url,
                img_src: thumb,
                thumbnail: thumb,
                title: r.title || "No Title",
                content: r.content || r.snippet || ""
              };
            });
            return { results: processedResults, instance };
          }
        } catch (e) {
          // Fallback to HTML parsing if JSON fails or is not returned
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const results: any[] = [];
          
          // Try multiple selectors for different SearXNG themes
          const resultElements = doc.querySelectorAll('.result, .result-default, .result-image, .result-video, .res-default, article.result, .image-result');
          
          resultElements.forEach((el) => {
            const titleEl = el.querySelector('h3, h4, .title, a.result-link, .result_header a, .title a');
            const linkEl = el.querySelector('a');
            const contentEl = el.querySelector('.content, .snippet, .description, .result_content, .result-content');
            const imgEl = el.querySelector('img, .thumbnail img, .image img');
            
            const title = titleEl?.textContent?.trim() || '';
            const url = linkEl?.getAttribute('href') || '';
            const snippet = contentEl?.textContent?.trim() || '';
            const img = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-original') || '';
            
            if (title && url) {
              const fullUrl = url.startsWith('/') ? `${instance}${url}` : url;
              const fullImg = img ? (img.startsWith('/') ? `${instance}${img}` : img) : null;
              
              results.push({
                title,
                url: fullUrl,
                content: snippet,
                img_src: fullImg,
                thumbnail: fullImg,
                engine: 'searx-html',
                score: 0.5
              });
            }
          });

          if (results.length > 0) return { results, instance };
        }
      } catch (e) {
        if (signal.aborted) throw e;
        // Small delay before retry
        await new Promise(r => setTimeout(r, 300));
      }
    }
  }
  throw new Error("No results");
}

export async function performSearch(query: string, category: string = 'general', safebased: boolean = true, fastMode: boolean = false): Promise<SearchResponse> {
  const cacheKey = `${query}:${category}:${safebased}:${fastMode}`;
  const cached = searchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  const startTime = Date.now();
  const shuffled = [...SEARXNG_INSTANCES].sort(() => Math.random() - 0.5);
  let finalResults: SearchResult[] = [];
  let instanceUsed: string | null = null;
  let enginesUsed: Set<string> = new Set();

  const batchSize = fastMode ? 15 : 12;
  const maxTotalInstances = fastMode ? 60 : 100;
  const timeoutMs = fastMode ? 3500 : 6000;

  for (let i = 0; i < shuffled.length && i < maxTotalInstances; i += batchSize) {
    const batch = shuffled.slice(i, i + batchSize);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const batchResults = await Promise.allSettled(batch.map(inst => 
        fetchFromInstance(inst, query, category, safebased, controller.signal)
      ));

      const successful = batchResults
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      if (successful.length > 0) {
        controller.abort();
        clearTimeout(timeoutId);
        
        const allBatchResults: any[] = [];
        const seenUrls = new Set<string>();
        
        successful.sort((a, b) => b.results.length - a.results.length);
        instanceUsed = successful[0].instance;

        for (const node of successful) {
          for (const res of node.results) {
            if (!seenUrls.has(res.url)) {
              seenUrls.add(res.url);
              allBatchResults.push({ ...res, sourceInstance: node.instance });
            }
          }
        }

        let filtered = allBatchResults;
        if (category === 'images') {
          filtered = allBatchResults.filter((r: any) => 
            r.img_src || r.thumbnail || r.template === 'image' || r.category === 'images' || r.content?.includes('img')
          );
        } else if (category === 'videos') {
          filtered = allBatchResults.filter((r: any) => 
            r.template === 'video' || r.category === 'videos' || 
            r.url.includes('youtube.com') || r.url.includes('youtu.be') || 
            r.url.includes('vimeo.com') || r.url.includes('dailymotion.com') ||
            r.thumbnail || r.img_src
          );
        }

        if (filtered.length === 0 && allBatchResults.length > 0) {
          filtered = allBatchResults;
        }

        if (filtered.length > 0) {
          filtered.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
          
          const mapped = filtered.map((r: any) => {
            if (r.engine) enginesUsed.add(r.engine);
            let domain = "unknown";
            try { domain = new URL(r.url || "http://localhost").hostname; } catch(e) {}
            
            // Clean title and snippet
            const cleanTitle = (r.title || "No Title").replace(/<[^>]*>?/gm, '').trim();
            const cleanSnippet = (r.content || r.snippet || "").replace(/<[^>]*>?/gm, '').trim();
            
            return {
              type: r.category || category,
              title: cleanTitle,
              url: r.url || "#",
              snippet: cleanSnippet.substring(0, 400),
              thumbnail: r.thumbnail || r.img_src || r.thumbnail_src || null,
              favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
              metadata: { domain, engine: r.engine, score: r.score }
            };
          });

          finalResults.push(...mapped);
          
          // If we have enough results, we can stop early to be fast
          if (finalResults.length >= 12) break;
        }
      }
    } catch (e) {
      // Batch failed
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (finalResults.length === 0) {
    throw new Error("No results found.");
  }

  // Final deduplication
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
      instance: instanceUsed,
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
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    return await response.json();
  } catch (e) {
    return null;
  }
}
