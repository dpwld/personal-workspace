# Contributing to Personal Workspace

Personal Workspace keeps daily execution, growth records, and a personal library in one Korean-language interface. Contributions should make those workflows easier to use and maintain while preserving the existing design.

Start with the [README](README.md), [한국어 README](README.ko.md), and [installation guide](docs/INSTALLATION.md). The repository’s [AGENTS.md](AGENTS.md) also applies when using a coding agent.

## Scope

Useful contributions include reproducible bug fixes, accessibility improvements, clear documentation, focused tests, and small improvements to existing flows.

For a substantial feature, open an issue describing the user problem and proposed behavior before investing in a large implementation. Explain which existing screen it belongs to and how a person would verify the improvement.

The current product is a single-owner workspace. Adding teams, user accounts, a new cloud provider, or a new navigation area changes its scope. Wiki, job-tracking, and portfolio pages are not part of this extraction.

The interface is intentionally Korean. English documentation does not imply that there is an English UI. A translation effort should address labels, dates, sorting, accessibility text, and tests together rather than translating isolated buttons.

## Local development

Use Node.js 22.13.0 or newer and npm. Commands assume a POSIX shell on macOS, Linux, or Windows with WSL.

```sh
git clone https://github.com/dpwld/personal-workspace.git
cd personal-workspace
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The core app runs without external credentials and saves local data under `.data/`.

For screenshots and exploratory testing with fictional records:

```sh
npm run demo:seed
npm run demo:dev
```

The demo runs on [http://127.0.0.1:4317](http://127.0.0.1:4317) and uses a separate `.data/demo.json`. Do not use your real daily records to create reproduction fixtures.

Use a separate Supabase project when testing cloud behavior. Tests and previews should never point at someone else’s workspace or a live dataset without explicit authorization.

## Understand the relevant code

| Area | Starting point |
| --- | --- |
| A screen or daily interaction | Its directory under `app/` and corresponding client component |
| Shared navigation | `components/sidebar.tsx`, `components/quick-nav.tsx` |
| Visual styles | `app/ds/`, `app/globals.css` |
| Text editing and attachments | `components/memo-editor.tsx`, `components/memo-view.tsx`, upload and media API routes |
| Data persistence | `lib/store.ts`, `lib/types.ts`, `supabase/schema.sql` |
| Collection fields and grouping | `lib/collections.ts` and the page client |
| Date and routine behavior | `lib/types.ts`, `lib/routine-schedule.mjs`, `lib/korean-holidays.mjs` |
| Notifications | `components/push-toggle.tsx`, `public/sw.js`, `scripts/push-routines.mjs` |

This project uses the installed Next.js version’s conventions. Before changing framework APIs or configuration, read the relevant documentation under `node_modules/next/dist/docs/`; do not assume an older example still applies.

## Make focused changes

1. Describe the current behavior, intended behavior, and how to verify the difference.
2. Make the smallest change that solves that problem.
3. Keep adjacent formatting, unrelated refactors, and dependency upgrades out of the same change.
4. Follow the style of the file you are editing.
5. Update documentation when commands, configuration, storage, or visible behavior changes.

Keep the app’s existing visual language: shared tokens, card styles, navigation patterns, drawers, and light/dark themes. Check desktop and mobile layouts for UI changes. Use meaningful labels, keyboard access, and visible focus states for interactive elements.

Update both README languages when changing information they share. Keep their setup requirements and limitations equivalent.

## Data and configuration changes

The local and Supabase backends should represent the same user-facing behavior. If you change a data shape, explain how existing records are handled and update the fresh-install schema when necessary.

Preserve these boundaries:

- Supabase service keys and VAPID private keys stay on the server.
- Image attachments stay behind authenticated media access.
- The production passcode and origin requirements remain explicit.
- Optional integrations stay optional for basic local use.
- Demo fixtures remain fictional and separate from normal data.
- Dates and routine selection remain consistent with Asia/Seoul unless the change explicitly addresses time-zone support.

Do not add committed `.env.local` files, `.data/` records, credentials, private backups, browser profiles, or personal screenshots. If an environment variable is introduced, add a safe placeholder and explanation to `.env.example` and the installation guide.

## Verification

Run:

```sh
npm test
npm run typecheck
npm run build
npm run test:integration
```

The integration check uses the completed build, a generated passcode, and a disposable dataset under `.qa/`. It starts its own loopback server on port 4318 (`TEST_PORT` can override it) and does not exercise live provider integrations.

For a behavioral bug, add a focused regression test when it can meaningfully capture the failure. Avoid tests that only repeat implementation details or require real personal data.

Also verify the affected workflow in the browser. Save and reload to check persistence; do not rely only on an optimistic UI update. For visual changes, check a narrow mobile viewport, desktop, both themes, and keyboard navigation.

For authentication, uploads, or storage changes, verify both allowed and rejected requests. If the change requires Supabase or push delivery and you have not exercised that integration, state that clearly in the pull request.

Describe checks you actually ran and their results. Do not label a live deployment, provider integration, or browser platform verified solely because a unit test or production build passed.

## Pull requests

Use a title that names the user-visible fix or change. A useful description includes:

- The concrete problem and resulting behavior.
- The main implementation choice, if a reviewer needs it to assess the change.
- Commands and manual checks run, with results.
- Screenshots for a visual change, using fictional data.
- Any remaining limitation or migration step.

Keep one coherent change per pull request. If generated assets or lockfiles change, explain why they belong with the work.

## Reporting bugs

Include:

- The screen or route.
- Reproduction steps from a clean or fictional dataset.
- Expected and actual results.
- Browser, Node.js version, and local JSON or Supabase storage mode.
- A relevant error message or screenshot with credentials and personal content removed.

Never paste a passcode, session cookie, Supabase service key, VAPID private key, or database dump into an issue. If a report could expose someone’s records, describe the impact without posting credentials or a working exploit against their deployment.

## License

The project has not yet selected a license or a contributor agreement. Do not assume MIT or another license applies. Third-party dependencies and assets retain their own license terms. Resolve the project’s licensing terms with the maintainer before relying on permission to redistribute or incorporate its code.
