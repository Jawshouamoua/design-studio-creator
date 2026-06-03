import { log } from 'apify';

export interface ImageResult {
    url: string;
    thumbnailUrl: string;
    title: string;
    sourceUrl: string;
}

interface GoogleImageItem {
    link?: string;
    title?: string;
    image?: {
        thumbnailLink?: string;
        contextLink?: string;
    };
}

export async function searchImages(query: string, maxResults: number): Promise<ImageResult[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !cx) {
        throw new Error('GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables are required');
    }

    const results: ImageResult[] = [];
    const batchSize = 10; // Google CSE max per request

    for (let start = 1; results.length < maxResults; start += batchSize) {
        const num = Math.min(batchSize, maxResults - results.length);
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', cx);
        url.searchParams.set('searchType', 'image');
        url.searchParams.set('q', query);
        url.searchParams.set('num', String(num));
        url.searchParams.set('start', String(start));

        const response = await fetch(url.toString());
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Google Custom Search returned HTTP ${response.status}: ${body}`);
        }

        const data = await response.json() as { items?: GoogleImageItem[] };
        const items = data.items ?? [];

        for (const item of items) {
            if (results.length >= maxResults) break;
            if (!item.link) continue;
            results.push({
                url: item.link,
                thumbnailUrl: item.image?.thumbnailLink ?? '',
                title: item.title ?? '',
                sourceUrl: item.image?.contextLink ?? '',
            });
        }

        // Fewer results than requested means no more pages
        if (items.length < num) break;
    }

    log.info('Google image search results', { query, found: results.length, requested: maxResults });
    return results;
}
