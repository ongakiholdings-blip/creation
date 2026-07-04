import { action, makeObservable, observable } from 'mobx';
import { CopyAccount, CopyTradeLog, CopyTradingService } from '@/services/copy-trading.service';

export type FollowerEntry = {
    token: string;
    account: CopyAccount | null;
    status: 'pending' | 'connected' | 'error';
    error: string;
};

export default class CopyTradingStore {
    // ── leader ──────────────────────────────────────────────────────────────
    leader_token = '';
    leader_account: CopyAccount | null = null;
    leader_status: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';
    leader_error = '';

    // ── followers ────────────────────────────────────────────────────────────
    followers: FollowerEntry[] = [];
    new_follower_token = '';

    // ── run state ────────────────────────────────────────────────────────────
    is_running = false;
    stake_multiplier = 1;

    // ── trade log ────────────────────────────────────────────────────────────
    trade_log: CopyTradeLog[] = [];

    // ── internal ─────────────────────────────────────────────────────────────
    private service: CopyTradingService | null = null;

    constructor() {
        makeObservable(this, {
            leader_token: observable,
            leader_account: observable,
            leader_status: observable,
            leader_error: observable,
            followers: observable,
            new_follower_token: observable,
            is_running: observable,
            stake_multiplier: observable,
            trade_log: observable,

            setLeaderToken: action,
            connectLeader: action,
            setNewFollowerToken: action,
            addFollower: action,
            removeFollower: action,
            startCopying: action,
            stopCopying: action,
            setStakeMultiplier: action,
            clearLog: action,
        });
    }

    // ── actions ───────────────────────────────────────────────────────────────

    setLeaderToken = (token: string) => {
        this.leader_token = token.trim();
    };

    connectLeader = async () => {
        if (!this.leader_token) return;
        this.leader_status = 'connecting';
        this.leader_error = '';
        this.leader_account = null;
        try {
            this.ensureService();
            const account = await this.service!.connectLeader(
                this.leader_token,
                action((_loginid: string) => {
                    this.leader_status = 'error';
                    this.leader_error = 'Leader connection lost — stop copying and reconnect.';
                    if (this.is_running) {
                        this.service?.stopCopying();
                        this.is_running = false;
                    }
                })
            );
            this.leader_account = account;
            this.leader_status = 'connected';
        } catch (e: any) {
            this.leader_status = 'error';
            this.leader_error = e?.message ?? 'Connection failed';
        }
    };

    setNewFollowerToken = (token: string) => {
        this.new_follower_token = token.trim();
    };

    addFollower = async () => {
        const token = this.new_follower_token;
        if (!token) return;
        if (this.followers.find(f => f.token === token)) return;

        const entry: FollowerEntry = {
            token,
            account: null,
            status: 'pending',
            error: '',
        };
        this.followers.push(entry);
        this.new_follower_token = '';

        try {
            this.ensureService();
            const account = await this.service!.addFollower(
                token,
                action((loginid: string) => {
                    const idx = this.followers.findIndex(f => f.account?.loginid === loginid);
                    if (idx >= 0) {
                        this.followers[idx].status = 'error';
                        this.followers[idx].error = 'Connection lost — reconnect this follower.';
                    }
                })
            );
            const idx = this.followers.findIndex(f => f.token === token);
            if (idx >= 0) {
                this.followers[idx].account = account;
                this.followers[idx].status = 'connected';
            }
        } catch (e: any) {
            const idx = this.followers.findIndex(f => f.token === token);
            if (idx >= 0) {
                this.followers[idx].status = 'error';
                this.followers[idx].error = e?.message ?? 'Connection failed';
            }
        }
    };

    removeFollower = (token: string) => {
        this.service?.removeFollower(token);
        this.followers = this.followers.filter(f => f.token !== token);
    };

    startCopying = async () => {
        if (this.is_running) return;
        if (this.leader_status !== 'connected') {
            await this.connectLeader();
            // MobX re-assignment after async: re-read via cast to avoid TS narrowing error
            if ((this.leader_status as string) !== 'connected') return;
        }
        if (this.followers.length === 0) return;

        if (this.service) {
            this.service.stakeMultiplier = this.stake_multiplier;
        }

        try {
            await this.service!.startCopying();
            this.is_running = true;
        } catch (e: any) {
            this.leader_error = e?.message ?? 'Failed to start';
        }
    };

    stopCopying = () => {
        this.service?.stopCopying();
        this.is_running = false;
    };

    setStakeMultiplier = (val: number) => {
        this.stake_multiplier = val;
        if (this.service) this.service.stakeMultiplier = val;
    };

    clearLog = () => {
        this.trade_log = [];
    };

    // ── private ───────────────────────────────────────────────────────────────

    private ensureService() {
        if (!this.service) {
            this.service = new CopyTradingService(
                action((log: CopyTradeLog) => {
                    this.trade_log.unshift(log);
                }),
                action((msg: string) => {
                    // Append errors as synthetic log entries
                    console.error('[CopyTrading]', msg);
                })
            );
        }
    }

    destroy() {
        this.service?.destroy();
        this.service = null;
        this.is_running = false;
    }
}
