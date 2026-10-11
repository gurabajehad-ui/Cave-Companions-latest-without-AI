# Complete SQLite Removal & PostgreSQL Migration Plan

Audit and execution plan to eliminate SQLite completely from the Cave Companions architecture and ensure 100% of data persistence and business logic runs purely on PostgreSQL with zero logic degradation.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Audit Answer (তথ্য, লজিক ও কোড পরিবর্তন সংক্রান্ত)**:
> 1. **কোড ও লজিক (Code & Logic)**: কোনো বিজনেস লজিক বা ফিচার পরিবর্তিত হবে না। অ্যাপের সমস্ত কুয়েরি (`server/db.ts`) ইতোমধ্যেই PostgreSQL সিনট্যাক্সে (`$1, $2`, `JSONB`, `TIMESTAMPTZ`, `ILIKE`, `ON CONFLICT`) প্রস্তুত করা। SQLite ছিল একটি ডুয়েল ট্রান্সলেশন লেয়ার—এটি সরিয়ে দিলে সিস্টেম আরও দ্রুত ও ঝামেলামুক্ত হবে।
> 2. **ফাইল স্ট্যাটাস (Deleted Files)**: আপনি যে ৮টি ফাইল ডিলিট করেছেন (যেমন `cave_companions.db`, `server.cjs`, `.cloud_sql_proxy.pid` ইত্যাদি), সেগুলো ছিল পুরনো বান্ডল, সাময়িক PID ও পুরনো SQLite ফাইল। এগুলো ডিলিট হওয়াতে কোনো ক্ষতি হয়নি, বরং প্রজেক্ট এখন ক্লিন হয়েছে।
> 3. **নতুন ডেটাবেজ ইনিশিয়ালাইজেশন**: PostgreSQL-এ অ্যাপের সকল মূল টেবিল (`users`, `mosques`, `prayer_attendance`, `shops`, `products`, `orders`, `tokens`, `redemptions`, `notifications` ইত্যাদি) এবং ডিফল্ট সিড ডেটা ক্লিন ও নির্ভুলভাবে সক্রিয় হবে।

---

### 1. Overview & Core Concept

- **What It Does**: Transitions the Cave Companions server from a hybrid dual-engine setup (PostgreSQL with SQLite fallback) into a single, high-performance PostgreSQL persistence layer.
- **Key Value**: 
  - Removes 100% of SQLite code, translation shims, and heavy WASM modules (`sql.js`, `sqlite3`).
  - Native JSONB querying, ACID transactions, and robust relational constraints.
  - Fixes socket/host resolution for Google Cloud SQL proxy connectivity.

---

### 2. Technical Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Cave Companions Client                    │
│            (React SPA on Vite / PWA Mobile App)             │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Backend (server.ts)                 │
│    Routes: Auth, Prayers, Mosques, Market, Shops, Admin     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │    server/db.ts (Logic)   │ │  server/pgInit.ts (Schema)│
   │ Direct PostgreSQL Queries │ │ Tables, Indexes, Seed DDL │
   └─────────────┬─────────────┘ └─────────────┬─────────────┘
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │            server/pg.ts (Pure PostgreSQL Pool)          │
   │    • pg.Pool with automatic Unix Socket / TCP resolver   │
   │    • Removed SQLite WASM engine & translation shims      │
   │    • Real-time connection health & error diagnostics    │
   └────────────────────────────┬────────────────────────────┘
                                │ Unix Domain Socket / Port 5432
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │              PostgreSQL / Cloud SQL Database            │
   │      Tables: users, mosques, prayer_attendance, ...     │
   └─────────────────────────────────────────────────────────┘
```

---

### 3. Key Product Decisions & Migration Steps

#### Decision 1: Pure PostgreSQL vs. Hybrid Fallback
- **Chosen Approach**: Completely remove the SQLite engine, `sql.js`, `cave_companions.db`, and `translatePgToSqlite` functions.
- **Why**: SQLite was causing dual-state divergence, regex query translations, and WASM memory overhead. Moving to pure PostgreSQL ensures production-grade ACID reliability.

#### Decision 2: Cloud SQL Unix Socket & Host Auto-Discovery
- **Chosen Approach**: Dynamic socket resolver in `server/pg.ts` that checks active socket files in `/app/cloudsql/` and connects to the correct instance name (`gen-lang-client-...` or configured host) automatically.
- **Why**: Eliminates `ENOENT` connection errors caused by project name changes across environments.

#### Decision 3: Dependency Pruning
- **Chosen Approach**: Remove `"sqlite3"` and `"sql.js"` from `package.json`. Keep only `"pg"` and `"@types/pg"`.
- **Why**: Lightens deployment image and reduces container cold-start time.

---

### 4. Step-by-Step Execution Plan

1. **Clean `server/pg.ts`**:
   - Strip all SQLite imports (`initSqlJs`, `sql.js`, `saveSqliteDb`, `translatePgToSqlite`).
   - Implement resilient PostgreSQL host/socket detection that checks `/app/cloudsql` directory and connects via `pg.Pool`.
   - Expose clean `query`, `getClient`, and `pool` helpers.

2. **Schema & Migration Verification (`server/pgInit.ts`)**:
   - Verify table creation scripts in PostgreSQL for all 25+ application tables.
   - Ensure default super admin account, system settings, and essential seeds are intact.

3. **Prune Dependencies**:
   - Remove `sqlite3` and `sql.js` from `package.json`.

4. **Comprehensive System & API Audit**:
   - Run compilation (`compile_applet`) and verify build passes.
   - Run automated health test querying PostgreSQL tables.
   - Test user authentication, prayer verification, and shops API endpoints.
