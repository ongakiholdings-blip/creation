/**
 * AI Scanner Service
 *
 * Connects to the Deriv WebSocket API, fetches tick history for each
 * synthetic-digits market, and scores them for the selected strategy.
 */
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getSocketURL } from '@/components/shared';

// ─── constants ────────────────────────────────────────────────────────────────

export const SCAN_SYMBOLS = [
    { symbol: 'R_10',    name: 'Volatility 10' },
    { symbol: 'R_25',    name: 'Volatility 25' },
    { symbol: 'R_50',    name: 'Volatility 50' },
    { symbol: 'R_75',    name: 'Volatility 75' },
    { symbol: 'R_100',   name: 'Volatility 100' },
    { symbol: '1HZ10V',  name: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V',  name: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V',  name: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V',  name: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
];

// ─── types ────────────────────────────────────────────────────────────────────

export type Strategy = 'over1under8' | 'over2under7' | 'over3under6' | 'evenodd';

export type ScanResult = {
    symbol: string;
    name: string;
    score: number;
    tradeType: string;
    percentage: string;
    digitCounts: number[];
};

export type ScanProgress = {
    symbol: string;
    index: number;
    total: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function getLastDigit(price: number | string): number {
    const str = price.toString();
    return parseInt(str[str.length - 1], 10);
}

function buildDigitCounts(digits: number[]): number[] {
    const counts = new Array(10).fill(0);
    digits.forEach(d => counts[d]++);
    return counts;
}

function scoreMarket(
    digits: number[],
    strategy: Strategy
): { score: number; tradeType: string; percentage: string } {
    const total = digits.length;
    if (total === 0) return { score: 0, tradeType: '', percentage: '0%' };

    switch (strategy) {
        case 'over1under8': {
            // Score each side independently: Over 1 wins when digit > 1 (baseline 80%),
            // Under 8 wins when digit < 8 (baseline 80%).  They overlap heavily (digits
            // 2–7 satisfy both), so a negative deviation on the Over side does NOT imply
            // a positive edge on the Under side — compute both and pick the stronger one.
            const overRate  = digits.filter(d => d > 1).length / total;
            const underRate = digits.filter(d => d < 8).length / total;
            const overEdge  = overRate  - 0.8;
            const underEdge = underRate - 0.8;
            if (overEdge >= underEdge) {
                return { score: Math.abs(overEdge),  tradeType: 'Over 1',  percentage: `${(overRate  * 100).toFixed(1)}%` };
            }
            return { score: Math.abs(underEdge), tradeType: 'Under 8', percentage: `${(underRate * 100).toFixed(1)}%` };
        }
        case 'over2under7': {
            // Over 2: digit > 2 (baseline 70%).  Under 7: digit < 7 (baseline 70%).
            const overRate  = digits.filter(d => d > 2).length / total;
            const underRate = digits.filter(d => d < 7).length / total;
            const overEdge  = overRate  - 0.7;
            const underEdge = underRate - 0.7;
            if (overEdge >= underEdge) {
                return { score: Math.abs(overEdge),  tradeType: 'Over 2',  percentage: `${(overRate  * 100).toFixed(1)}%` };
            }
            return { score: Math.abs(underEdge), tradeType: 'Under 7', percentage: `${(underRate * 100).toFixed(1)}%` };
        }
        case 'over3under6': {
            // Over 3: digit > 3 (baseline 60%).  Under 6: digit < 6 (baseline 60%).
            const overRate  = digits.filter(d => d > 3).length / total;
            const underRate = digits.filter(d => d < 6).length / total;
            const overEdge  = overRate  - 0.6;
            const underEdge = underRate - 0.6;
            if (overEdge >= underEdge) {
                return { score: Math.abs(overEdge),  tradeType: 'Over 3',  percentage: `${(overRate  * 100).toFixed(1)}%` };
            }
            return { score: Math.abs(underEdge), tradeType: 'Under 6', percentage: `${(underRate * 100).toFixed(1)}%` };
        }
        case 'evenodd': {
            const evenCount = digits.filter(d => d % 2 === 0).length;
            const evenPct = evenCount / total;
            const oddPct = 1 - evenPct;
            const score = Math.max(evenPct, oddPct);
            // Bet against the recent trend (contrarian — matches Deriv's mean-reversion pattern)
            const tradeType = evenPct > oddPct ? 'Odd' : 'Even';
            return {
                score,
                tradeType,
                percentage: `${(score * 100).toFixed(1)}%`,
            };
        }
        default:
            return { score: 0, tradeType: '', percentage: '0%' };
    }
}

// ─── WebSocket connection helper ──────────────────────────────────────────────

/**
 * Opens a fresh WebSocket, waits for it to be ready, then wraps it in
 * DerivAPIBasic — the same pattern used throughout the rest of the app.
 */
function openConnection(wsURL: string, timeoutMs = 15_000): Promise<{
    api: InstanceType<typeof DerivAPIBasic>;
    ws: WebSocket;
}> {
    return new Promise((resolve, reject) => {
        let settled = false;

        const ws = new WebSocket(wsURL);
        const api = new DerivAPIBasic({ connection: ws });

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                ws.close();
                reject(new Error('[AiScanner] WebSocket connection timed out'));
            }
        }, timeoutMs);

        ws.addEventListener('open', () => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve({ api, ws });
            }
        });

        ws.addEventListener('error', (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(err);
            }
        });
    });
}

// ─── main scan ────────────────────────────────────────────────────────────────

/**
 * Scans all synthetic-digit markets and returns them ranked by score for the
 * given strategy.  Calls `onProgress` after each symbol is fetched so the UI
 * can show a live progress indicator.
 */
export async function scanMarkets(
    strategy: Strategy,
    tickCount: number,
    onProgress: (p: ScanProgress) => void,
    signal?: AbortSignal
): Promise<ScanResult[]> {
    // Resolve the correct WebSocket URL (respects auth / app-id config)
    const wsURL = await getSocketURL();

    const { api, ws } = await openConnection(wsURL);
    const results: ScanResult[] = [];

    try {
        for (let i = 0; i < SCAN_SYMBOLS.length; i++) {
            if (signal?.aborted) break;

            const { symbol, name } = SCAN_SYMBOLS[i];
            onProgress({ symbol, index: i, total: SCAN_SYMBOLS.length });

            try {
                const response = await (api as any).send({
                    ticks_history: symbol,
                    count: Math.min(tickCount, 5000),
                    end: 'latest',
                    style: 'ticks',
                });

                const prices: number[] = response?.history?.prices ?? [];
                const digits = prices.map(p => getLastDigit(p));
                const { score, tradeType, percentage } = scoreMarket(digits, strategy);
                const digitCounts = buildDigitCounts(digits);

                results.push({ symbol, name, score, tradeType, percentage, digitCounts });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn(`[AiScanner] Failed to fetch ${symbol}:`, err);
            }
        }
    } finally {
        try { ws.close(); } catch { /* ignore */ }
    }

    return results.sort((a, b) => b.score - a.score);
}
