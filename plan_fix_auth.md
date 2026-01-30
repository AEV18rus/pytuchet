# Plan: Fix Authentication Priority

## Problem
The Main Page shows an incorrect balance (12,540 ₽) while the Payouts Page shows the correct global balance (19,540 ₽).
This happens because:
1.  **Main Page** uses `useTelegramAuth` hook, which prioritizes `localStorage` cached user over the live Telegram session.
2.  **Payouts Page** manually checks `window.Telegram.WebApp` and uses the live user ID immediately.
3.  If `localStorage` contains an old or fallback user ID, the Main Page sticks to it, while the Payouts Page shows the correct data for the actual Telegram user.

## Solution
Update `src/hooks/useTelegramAuth.ts` to prioritize **Telegram WebApp Identity** over `localStorage`.

### Steps:
1.  **Modify `src/hooks/useTelegramAuth.ts`**:
    *   Change the initialization order.
    *   **First:** Check if running in Telegram (`isTelegramWebApp`).
    *   **If Yes:** Attempt to authenticate using `initData`.
        *   If successful: Use this user and update `localStorage`.
        *   If failed/no initData: Fallback to existing `localStorage` logic or Test User.
    *   **If No:** Proceed with `localStorage` check (browser mode).

2.  **Verify**:
    *   This ensures that whenever the app is opened in Telegram, it *always* syncs with the current Telegram user, overriding any stale cache.

## Risk
*   Minimal risk. This standardizes auth logic to be "Telegram First", which is correct for a Telegram Mini App.
