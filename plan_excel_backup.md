# Plan: Excel Data Backup for Users

## Goal
Implement a feature that allows users to export their entire history (shifts and payouts) as an Excel (.xlsx) file, which is delivered directly to their Telegram chat via the bot.

## Feature Specification
1.  **User Interface**:
    *   Add a **"Скачать архив данных"** (Download Data Archive) button in the `AccountPage` (`src/app/account/page.tsx`).
    *   The button should have a visual indication (e.g., an icon of a file or cloud download).
    *   Upon clicking, show a loading state ("Генерация отчета...").

2.  **Backend Logic**:
    *   Create a new API route: `/api/user/export-excel`.
    *   This ID is secured (requires auth).
    *   It fetches:
        *   All shifts (`shifts` table) for the user.
        *   All payouts (`payouts` table) for the user.
        *   User profile info (for the header).
    *   Generates an `.xlsx` file using a library like `xlsx` or `exceljs`.
        *   **Sheet 1: "Сводка"**: Global totals (Earned, Paid, Balance).
        *   **Sheet 2: "Смены"**: Date, Hours, Services breakdown, Total.
        *   **Sheet 3: "Выплаты"**: Date, Amount, Comment.

3.  **Delivery Mechanism**:
    *   Instead of downloading in the browser (which can be flaky in Mini Apps), the server sends the file to the user's Telegram Chat ID using the Bot API `sendDocument`.
    *   The browser receives a success response: "Файл отправлен в чат с ботом".

## Technical Stack
*   **Library**: `xlsx` (SheetJS) — lightweight and sufficient for simple table exports.
*   **Telegram API**: `sendDocument` method.

## Step-by-Step Implementation Plan

### Phase 1: Setup
1.  [ ] Install `xlsx` library: `npm install xlsx`.
2.  [ ] Create `ExportService` to handle data formatting and Excel generation.

### Phase 2: Backend API
3.  [ ] Create `/api/user/export-excel/route.ts`.
4.  [ ] Implement data fetching (reuse existing Repositories).
5.  [ ] Implement Excel generation logic.
6.  [ ] Implement Telegram `sendDocument` logic (requires `TELEGRAM_BOT_TOKEN`).

### Phase 3: Frontend UI
7.  [ ] Modify `src/app/account/page.tsx`:
    *   Add the "Скачать архив" button in a new section (e.g., "Управление данными").
    *   Handle the click event: call API -> show toast/alert on success.

## User Flow
1. User goes to **Profile**.
2. Scrolls to "Data Management".
3. Clicks **"Получить выписку (Excel)"**.
4. Sees toast: *"Отчет отправлен вам в личные сообщения"*.
5. Receives a file `report_2024-01-30.xlsx` from the bot.
