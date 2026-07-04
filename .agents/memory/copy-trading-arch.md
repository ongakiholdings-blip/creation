---
name: Copy Trading architecture
description: How the copy trading feature is structured and key constraints to maintain.
---

## Structure
- `src/services/copy-trading.service.ts` — opens separate DerivAPIBasic WebSocket connections per account, subscribes to leader `transaction` stream, replicates `buy` events on followers via proposal+buy.
- `src/stores/copy-trading-store.ts` — MobX store; exposes `connectLeader`, `addFollower`, `startCopying`, `stopCopying`, `stakeMultiplier`, `trade_log`.
- `src/pages/copy-trading/index.tsx` — UI panel (tab 8 in main.tsx).

## Key constraints
**Token handling:** Full API tokens must never appear in the DOM (even in `title` attributes), never in `CopyTradeResult`, never in `trade_log`. Only `follower_token_hint` (last 4 chars) is stored in log entries. Tokens live only in the service's `followerConns` Map.

**Stream lifecycle:** `startCopying()` calls `stopCopying()` before subscribing to prevent duplicate event handlers. `stopCopying()` sends `forget_all: "transaction"` to the server before unsubscribing the client listener.

**Connection health:** `createConnection()` accepts an `onDisconnect` callback; the store uses it to downgrade status to `'error'` and auto-stop copying when the leader drops.

**Why:** Code review flagged token exposure and duplicate subscription as critical bugs — these constraints prevent them from recurring.
