import { classifyToken } from './spamDetector.js';

export const tokenService = {
  async categorizeAssets(rawAssets: any[]) {
    // Process all assets in parallel using the async classifier
    const results = await Promise.all(
      rawAssets.map(async (asset) => {
        const analysis = await classifyToken(asset);
        return { ...asset, ...analysis };
      })
    );

    return {
      summary: {
        totalAssets: results.length,
        totalUsdValue: results.reduce((sum, a) => sum + (a.usdValue || 0), 0),
        dustCount: results.filter(a => a.status === 'dust').length,
        spamCount: results.filter(a => a.status === 'spam').length
      },
      groups: {
        clean: results.filter(a => a.status === 'verified' || a.status === 'clean'),
        dust: results.filter(a => a.status === 'dust'),
        spam: results.filter(a => a.status === 'spam')
      },
      raw: results
    };
  }
};
