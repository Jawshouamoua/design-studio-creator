import * as cheerio from 'cheerio';
import { log } from 'apify';

export interface BingImageResult {
    url: string;
    thumbnailUrl: string;
    title: string;
    sourceUrl: string;
}

interface BingImageMeta {
    murl?: string;
    turl?: string;
    t?: string;
    purl?: string;
}

export async function scrapeImages(query: string, maxResults: number): Promise<BingImageResult[]> {
    console.log('query', query);
    const searchUrl = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=1&count=35&mkt=en-US`;

    const response = await fetch(searchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.bing.com/',
        },
    });

    if (!response.ok) {
        throw new Error(`Bing returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: BingImageResult[] = [];

    const elements = $('.iusc[m]').toArray();
    for (const el of elements) {
        if (results.length >= maxResults) break;
        const raw = $(el).attr('m');
        if (!raw) continue;
        try {
            const meta = JSON.parse(raw) as BingImageMeta;
            if (!meta.murl) continue;
            results.push({
                url: meta.murl,
                thumbnailUrl: meta.turl ?? '',
                title: meta.t ?? '',
                sourceUrl: meta.purl ?? '',
            });
        } catch {
            log.debug('Skipping malformed .iusc JSON');
        }
    }

    log.info('Bing Images: parsed results', { found: results.length, requested: maxResults });
    return results;
}
