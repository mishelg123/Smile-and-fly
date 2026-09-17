# Shared leaderboard setup

The game uses Supabase for a shared leaderboard across all devices.

## 1. Create a Supabase project

Create a project at https://supabase.com/ and open its SQL Editor.

## 2. Create the table and RPC

Copy the complete contents of `supabase.sql` into the SQL Editor and run it.

## 3. Add local environment variables

Copy `.env.example` to `.env.local` and fill in the values from Supabase:

- `VITE_SUPABASE_URL`: Project URL
- `VITE_SUPABASE_ANON_KEY`: Publishable anon key

Never use a Supabase service-role key in this frontend app.

## 4. Add the same variables to Vercel

In Vercel, open the project settings, then Environment Variables, and add both variables for Production, Preview, and Development. Redeploy after saving.

Until these variables are configured, local development falls back to browser `localStorage`. Once configured, scores are read from and written to Supabase and are shared across devices.
