import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import path from 'path';
import { searchDuckDuckGo } from 'ts-duckduckgo-search';
import google from 'googlethis';
import * as yt from 'youtube-search-api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
      const results = await searchDuckDuckGo(query, { maxResults: 10 });

      res.json({
        query,
        results: results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.description
        }))
      });
    } catch (error) {
      console.error('Web search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/images', async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
      const results = await google.image(query, { safe: true });

      res.json({
        query,
        results: results.slice(0, 15).map(r => ({
          title: r.origin?.title || query,
          url: r.url,
          thumbnail: r.preview?.url || r.url,
          source: r.origin?.website?.url || r.url
        }))
      });
    } catch (error) {
      console.error('Image search error:', error);
      res.status(500).json({ error: 'Image search failed' });
    }
  });

  app.get('/api/videos', async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
      const results = await yt.GetListByKeyword(query, false, 15);
      const videos = results.items.filter((i: any) => i.type === 'video');

      res.json({
        query,
        results: videos.map((r: any) => ({
          title: r.title,
          url: `https://www.youtube.com/watch?v=${r.id}`,
          thumbnail: r.thumbnail?.thumbnails?.[0]?.url || '',
          duration: r.length?.simpleText || ''
        }))
      });
    } catch (error) {
      console.error('Video search error:', error);
      res.status(500).json({ error: 'Video search failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
