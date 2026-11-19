# Google sign-in

Players sign in with Google at `/rules`. The server starts Supabase OAuth with PKCE, exchanges the code at `/auth/callback`, and keeps the session in HttpOnly cookies. The player's Supabase user ID owns their sessions and leaderboard scores.

The [README](../README.md#2-set-up-supabase) has the setup steps for a hosted and a local Supabase project. In short:

| Where | What to set |
| --- | --- |
| Google Cloud OAuth client (Web application) | Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`, or `http://127.0.0.1:54321/auth/v1/callback` for local Supabase |
| Supabase → Authentication → Sign In / Providers → Google | Your Google client ID and secret. Locally, these go in the root `.env` and `[auth.external.google]` in `supabase/config.toml` |
| Supabase → Authentication → URL Configuration | Site URL: your app's origin. Redirect URLs: `<your-origin>/auth/callback` for each origin you use |
| `.env.local` | `APP_ORIGIN` set to the exact origin, including scheme and port |

If Google sends you to `localhost` from a deployed site, the Supabase Site URL or Redirect URLs are wrong. The app only follows the redirect Supabase gives it.

The Google client secret belongs in Supabase, never in a `NEXT_PUBLIC_` variable.
