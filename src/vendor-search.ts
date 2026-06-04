import { log } from 'apify';
import { ApifyClient } from 'apify-client';

export interface VendorResult {
    name: string;
    category: string;
    city: string;
    state: string;
    url: string;
    thumbnailUrl: string;
    rating: number | null;
    reviewCount: number | null;
    description: string;
    storefront: string;
}

interface TheKnotVendorItem {
    name?: string;
    category?: string;
    city?: string;
    state?: string;
    url?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    description?: string;
    storefront?: string;
    [key: string]: unknown;
}

export async function searchVendors(
    category: string,
    city: string,
    state: string,
): Promise<VendorResult[]> {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN environment variable is required');

    const client = new ApifyClient({ token });

    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    const stateSlug = state.toLowerCase();
    const startUrl = `https://www.theknot.com/marketplace/${category}-${citySlug}-${stateSlug}`;

    log.info('Vendor search request', { category, city, state, startUrl });

    const run = await client.actor('dionysus_way/the-knot-marketplace-scraper---wedding-vendor-leads').call({
        startUrls: [startUrl],
        maxPages: 1,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const results: VendorResult[] = [];
    for (const item of items as TheKnotVendorItem[]) {
        results.push({
            name: String(item.name ?? ''),
            category: String(item.category ?? category),
            city: String(item.city ?? city),
            state: String(item.state ?? state),
            url: String(item.url ?? item.storefront ?? ''),
            thumbnailUrl: String(item.thumbnailUrl ?? item.imageUrl ?? ''),
            rating: typeof item.rating === 'number' ? item.rating : null,
            reviewCount: typeof item.reviewCount === 'number' ? item.reviewCount : null,
            description: String(item.description ?? ''),
            storefront: String(item.storefront ?? item.url ?? ''),
        });
    }

    log.info('Vendor search results', { found: results.length });
    return results;
}
