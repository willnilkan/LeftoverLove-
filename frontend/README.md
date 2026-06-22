# LeftoverLove - Community Plate

Connect surplus food with people who need it. Donors list food, receivers request it, and volunteers deliver it. Built with React, Vite, TypeScript, Supabase, and Tailwind CSS.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui
- **Backend/Database**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Maps**: Leaflet

## Prerequisites

- **Node.js** 18+ (recommend [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **npm** or **yarn** or **bun**
- **Supabase account** ([supabase.com](https://supabase.com))

## Step-by-Step Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd community-plate-main
```

### 2. Install dependencies

```bash
npm install
```

### 3. Supabase setup

1. Create a project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **Project ID** (from URL) → `VITE_SUPABASE_PROJECT_ID`

### 4. Run database migrations

In Supabase Dashboard: **SQL Editor** → run the migrations in order:

- `supabase/migrations/20260212102745_*.sql`
- `supabase/migrations/20260212120000_volunteer_requests_and_fixes.sql`

Or use Supabase CLI:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 5. Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Copy from `.env.example` and fill in your values.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public API key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID (optional, for tooling) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |

## Verification Checklist

Use this to confirm everything works.

### Auth & routing

- [ ] Homepage loads at `/`
- [ ] Register creates account and sends verification email (if enabled)
- [ ] Login redirects to Dashboard
- [ ] Logout works
- [ ] Unauthenticated users are redirected from `/dashboard`, `/add-food`, `/profile`

### Roles (Donor, Receiver, Volunteer)

- [ ] **Donor**: Can add food, see listings, accept/reject requests
- [ ] **Receiver**: Can browse food map, request food, see own requests
- [ ] **Volunteer**: Can see available deliveries, claim them, update delivery status
- [ ] **Admin**: Can do donor + volunteer actions

### Food & requests

- [ ] Add food form (donor): title, quantity, description, location picker
- [ ] Food appears on Food Map
- [ ] Receiver can request food from map
- [ ] Donor sees pending requests and can accept/reject
- [ ] Volunteer sees accepted requests and can claim delivery
- [ ] Duplicate delivery claims show "Already claimed" message

### Map & UI

- [ ] Food Map shows available food with markers
- [ ] Radius filter works
- [ ] "Locate Me" uses geolocation
- [ ] Mobile menu works
- [ ] Profile page: update name, phone, change password

### Database

- [ ] Migrations run without errors
- [ ] RLS policies enforce access by role
- [ ] Profile and user role created on signup

## Project Structure

```
src/
├── components/     # UI components, layout
├── hooks/          # useAuth, useToast
├── integrations/   # Supabase client and types
├── lib/            # Utilities
├── pages/          # Route pages
├── test/           # Vitest tests
├── App.tsx
├── main.tsx
└── index.css
supabase/
└── migrations/     # SQL migrations
```

## Troubleshooting

- **"Missing Supabase env vars"**: Ensure `.env` exists and has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Auth not persisting**: Check that Supabase Auth is configured and email confirmation is set up if required.
- **RLS errors**: Confirm migrations are applied and roles exist in `user_roles` for test users.
- **Map not loading**: Ensure Leaflet CSS is loaded and no CORS issues with tile servers.
