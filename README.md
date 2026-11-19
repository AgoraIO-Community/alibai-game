# Alibai

A voice detective game. You get a case file and one suspect, then question them out loud for three minutes. The suspect is a live AI avatar. When time's up, you call guilty or innocent and cite the evidence that convinced you.

**Play it: [alibai-game.vercel.app](https://alibai-game.vercel.app/)** (Google account and microphone needed)

![Alibai](docs/assets/alibai-card.webp)

## How to play

1. Read the case file. The clock hasn't started yet.
2. Question the suspect. Your three minutes start once you can see and hear them.
3. Watch the notebook. Evidence unlocks as the suspect lets facts slip.
4. File your verdict and cite your evidence. You get one shot.

Lying doesn't make someone guilty. Innocent suspects hide things too.

| Scoring | Points |
| --- | ---: |
| Right verdict | 500 |
| Pivotal evidence cited | 300 |
| Facts uncovered | 150 |
| Time left | 50 |

## How it's built

The suspect is an [Agora Conversational AI](https://www.agora.io/en/products/conversational-ai-engine/) agent: ARES speech-to-text, `gpt-4o-mini`, a MiniMax voice, and an [Anam](https://anam.ai) avatar for the face. Captions come over Agora RTM.

The AI only plays the part. Each case is written ahead of time and stored in Supabase, and the server decides what the suspect gave away and what you scored. The model can't change who did it, and the browser never sees the answer.

The app is Next.js 16 on Vercel. [docs/ai/RECIPE.md](docs/ai/RECIPE.md) walks through how a game runs, file by file.

## Run your own

### You'll need

| Account | For |
| --- | --- |
| [Agora](https://console.agora.io) | The voice agent. Create a project with an App Certificate, then turn on **Conversational AI** and **RTM** for it. |
| [Anam](https://anam.ai) | The avatar video. You need an API key. |
| [Supabase](https://supabase.com) | Database and sign-in. A free project works, or run it locally with Docker. |
| [Google Cloud](https://console.cloud.google.com) | Sign-in. You need an OAuth client of type **Web application**. |

And on your machine: Node 22+, [pnpm](https://pnpm.io), and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

### 1. Install

```sh
git clone https://github.com/AgoraIO-Community/alibai-game.git
cd alibai-game
pnpm install
cp env.example .env.local
```

### 2. Set up Supabase

Pick one.

**A hosted project**

1. Create a project at [supabase.com](https://supabase.com).
2. Load the tables and cases:

   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>
   pnpm data:setup
   ```

3. In **Authentication → Sign In / Providers**, turn on **Google** and paste your Google client ID and secret.
4. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` to the Redirect URLs.
5. In your Google OAuth client, add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
6. In **Project Settings → JWT Keys**, check that the current signing key is ECC (P-256). New projects use one already. If yours still uses the legacy JWT secret, rotate to an ECC key, because the app only accepts ES256 tokens.

**Local, with Docker**

1. Create a signing key. The app only accepts ES256 tokens, and the local stack doesn't make one by default:

   ```sh
   echo '[]' > supabase/signing_keys.json
   supabase gen signing-key --algorithm ES256 --append
   ```

2. Add your Google credentials to a `.env` file in the project root (it's gitignored):

   ```sh
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<your-client-id>
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

3. In `supabase/config.toml`, set `enabled = true` under `[auth.external.google]`.
4. In your Google OAuth client, add `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI.
5. Start Supabase and load the tables and cases:

   ```sh
   supabase start
   pnpm data:setup:local
   ```

### 3. Fill in `.env.local`

| Variable | Where to find it |
| --- | --- |
| `APP_ORIGIN` | `http://localhost:3000` for local development, or your deployed URL. It must match exactly. |
| `NEXT_PUBLIC_SUPABASE_URL` | Hosted: **Project Settings → Data API**. Local: `http://127.0.0.1:54321`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosted: **Project Settings → API Keys**. Local: run `supabase status`. |
| `SUPABASE_SECRET_KEY` | Same place as the publishable key. Keep it server-side. |
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora Console → your project. |
| `NEXT_AGORA_APP_CERTIFICATE` | Agora Console → your project. Keep it server-side. |
| `ANAM_API_KEY` | Your Anam account. Keep it server-side. |

If you use the [Agora CLI](https://github.com/AgoraIO/cli), it can fill in the two Agora values:

```sh
agora login
agora project env write .env.local --project <your-project> --template nextjs --append
```

Leave the other variables in `env.example` as they are. They're only for generating new cases.

### 4. Start it

```sh
pnpm dev
```

Open [localhost:3000](http://localhost:3000), sign in with Google and start a case.

In a second terminal, run `pnpm agents:cleanup:watch`. It stops agents left running when someone closes a tab. They stop on their own after five minutes anyway, but this is quicker.

## Deploy

1. Import the repo into [Vercel](https://vercel.com).
2. Add the seven variables from step 3, with `APP_ORIGIN` set to your Vercel URL.
3. In Supabase, add `https://<your-domain>/auth/callback` to the Redirect URLs and set the Site URL to your domain.
4. Set the function region in `vercel.json` to match your Supabase region. It's `pdx1` (Oregon) now.

The cleanup worker needs a host that stays running, such as a small VM. Vercel functions don't stay up.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the app locally |
| `pnpm build --webpack` | Production build |
| `pnpm test` | Unit tests |
| `pnpm typecheck` / `pnpm lint` | Type checks and lint |
| `pnpm scenarios:validate` | Checks every case is consistent and solvable |
| `pnpm data:setup` / `pnpm data:setup:local` | Loads tables and cases into Supabase |
| `pnpm agents:cleanup:watch` | Stops leftover agents every minute |

## Known limits

- A fact counts only when the suspect says one of its scripted lines. If the AI paraphrases, the clue can be missed.
- A guilty suspect knows what they did, so a persistent player might talk it out of them.
- You can play each case once. There are sixteen.

## More docs

- [docs/ai/RECIPE.md](docs/ai/RECIPE.md): how it works, with troubleshooting
- [docs/agora.md](docs/agora.md): the voice and avatar pipeline
- [docs/writing-cases.md](docs/writing-cases.md): writing your own cases
- [AGENTS.md](AGENTS.md): notes for coding agents working in this repo

## License

MIT. See [LICENSE](LICENSE).
