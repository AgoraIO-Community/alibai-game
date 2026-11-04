# Google sign-in

Players use Continue with Google at `/rules`. The server starts Supabase OAuth with PKCE, exchanges the callback code at `/auth/callback`, and stores the resulting session in the existing HttpOnly Alibai cookies. OAuth transport cookies are cleared afterward. The player's Supabase user ID remains the owner of sessions and leaderboard scores.

Enable Google in Supabase Authentication > Providers with a Google OAuth web client ID and secret. These credentials belong in the Supabase provider settings, not public Next.js variables.

Google Cloud authorized redirect URI:

```
https://vfqxxkvokbgrooxhkdmi.supabase.co/auth/v1/callback
```

Set `APP_ORIGIN` to the app's actual origin. Add `http://localhost:3000/auth/callback` and the deployed app's `/auth/callback` URL to Supabase Authentication > URL Configuration > Redirect URLs. Set the Site URL to the deployed origin. Match hostname and port exactly when testing locally.

Run `pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm build -- --webpack`, then test Google consent, successful callback, cancellation, logout, and returning-player history. These OAuth changes have not completed live verification: the agent environment could not reach the package registry or bind a local server port. Earlier passing build/tests predate this OAuth change.
