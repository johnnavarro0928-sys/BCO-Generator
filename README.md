# BCO Generator

React/Vite app for creating Budgetted Course Outlay worksheets, generating lesson content with Gemini, and exporting the result to XLSX.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Gemini API key to `.env.local`.
   You can also add `GEMINI_API_KEY_FALLBACK` if you want the serverless route to fail over to a second key when the first one fails.

## Running locally

The frontend is a Vite app, but lesson generation runs through a Vercel serverless function in `api/generate-lessons.js`.

Use Vercel local development so both the React app and the API route run together:

```bash
vercel dev
```

If you want local env vars from your Vercel project, use:

```bash
vercel env pull
```

## Deploying to Vercel

1. Import this project into Vercel.
2. Set `GEMINI_API_KEY` in the Vercel project environment variables.
3. Optionally set `GEMINI_API_KEY_FALLBACK` for server-side failover to a second permitted Gemini key.
4. Optionally set `GEMINI_MODEL` if you want to override the default `gemini-2.5-flash`.
5. Deploy.

Vercel will build the Vite frontend and serve the Gemini route from the root `api` directory.
