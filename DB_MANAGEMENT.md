# 🗄️ Toy Boy Database Management (Supabase)

This document outlines the architecture, configuration, and Standard Operating Procedures (SOPs) for the Toy Boy MVP database. We use a **CLI-first, migration-based workflow** to ensure schema versioning and full TypeScript type safety.

## 🏗️ Architecture

- **Database:** PostgreSQL (via Supabase)
- **Schema Management:** Supabase CLI Migrations
- **Type Safety:** Auto-generated TypeScript interfaces from DB schema
- **Access Control:** Row Level Security (RLS) policies for secure public access

### Table: `experiences`

Stores the generated React code and configuration for each digital action figure.

| Column        | Type          | Description                                      |
| :------------ | :------------ | :----------------------------------------------- |
| `id`          | `uuid`        | Primary Key (Shareable Link ID)                  |
| `created_at`  | `timestamptz` | Auto-generated timestamp                         |
| `code`        | `text`        | The full React (App.tsx) code string             |
| `json_schema` | `jsonb`       | The intermediate JSON representation of the chat |

---

## 🛠️ Setup & Configuration

### Prerequisites

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm install supabase --save-dev`)
2. Docker running (if testing migrations locally)

### Initial Linking

```bash
npx supabase login
npx supabase link --project-ref dyaeiemwstweyidennxs
```

### Final Setup Step (Polishing)

Once linked and migrations are pushed, sync your TypeScript types:

```bash
npx supabase gen types typescript --project-id dyaeiemwstweyidennxs > lib/database.types.ts
```

---

## 📋 Standard Operating Procedures (SOPs)

### 1. Modifying the Schema

**NEVER** modify the table structure directly in the Supabase Dashboard UI. Always use migrations.

1.  **Create a new migration file:**
    ```bash
    npx supabase migration new your_change_name
    ```
2.  **Edit the generated file** in `supabase/migrations/` with your SQL.
3.  **Push to production:**
    ```bash
    npx supabase db push
    ```

### 2. Updating TypeScript Types

Whenever the database schema changes, you must regenerate the types to keep the frontend in sync.

```bash
npx supabase gen types typescript --project-id dyaeiemwstweyidennxs > lib/database.types.ts
```

### 3. Reviewing Security (RLS)

We use RLS to allow the MVP to function without a complex Auth system for now.

- **Insert:** Publicly allowed so any user finishing the "Cupid" chat can save.
- **Select:** Publicly allowed via `anon` key so anyone with the link can view.

To check current policies:

```sql
select * from pg_policies where tablename = 'experiences';
```

---

## 🚀 Troubleshooting

### "Privileges Error" on Link

If you see `Unexpected error retrieving remote project status`, run:

1. `npx supabase logout`
2. `npx supabase login`
3. Ensure you are an "Owner" or "Admin" of the Supabase project.

### Missing Environment Variables

Ensure `.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dyaeiemwstweyidennxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📅 Maintenance Schedule

- **Backups:** Supabase handles daily backups automatically on the Pro plan. For MVP, ensure you periodically export critical "experiences" if needed.
- **Log Review:** Check the Supabase API logs for 403 errors, which usually indicate an RLS policy is blocking a legitimate request.
