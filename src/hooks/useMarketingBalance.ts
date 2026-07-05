/**
 * useMarketingBalance
 *
 * Detects when a marketing CR account (see src/utils/marketing-balance.ts) is
 * present in the account list, then:
 *   - Immediately activates the custom display balance (keyed on the CR loginid).
 *   - Optionally subscribes to live Deriv WebSocket balance messages from the
 *     demo account so trade P&L is reflected in real-time.
 *   - Exposes a resetBalance() that snaps the display balance back to the
 *     configured default (e.g. 258.23 USD).
 *
 * The demo account is NOT required for activation — the marketing balance
 * shows on the CR account as soon as the CR account appears in the list.
 * If a demo account is also present its balance deltas are tracked and applied.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { TAuthData } from '@/types/api-types';
import { isDemoAccount } from '@/utils/account-helpers';
import {
    applyDerivUpdate,
    getDefaultBalance,
    initMarketingBalance,
    isMarketingCR,
    resetMarketingBalance,
} from '@/utils/marketing-balance';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseMarketingBalanceReturn {
    /** True when a marketing CR account is detected in the account list. */
    isMarketingActive: boolean;
    /** The CR loginid of the marketing account. null when not active. */
    marketingCRLoginid: string | null;
    /** The VRTC/demo loginid, if one is present in the session. null otherwise. */
    marketingDemoLoginid: string | null;
    /**
     * The current tracked display balance. null until the CR account has been
     * identified and the balance initialised.
     */
    marketingBalance: number | null;
    /** Configured default balance (e.g. 258.23). */
    defaultBalance: number;
    /** Resets the display balance to the configured default. */
    resetBalance: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketingBalance(
    accountList: TAuthData['account_list']
): UseMarketingBalanceReturn {
    const [marketingBalance, setMarketingBalance] = useState<number | null>(null);
    const [marketingCRLoginid, setMarketingCRLoginid] = useState<string | null>(null);
    const [marketingDemoLoginid, setMarketingDemoLoginid] = useState<string | null>(null);

    // Stable refs so the WebSocket callback always has the latest values.
    const crLidRef = useRef<string | null>(null);
    const demoLidRef = useRef<string | null>(null);
    // Most-recently-seen Deriv demo balance — used as the reset reference point.
    const lastDerivBalanceRef = useRef<number>(0);

    // ── 1. Detect marketing CR account in the account list ────────────────────

    useEffect(() => {
        // Always clear state — handles logout / session change transitions.
        if (!accountList?.length) {
            setMarketingCRLoginid(null);
            setMarketingDemoLoginid(null);
            setMarketingBalance(null);
            crLidRef.current = null;
            demoLidRef.current = null;
            return;
        }

        const crAccount = accountList.find(a => isMarketingCR(a.loginid));

        if (!crAccount) {
            // No marketing account in this session — clear any stale state.
            setMarketingCRLoginid(null);
            setMarketingDemoLoginid(null);
            setMarketingBalance(null);
            crLidRef.current = null;
            demoLidRef.current = null;
            return;
        }

        const crLid = crAccount.loginid;
        crLidRef.current = crLid;
        setMarketingCRLoginid(crLid);

        // Demo account is optional — used for delta tracking when present.
        const demoAccount = accountList.find(a => isDemoAccount(a.loginid));
        const demoLid = demoAccount?.loginid ?? null;
        demoLidRef.current = demoLid;
        setMarketingDemoLoginid(demoLid);

        // Use the demo account's current Deriv balance as the reference point.
        // Fall back to 0 when no demo account is in the list.
        const rawBal = demoAccount?.balance;
        const derivBal =
            typeof rawBal === 'number' ? rawBal : parseFloat(String(rawBal ?? 0)) || 0;
        const safeDeriv = isNaN(derivBal) ? 0 : derivBal;
        lastDerivBalanceRef.current = safeDeriv;

        // Initialise (or restore from localStorage) the display balance.
        const bal = initMarketingBalance(crLid, safeDeriv);
        setMarketingBalance(bal);
    }, [accountList]);

    // ── 2. Subscribe to live demo balance updates from Deriv WebSocket ────────

    useEffect(() => {
        // Only subscribe when we have both a CR account and a demo account.
        if (!marketingCRLoginid || !marketingDemoLoginid) return;

        let subscription: { unsubscribe: () => void } | null = null;

        const attach = () => {
            if (!api_base.api) return false;
            try {
                subscription = api_base.api.onMessage().subscribe(({ data }: { data: any }) => {
                    if (data?.msg_type !== 'balance' || !data?.balance) return;

                    const { balance: newDerivBal, loginid: updateLoginid } = data.balance;

                    // Only handle messages for the demo account.
                    if (updateLoginid && updateLoginid !== demoLidRef.current) return;

                    lastDerivBalanceRef.current = newDerivBal;

                    const crLid = crLidRef.current;
                    if (!crLid) return;

                    const newDisplay = applyDerivUpdate(crLid, newDerivBal);
                    if (newDisplay !== null) {
                        setMarketingBalance(newDisplay);
                    }
                });
                return true;
            } catch {
                return false;
            }
        };

        if (!attach()) {
            // api not ready yet — poll until it is.
            const timer = setInterval(() => {
                if (attach()) clearInterval(timer);
            }, 500);
            return () => {
                clearInterval(timer);
                subscription?.unsubscribe();
            };
        }

        return () => {
            subscription?.unsubscribe();
        };
    }, [marketingCRLoginid, marketingDemoLoginid]);

    // ── 3. Reset handler ──────────────────────────────────────────────────────

    const resetBalance = useCallback(() => {
        const crLid = crLidRef.current;
        if (!crLid) return;

        const newBal = resetMarketingBalance(crLid, lastDerivBalanceRef.current);
        setMarketingBalance(newBal);
    }, []);

    // ── Return ────────────────────────────────────────────────────────────────

    const isMarketingActive = marketingCRLoginid !== null;
    const defaultBalance = marketingCRLoginid ? getDefaultBalance(marketingCRLoginid) : 0;

    return {
        isMarketingActive,
        marketingCRLoginid,
        marketingDemoLoginid,
        marketingBalance,
        defaultBalance,
        resetBalance,
    };
}
