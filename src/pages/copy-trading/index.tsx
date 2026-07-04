import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';
import './copy-trading.scss';

// ── tiny icon helpers ────────────────────────────────────────────────────────

const IconCopy = () => (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
        <rect x='9' y='9' width='13' height='13' rx='2' />
        <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
    </svg>
);
const IconClose = () => (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
        <line x1='18' y1='6' x2='6' y2='18' />
        <line x1='6' y1='6' x2='18' y2='18' />
    </svg>
);
const IconCheck = () => (
    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
        <polyline points='20 6 9 17 4 12' />
    </svg>
);
const IconPlay = () => (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
        <polygon points='5 3 19 12 5 21 5 3' />
    </svg>
);
const IconStop = () => (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
        <rect x='3' y='3' width='18' height='18' rx='2' />
    </svg>
);

// ── helpers ───────────────────────────────────────────────────────────────────

const maskToken = (t: string) => (t.length > 10 ? `${t.slice(0, 4)}...${t.slice(-4)}` : t);
const fmtBalance = (b: number, currency: string) =>
    `${b.toFixed(2)} ${currency}`;
const fmtDate = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ── sub-components ────────────────────────────────────────────────────────────

const StatusDot = ({ status }: { status: string }) => (
    <span className={`copy-trading__status copy-trading__status--${status}`}>
        {status === 'connecting' && localize('Connecting…')}
        {status === 'connected' && localize('Connected')}
        {status === 'error' && localize('Error')}
        {status === 'idle' && localize('Not connected')}
        {status === 'pending' && localize('Connecting…')}
    </span>
);

const AccountChip = ({ account }: { account: { loginid: string; balance: number; currency: string; is_virtual: boolean } }) => {
    const type = account.is_virtual ? 'demo' : 'real';
    return (
        <span className={`copy-trading__account-chip copy-trading__account-chip--${type}`}>
            <span className='copy-trading__account-chip__loginid'>{account.loginid}</span>
            <span className='copy-trading__account-chip__balance'>{fmtBalance(account.balance, account.currency)}</span>
            <span className={`copy-trading__account-chip__type copy-trading__account-chip__type--${type}`}>
                {type === 'demo' ? localize('Demo') : localize('Real')}
            </span>
        </span>
    );
};

// ── main page ─────────────────────────────────────────────────────────────────

const CopyTrading = observer(() => {
    const store = useStore();
    const ct = store.copy_trading;

    const handleLeaderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') ct.connectLeader();
    };

    const handleFollowerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') ct.addFollower();
    };

    const canStart =
        ct.leader_status === 'connected' &&
        ct.followers.some(f => f.status === 'connected') &&
        !ct.is_running;

    const canStop = ct.is_running;

    return (
        <div className='copy-trading'>
            {/* ── header ── */}
            <div className='copy-trading__header'>
                <IconCopy />
                <h2><Localize i18n_default_text='Copy Trading' /></h2>
                <span className={`copy-trading__header-badge copy-trading__header-badge--${ct.is_running ? 'running' : 'stopped'}`}>
                    {ct.is_running ? localize('Running') : localize('Stopped')}
                </span>
            </div>
            <p className='copy-trading__desc'>
                <Localize i18n_default_text='Mirror trades from any leader account — including demo-to-real — onto one or more follower accounts using their API tokens.' />
            </p>

            {/* ── leader card ── */}
            <div className='copy-trading__card'>
                <div>
                    <p className='copy-trading__card-title'>
                        <Localize i18n_default_text='Leader Account' />
                    </p>
                    <p className='copy-trading__card-subtitle'>
                        <Localize i18n_default_text='Paste the API token of the account whose trades you want to copy. Use a demo token here to copy demo trades to real accounts.' />
                    </p>
                </div>

                <div className='copy-trading__input-row'>
                    <input
                        type='text'
                        placeholder={localize('Leader API token (read + trade scope)')}
                        value={ct.leader_token}
                        onChange={e => ct.setLeaderToken(e.target.value)}
                        onKeyDown={handleLeaderKeyDown}
                        disabled={ct.is_running}
                    />
                    <button
                        className='copy-trading__btn copy-trading__btn--secondary'
                        onClick={() => ct.connectLeader()}
                        disabled={!ct.leader_token || ct.leader_status === 'connecting' || ct.is_running}
                    >
                        {ct.leader_status === 'connecting'
                            ? localize('Connecting…')
                            : localize('Connect')}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                    <StatusDot status={ct.leader_status} />
                    {ct.leader_account && <AccountChip account={ct.leader_account} />}
                    {ct.leader_error && (
                        <span style={{ fontSize: '1.2rem', color: 'var(--loss-danger)' }}>
                            {ct.leader_error}
                        </span>
                    )}
                </div>
            </div>

            {/* ── followers card ── */}
            <div className='copy-trading__card'>
                <div>
                    <p className='copy-trading__card-title'>
                        <Localize i18n_default_text='Follower Accounts' />
                    </p>
                    <p className='copy-trading__card-subtitle'>
                        <Localize i18n_default_text='Add API tokens for every account that should receive copies of the leader trades. Each account needs a token with trade scope.' />
                    </p>
                </div>

                <div className='copy-trading__input-row'>
                    <input
                        type='text'
                        placeholder={localize('Follower API token (trade scope)')}
                        value={ct.new_follower_token}
                        onChange={e => ct.setNewFollowerToken(e.target.value)}
                        onKeyDown={handleFollowerKeyDown}
                        disabled={ct.is_running}
                    />
                    <button
                        className='copy-trading__btn copy-trading__btn--secondary'
                        onClick={() => ct.addFollower()}
                        disabled={!ct.new_follower_token || ct.is_running}
                    >
                        <Localize i18n_default_text='Add Follower' />
                    </button>
                </div>

                {ct.followers.length === 0 ? (
                    <div className='copy-trading__empty'>
                        <Localize i18n_default_text='No followers added yet. Paste an API token above and click Add Follower.' />
                    </div>
                ) : (
                    <div className='copy-trading__follower-list'>
                        {ct.followers.map(f => (
                            <div key={f.token} className='copy-trading__follower-row'>
                                <div className='copy-trading__follower-row-info'>
                                    <span className='copy-trading__follower-row-token' title={maskToken(f.token)}>
                                        {maskToken(f.token)}
                                    </span>
                                    <StatusDot status={f.status} />
                                    {f.account && <AccountChip account={f.account} />}
                                </div>
                                {!ct.is_running && (
                                    <button
                                        className='copy-trading__follower-row-remove'
                                        title={localize('Remove follower')}
                                        onClick={() => ct.removeFollower(f.token)}
                                    >
                                        <IconClose />
                                    </button>
                                )}
                                {f.error && (
                                    <span className='copy-trading__follower-row-error'>{f.error}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── controls card ── */}
            <div className='copy-trading__card'>
                <p className='copy-trading__card-title'>
                    <Localize i18n_default_text='Controls' />
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div className='copy-trading__multiplier'>
                        <label htmlFor='ct-multiplier'>
                            <Localize i18n_default_text='Stake multiplier' />
                        </label>
                        <input
                            id='ct-multiplier'
                            type='number'
                            min='0.01'
                            max='100'
                            step='0.1'
                            value={ct.stake_multiplier}
                            onChange={e => ct.setStakeMultiplier(parseFloat(e.target.value) || 1)}
                            disabled={ct.is_running}
                        />
                    </div>
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-less-prominent)' }}>
                        <Localize i18n_default_text='e.g. 1.0 = same stake, 0.5 = half, 2.0 = double' />
                    </span>
                </div>

                <div className='copy-trading__controls'>
                    {!ct.is_running ? (
                        <button
                            className='copy-trading__btn copy-trading__btn--primary'
                            onClick={() => ct.startCopying()}
                            disabled={!canStart}
                        >
                            <IconPlay />
                            <Localize i18n_default_text='Start Copying' />
                        </button>
                    ) : (
                        <button
                            className='copy-trading__btn copy-trading__btn--stop'
                            onClick={() => ct.stopCopying()}
                            disabled={!canStop}
                        >
                            <IconStop />
                            <Localize i18n_default_text='Stop Copying' />
                        </button>
                    )}

                    {!canStart && !ct.is_running && (
                        <span className='copy-trading__controls-hint'>
                            {ct.leader_status !== 'connected'
                                ? localize('Connect the leader account first.')
                                : !ct.followers.some(f => f.status === 'connected')
                                    ? localize('Add and connect at least one follower.')
                                    : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* ── trade log card ── */}
            <div className='copy-trading__card'>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <p className='copy-trading__card-title' style={{ marginBottom: 0 }}>
                        <Localize i18n_default_text='Trade Log' />
                        {ct.trade_log.length > 0 && (
                            <span style={{ fontSize: '1.2rem', fontWeight: 400, color: 'var(--text-less-prominent)', marginLeft: '0.8rem' }}>
                                ({ct.trade_log.length})
                            </span>
                        )}
                    </p>
                    {ct.trade_log.length > 0 && (
                        <button
                            className='copy-trading__btn copy-trading__btn--secondary copy-trading__btn--sm'
                            onClick={() => ct.clearLog()}
                        >
                            <Localize i18n_default_text='Clear' />
                        </button>
                    )}
                </div>

                {ct.trade_log.length === 0 ? (
                    <div className='copy-trading__log-empty'>
                        <Localize i18n_default_text='Copied trades will appear here in real time.' />
                    </div>
                ) : (
                    <div className='copy-trading__log'>
                        {/* header */}
                        <div className='copy-trading__log-row copy-trading__log-row--header'>
                            <span><Localize i18n_default_text='Time' /></span>
                            <span><Localize i18n_default_text='Symbol / Type' /></span>
                            <span><Localize i18n_default_text='Stake' /></span>
                            <span><Localize i18n_default_text='Results' /></span>
                        </div>
                        {ct.trade_log.map(entry => (
                            <div key={entry.id} className='copy-trading__log-row'>
                                <span className='copy-trading__log-cell copy-trading__log-cell--dim copy-trading__log-cell--mono'>
                                    {fmtDate(entry.timestamp)}
                                </span>
                                <span className='copy-trading__log-cell'>
                                    <strong>{entry.symbol}</strong>
                                    {' · '}
                                    {entry.contract_type}
                                    {' · '}
                                    <span style={{ color: 'var(--text-less-prominent)' }}>
                                        {entry.duration}{entry.duration_unit}
                                    </span>
                                </span>
                                <span className='copy-trading__log-cell copy-trading__log-cell--mono'>
                                    {entry.stake.toFixed(2)} {entry.currency}
                                </span>
                                <span className='copy-trading__log-cell'>
                                    <div className='copy-trading__log-results'>
                                        {entry.results.map(r => (
                                            <span
                                                key={r.follower_loginid}
                                                className={`copy-trading__log-result-chip copy-trading__log-result-chip--${r.error ? 'err' : 'ok'}`}
                                                title={r.error ?? `Contract #${r.contract_id}`}
                                            >
                                                {r.error ? '✕' : <IconCheck />}
                                                {' '}
                                                {r.follower_loginid}
                                                {r.buy_price !== undefined && ` (${r.buy_price.toFixed(2)})`}
                                            </span>
                                        ))}
                                    </div>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── how it works info ── */}
            <div className='copy-trading__card' style={{ borderStyle: 'dashed', opacity: 0.8 }}>
                <p className='copy-trading__card-title' style={{ fontSize: '1.3rem' }}>
                    <Localize i18n_default_text='How it works' />
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.8rem', fontSize: '1.3rem', color: 'var(--text-less-prominent)', lineHeight: '2' }}>
                    <li><Localize i18n_default_text='Each account needs an API token with Read + Trade scopes (generate at app.deriv.com → API Token).' /></li>
                    <li><Localize i18n_default_text='Set the leader to a demo account token and add real accounts as followers to copy demo→real.' /></li>
                    <li><Localize i18n_default_text='Adjust the stake multiplier to size follower trades relative to the leader (e.g. 0.5 = half the stake).' /></li>
                    <li><Localize i18n_default_text='Copying uses separate WebSocket connections per account — tokens are never shared between accounts.' /></li>
                    <li><Localize i18n_default_text='Trades are replicated via live contract proposals, so slippage may occur on fast-moving markets.' /></li>
                </ul>
            </div>
        </div>
    );
});

export default CopyTrading;
