# IronLog — Training Program Manager

A web app for building training programs, assigning them to people, and tracking
progress. Admins build programs (workout days full of exercises) and assign them
to athletes; athletes log their sets/reps/weight against each exercise.

**Stack:** React + Vite + Tailwind CSS on the frontend, [Supabase](https://supabase.com)
(Postgres + Auth) as the backend. The frontend is 100% static, so it deploys for
free on GitHub Pages; Supabase handles logins, the database, and access control.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (the free tier is enough
   to start).
2. Once it's created, open **Project Settings → API**. You'll need two values later:
   - **Project URL**
   - **anon public** key
3. Open **SQL Editor → New query**, paste in the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql) from this repo, and click **Run**.
   This creates all tables, a trigger that auto-creates a profile on signup, and the
   Row Level Security policies that:
   - let admins create/edit/delete programs, workouts, exercises, and assignments,
   - let each user see only the programs assigned to them,
   - let each user read/write only their own progress logs.
4. (Optional, for easier testing) Under **Authentication → Providers → Email**,
   turn off "Confirm email" so new accounts can sign in immediately without
   clicking a confirmation link.

### Make yourself an admin

Everyone who signs up starts as a normal `user`. To promote an account to admin:

1. Sign up once in the running app with the account you want to be admin.
2. In Supabase Studio, go to **Table Editor → profiles**, find your row, and change
   `role` from `user` to `admin` (or run the commented SQL at the bottom of
   `schema.sql` with your email).

---

## 2. Run it locally

```bash
npm install
cp .env.example .env
# then edit .env and paste in your Supabase Project URL + anon key
npm run dev
```

## 3. Deploy to GitHub Pages

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Go to **Settings → Secrets and variables → Actions → New repository secret** and
   add two secrets (same values as your local `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Open `vite.config.js` and set `base` to match how your site will be served:
   - Repo deployed at `https://<username>.github.io/<repo-name>/` → `base: '/<repo-name>/'`
   - A user/org page repo literally named `<username>.github.io`, served at the
     root → `base: '/'`
5. Commit and push to `main`. The included workflow
   (`.github/workflows/deploy.yml`) builds the app and publishes `dist/` to Pages
   automatically. Check the **Actions** tab for progress; the deployed URL shows up
   there and under **Settings → Pages** once it finishes.

Routing uses `HashRouter` (URLs like `/#/program/…`) specifically so that
refreshing or deep-linking works correctly on GitHub Pages, which doesn't support
server-side rewrites for client-side routes.

---

## How it's organized

```
src/
  lib/supabaseClient.js     Supabase client, reads env vars
  contexts/AuthContext.jsx  session + profile (role) available app-wide
  components/               Navbar, route guard
  pages/
    Login.jsx / Signup.jsx
    AdminPrograms.jsx       admin: list/create/delete programs
    ProgramEditor.jsx       admin: build workouts & exercises, assign athletes
    AdminUsers.jsx          admin: view users, promote/demote admin
    UserDashboard.jsx       athlete: list of assigned programs
    ProgramView.jsx         athlete: view a program, log sets/reps/weight
supabase/schema.sql          full DB schema + Row Level Security policies
.github/workflows/deploy.yml GitHub Pages deploy workflow
```

## Data model

- **profiles** — one row per user, extends Supabase auth with a `role`
  (`user`/`admin`) and display name.
- **programs** — a named training program.
- **workouts** — a day within a program (e.g. "Day 1 – Push").
- **exercises** — a single exercise within a workout, with target sets/reps/weight.
- **assignments** — links a `program` to a `user` (who it was assigned to).
- **logs** — a user's actual performance (sets/reps/weight/notes) for one exercise
  on one date.

All access control is enforced at the database level via Postgres Row Level
Security, not just in the frontend — so even though the frontend code is public
(it has to be, as static files), users genuinely cannot read or write data they
shouldn't be able to.

## Extending it

Ideas for next steps, roughly in order of effort:
- Charts of weight/reps progression over time (the `recharts` package is already
  installed).
- Copy/duplicate a program as a template for a new athlete.
- Reordering workouts/exercises via drag-and-drop (currently ordered by
  `day_order` / `order_index`, editable directly in Supabase Studio if needed).
- Email notifications when a new program is assigned (would need a Supabase Edge
  Function, since GitHub Pages can't send emails itself).
