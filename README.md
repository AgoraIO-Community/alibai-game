# alibai-ui

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_RRRs9VK28mP9XHXwjmxwup8MqwM7)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

## Interrogate the Agent subsystem

The game now uses account-owned Supabase sessions, eight immutable fixture cases, atomic pool assignment, private case dossiers, verified clue discovery and server scoring. Sign in at `/rules` to request a case; scores appear on a per-user leaderboard. Client-side demo secrets and mock scoring have been removed.

Start with [integrated setup and API documentation](docs/setup.md), then [scenario authoring, validation and pool operations](docs/scenarios.md). [Agora + Anam setup](docs/agora.md) covers the selected `testing` project and managed ARES/gpt-4o-mini/MiniMax pipeline. Copy [`env.example`](env.example) to `.env.local` and keep populated secrets private.

The voice server adapter and browser RTC/audio/avatar path are implemented. Trusted provider-history synchronization is connected; live end-to-end verification remains. Selecting a suggested question only highlights it and never unlocks evidence. See the setup guide for completed checks and environment blockers before deployment.
