import { log } from 'apify';
import { ApifyClient } from 'apify-client';

export interface ImageResult {
    url: string;
    thumbnailUrl: string;
    title: string;
    sourceUrl: string;
}

interface HooliImageItem {
    imageUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    contentUrl?: string;
}

export async function searchImages(query: string, maxResults: number): Promise<ImageResult[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
        throw new Error('APIFY_TOKEN environment variable is required');
    }

    const client = new ApifyClient({ token });

    const run = await client.actor('hooli/google-images-scraper').call({
        queries: [query],
        maxResultsPerQuery: maxResults,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: maxResults });

    const results: ImageResult[] = [];
    for (const item of items as HooliImageItem[]) {
        if (!item.imageUrl) continue;
        results.push({
            url: item.imageUrl,
            thumbnailUrl: item.thumbnailUrl ?? '',
            title: item.title ?? '',
            sourceUrl: item.contentUrl ?? '',
        });
    }

    log.info('Google images scraper results', { query, found: results.length, requested: maxResults });
    return results;
}
