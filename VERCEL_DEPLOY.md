# Deploying to Vercel

Yes, you can absolutely deploy this to Vercel!

However, because Vercel is "serverless" and doesn't host persistent containers like Docker does, **you cannot run your local PostgreSQL container on Vercel.**

You need a **Cloud Database**.

## Step 1: Get a Cloud Database (Free Options)

You have three excellent free-tier options that work perfectly with Vercel:

1.  **Vercel Postgres** (Easiest integration)
    -   Go to [vercel.com](https://vercel.com) -> Storage -> Create Database -> Postgres.
2.  **Neon.tech** (Serverless Postgres)
    -   Go to [neon.tech](https://neon.tech), create a project.
3.  **Supabase** (Managed Postgres)
    -   Go to [supabase.com](https://supabase.com), create a project.

**Goal:** Get the `DATABASE_URL` (connection string) from one of these providers. It usually looks like `postgres://user:password@host:port/dbname`.

## Step 2: Push Your Code to GitHub

1.  Commit your changes:
    ```bash
    git add .
    git commit -m "Ready for deployment"
    ```
2.  Push to GitHub.

## Step 3: Deploy on Vercel

1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your `personal-budget-app` repository.
4.  **Environment Variables**:
    -   Add `DATABASE_URL`: The connection string from Step 1.
    -   Add `NEXTAUTH_SECRET`: Generate a random string (run `openssl rand -base64 32` in terminal or just mash your keyboard).
    -   Add `NEXTAUTH_URL`: You can skip this on Vercel (it defaults automatically), or set it to your deployment domain (e.g., `https://my-budget-app.vercel.app`) _after_ first deployment.
5.  Click **"Deploy"**.

## Step 4: Run Migrations (Two Options)

### Option A: Manual (Recommended for Safety)

Run this from your local machine to push the schema:

1.  Create a `.env.production` file locally (do NOT commit this).
2.  Add your _cloud_ `DATABASE_URL`.
3.  Run:
    ```bash
    npx dotenv -e .env.production -- npx prisma migrate deploy
    ```

### Option B: Automatic (Convenient)

If you want Vercel to run migrations **automatically** on every deploy:

1.  In Vercel Dashboard -> Settings -> General.
2.  Find **Build & Development Settings**.
3.  Override **Build Command** to:
    ```bash
    npm run build:prod
    ```
    _(This runs `prisma migrate deploy && next build`)_.

## Step 5: Done!

Your app will be live at `https://your-project.vercel.app`.
