import express, { type Request, type Response } from 'express';
import { fileURLToPath } from 'node:url';
import { log } from 'apify';
import { searchImages } from './image-search.js';
import { interpretTopic } from './llm.js';
import { searchVendors } from './vendor-search.js';

export function createApp(): express.Application {
    const app = express();
    const publicDir = fileURLToPath(new URL('../public', import.meta.url));

    // GET / — readiness probe check must come before express.static so the probe
    // header is handled here instead of getting an index.html response.
    app.get('/', (req: Request, res: Response) => {
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Readiness probe OK\n');
        } else {
            res.sendFile('index.html', { root: publicDir });
        }
    });

    app.get('/api/search', async (req: Request, res: Response) => {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (!q) {
            res.status(400).json({ error: 'Query parameter "q" is required.' });
            return;
        }

        const rawMax = parseInt(String(req.query.maxResults ?? '5'), 10);
        const maxResults = Number.isNaN(rawMax) ? 5 : Math.min(20, Math.max(1, rawMax));

        const weddingQuery = /\bwedding\b/i.test(q) ? q : `${q} wedding`;

        const geminiKey = process.env.GEMINI_API_KEY;
        let searchQuery = weddingQuery;
        if (geminiKey) {
            const { queries } = await interpretTopic(q, geminiKey);
            if (queries[0]) searchQuery = queries[0];
        }

        log.info('Search request', { original: q, searchQuery, maxResults });
        console.log('[search]', { original: q, searchQuery });

        try {
            const images = await searchImages(searchQuery, maxResults);
            res.json({ images });
        } catch (err) {
            const message = (err as Error).message ?? String(err);
            log.error('scrapeImages failed', { error: message });
            res.status(500).json({ error: message });
        }
    });

    app.get('/vendors', (_req: Request, res: Response) => {
        res.sendFile('vendors.html', { root: publicDir });
    });

    app.get('/api/vendors', async (req: Request, res: Response) => {
        const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
        const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
        const state = typeof req.query.state === 'string' ? req.query.state.trim().toUpperCase() : '';

        if (!category || !city || !state) {
            res.status(400).json({ error: 'Parameters "category", "city", and "state" are required.' });
            return;
        }
        if (!/^[A-Z]{2}$/.test(state)) {
            res.status(400).json({ error: 'Parameter "state" must be a two-letter state code.' });
            return;
        }

        log.info('Vendor search request', { category, city, state });

        try {
            const vendors = await searchVendors(category, city, state);
            res.json({ vendors });
        } catch (err) {
            const message = (err as Error).message ?? String(err);
            log.error('searchVendors failed', { error: message });
            res.status(500).json({ error: message });
        }
    });

    // index:false prevents static middleware from auto-serving index.html on GET /
    app.use(express.static(publicDir, { index: false }));

    return app;
}
