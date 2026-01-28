# План рефакторинга: Разделение God Object (`src/lib/db.ts`)

## 🎯 Цель
Разделить монолитный файл `src/lib/db.ts` (2500+ строк) на поддерживаемую архитектуру слоев.
**Текущее состояние**: 81 функция в одном файле, смешана логика БД, бизнес-логика (FIFO) и утилиты.

## 🏗 Целевая Архитектура

### 1. **Core (Инфраструктура)**
- `src/lib/db-client.ts` — Инициализация пула (Vercel/Local) и хелперы запросов.
- `src/types/database.ts` — TypeScript интерфейсы БД.

### 2. **Repositories (Data Access Layer)**
*Чистые SQL запросы к одной сущности. Никакой бизнес-логики.*
- `src/repositories/user.repository.ts`
- `src/repositories/shift.repository.ts`
- `src/repositories/price.repository.ts`
- `src/repositories/payout.repository.ts`
- `src/repositories/carryover.repository.ts`
- `src/repositories/month.repository.ts` (статусы месяцев)

### 3. **Services (Business Logic Layer)**
*Оркестрация репозиториев, сложные расчеты, транзакции.*
- `src/services/payout.service.ts` (Сложная логика выплат, FIFO, авансы, коррекции)
- `src/services/report.service.ts` (Сборка больших отчетов для админки/мастеров)
- `src/services/month.service.ts` (Закрытие месяцев, авто-процессинг)
- `src/services/db-init.service.ts` (Инициализация таблиц)

---

## 📅 Детальный План

### 🚩 Фаза 1: Фундамент (Safe Zone)
*Цель: Подготовить почву и вынести общие типы/клиент без поломки функционала.*
- [x] 1.1. Создать `src/types/database.ts`: перенести `User`, `Shift`, `Price`, `Payout`, `Carryover`.
- [x] 1.2. Создать `src/lib/db-client.ts`: перенести `getVercelClient`, `localPool`, `executeSimpleQuery`, `executeQuery`.
- [x] 1.3. Обновить `src/lib/db.ts`: сделать так, чтобы он импортировал клиент и типы из новых файлов (сохраняем обратную совместимость).

### 🚩 Фаза 2: Репозитории (Extraction)
*Цель: Вынести SQL. Старый `db.ts` превращается в набор прокси-функций.*

#### 2.1 Users & Prices (Простые CRUD)
- [x] 2.1.1. Создать `src/repositories/user.repository.ts`. Перенести: `getUserBy...`, `createUser`, `updateUser`, `blockUser`...
- [x] 2.1.2. Создать `src/repositories/price.repository.ts`. Перенести: `getPrices`, `addPrice`...
- [x] 2.1.3. Обновить `db.ts` для использования этих репозиториев.

#### 2.2 Shifts & Payouts (Basic)
- [x] 2.2.1. Создать `src/repositories/shift.repository.ts`. Перенести: `getShifts`, `addShift`, `deleteShift`.
- [x] 2.2.2. Создать `src/repositories/payout.repository.ts`. Только базовый CRUD: `createPayout` (simple), `getPayouts...`, `deletePayout`.
- [x] 2.2.3. Создать `src/repositories/carryover.repository.ts`.
- [x] 2.2.4. Создать `src/repositories/month.repository.ts`. Статусы месяцев и агрегация данных.

### 🚩 Фаза 3: Сервисы (Complex Logic)
*Самый ответственный этап. Перенос "мозгов" приложения.*

#### 3.1 Payout Service (FIFO Core)
- [x] 3.1.1. Создать `src/services/payout.service.ts`.
- [x] 3.1.2. Перенести логику: `createPayoutWithCorrection` (использует payoutRepo + carryoverRepo).
- [x] 3.1.3. Перенести логику: `recalculateAdvancesForMonth`, `processMonthClosure`, `processOverpaymentCarryover`.

#### 3.2 Report & Balance Service
- [x] 3.2.1. Создать `src/services/report.service.ts`.
- [x] 3.2.2. Перенести тяжелые запросы: `getReportsWithGlobalBalanceOptimized`, `getPayoutsDataWithGlobalBalance`.
- [x] 3.2.3. Вынести логику баланса: `getUserBalance`, `getMonthStatusByBalance`.

#### 3.3 Month Lifecycle
- [x] 3.3.1. Создать `src/services/month.service.ts` (`autoCloseFinishedMonths`, управление статусами).

### 🚩 Фаза 4: Cleanup & Switch
- [~] 4.1. Обновить API роуты (`src/app/api/**/*.ts`), заменив импорты из `src/lib/db` на прямые импорты из `services/*` и `repositories/*`.
  - ✅ `api/payouts/route.ts`, `api/payouts/[id]/route.ts`
  - ✅ `api/admin/payouts/route.ts`, `api/admin/payouts/[id]/route.ts`
  - ✅ `api/reports/route.ts`, `api/admin/reports/route.ts`
  - ✅ `api/reports/[employeeId]/shifts/route.ts`
  - ✅ `api/shifts/route.ts`, `api/shifts/[id]/route.ts`
  - ✅ `api/users/route.ts`, `api/users/[id]/route.ts`
  - ✅ `api/prices/route.ts`, `api/prices/[id]/route.ts`, `api/prices/bulk/route.ts`
  - ✅ `api/auth/telegram/route.ts`, `api/auth/login/route.ts`
  - ✅ `api/user/profile/route.ts`, `api/user/register/route.ts`, `api/user/set-password/route.ts`
  - ✅ `api/admin/month-status/route.ts`, `api/admin/shifts/route.ts`
  - ✅ `api/admin/create-test-user/route.ts`, `api/admin/create-test-shifts/route.ts`
  - ✅ `api/admin/month-totals/route.ts` (функция перенесена в month.repository)
  - ✅ `api/admin/months-with-shifts/route.ts` (функция перенесена в month.repository)
  - ✅ `api/admin/cleanup-users/route.ts` (функция перенесена в user.repository)
  - ✅ `api/init-db` (перенесено в db-init.service)
- [x] 4.2. Удалить файл `src/lib/db.ts` (файл удалён!).
- [x] 4.3. Прогнать полный ручной тест ключевых сценариев (скрипт `manual-test-services.ts` отработал успешно).

# 🎉 РЕФАКТОРИНГ ЗАВЕРШЕН!
Файл `src/lib/db.ts` успешно удален. Архитектура полностью мигрирована на Services + Repositories.

---

## � Стратегия миграции "Canary"
Мы **не удаляем** код из `db.ts` сразу.
1. Создаем новый файл (напр. `user.repository.ts`).
2. В `db.ts` удаляем тело функции и заменяем его на вызов новой функции.
   ```typescript
   // В db.ts
   import * as userRepo from '@/repositories/user.repository'; 
   
   export const getUserByTelegramId = userRepo.getUserByTelegramId;
   ```
3. Это гарантирует, что старые зависимости не сломаются, пока мы полностью не перейдем на фазу 4.

## ⚠️ Риски и Mitigation
1. **FIFO Логика**: Очень чувствительная зона. При переносе `payout.service` нужно быть предельно внимательным к порядку вызовов.
2. **Импорты**: В проекте нет алиасов для `repositories` (нужно будет добавить в `tsconfig.json` или использовать относительные пути, лучше добавить алиас `@/repositories`).
3. **Context**: Потеря контекста транзакций (если они есть). Сейчас транзакции самописные внутри функций — это нужно сохранить.

## 🕵️‍♂️ Checklist для каждой функции при переносе
- [ ] Функция скопирована в новый файл.
- [ ] Типы импортированы корректно.
- [ ] Если есть SQL запрос -> он использует `db-client`.
- [ ] В старом файле `db.ts` сделан ре-экспорт.
- [ ] Проект билдится (`npm run build` или проверка типов).
