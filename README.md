# Personal Workspace

[한국어](README.ko.md) · [Installation](docs/INSTALLATION.md) · [Contributing](CONTRIBUTING.md)

A personal workspace for daily plans, routines, notes, and the record of what you have done. Start with one priority, log the work, and use the same space to keep your goals, learning, reading, and ideas close at hand.

Personal Workspace is a reusable extraction of Yeji OS. It preserves the original application’s visual language and daily workflow while starting with an empty personal dataset. The interface is intentionally **Korean**; this repository provides English and Korean documentation.

![Today view with fictional demonstration data](docs/images/today.jpg)

## Why use it

- **Keep the day in one view.** See unfinished routines and tasks, choose a priority, record work time, and close the day with gratitude and a short reflection.
- **Connect activity to direction.** Keep a goal board and study records alongside a history of completed work.
- **Keep a personal library.** Save notes, links, books, cultural experiences, travel plans, and content ideas without maintaining separate applications.
- **Start locally without an account or API key.** Records live in a local JSON file. Connect your own Supabase project when you need a hosted database.
- **Make it your own.** The source, collection definitions, design tokens, and goal-board defaults are included.

This is a single-owner application. Everyone who knows a deployed instance’s passcode shares the same workspace; it does not provide separate user accounts, team permissions, or collaboration.

## What is included

The sidebar groups the app into three areas. History belongs to **성장의 방향** (“Growth direction”).

| Area | Screen | What you can do |
| --- | --- | --- |
| Daily execution | 오늘 · Today | Pick a daily priority; check routines and tasks; log minutes by project; record mood, gratitude, and something learned; revisit a date. |
| Daily execution | 루틴 · Routines | Create, edit, and remove routines with a time, color, and description; check them off for a selected date. |
| Daily execution | 할 일 · Tasks | Track deadlines, priorities, categories, and completion; review overdue, today, upcoming, and undated work. |
| Daily execution | 일기장 · Diary | Write dated entries with formatted text and images. |
| Growth direction | 목표판 · Goals | Edit a personal motto, four guiding cards, and a Mandala goal board. |
| Growth direction | 학업 · Study | Organize courses, weekly lesson notes, assignments, and exam deadlines. |
| Growth direction | 기록 · History | Review weekly totals, a 12-week activity heatmap, and four weeks of project time and daily records. |
| Personal library | 스크랩 · Scraps | Save links, keywords, dates, and notes; distinguish saved links from deeper reading. |
| Personal library | 노트 · Notes | Organize notes with PARA categories: Inbox, Project, Area, Resource, and Archive. |
| Personal library | 독서 · Reading | Keep a bookshelf by reading status and genre, with reading notes, quotations, and reviews. |
| Personal library | 문화 · Culture | Record books, performances, films, shows, and other cultural experiences. |
| Personal library | 여행 · Travel | Track places you want to visit, trips being planned, and places visited. |
| Personal library | 콘텐츠 · Content | Keep content ideas, publishing status, channels, and reference accounts. |

The app also includes light and dark themes, a desktop sidebar, mobile navigation, and a page switcher opened with `⌘K` / `Ctrl+K`. The page switcher searches destinations, not the contents of your records.

Wiki, job tracking, and portfolio pages are outside this extraction.

## A typical day

1. Open **오늘** and write the one thing you want to finish.
2. Add a task in **할 일** and a repeating action in **루틴**. Return to Today to check them off as you go.
3. Add work time with a project name and a short note. At the end of the day, record gratitude, mood, and one thing learned.
4. Open **기록** to see your activity accumulate. Use **목표판** and **학업** to decide what to work on next.

![History view with fictional demonstration data](docs/images/history.jpg)

The screenshots use fictional demonstration records. A normal installation starts without personal records.

## Quick start

Use **Node.js 22.13.0 or newer**, npm, and Git. The commands assume a POSIX shell on macOS, Linux, or Windows with WSL.

```sh
git clone https://github.com/dpwld/personal-workspace.git
cd personal-workspace
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Create a task or note, save it, and reload the page to check persistence.

With no environment variables configured, development runs on loopback and stores records in `.data/dev.json`. You do not need Supabase, VAPID keys, or another paid service for the core local workflow. Use one app process against this file.

For optional settings, copy the template and fill in only the features you need:

```sh
cp .env.example .env.local
```

The [installation guide](docs/INSTALLATION.md) covers production authentication, storage, uploads, notifications, backups, and troubleshooting.

### Try the demonstration

```sh
npm run demo:seed
npm run demo:dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). The demo uses fictional records in `.data/demo.json`, separate from `.data/dev.json`. It is a local development mode, not a public demo deployment. Use `npm run dev` to return to your regular workspace. To reseed the sample records, stop the demo and run `npm run demo:clean` before `npm run demo:seed`.

## Choose your setup

| Capability | Local development | Persistent single-server deployment | Hosted or serverless deployment |
| --- | --- | --- | --- |
| Core records | Local JSON; no keys | Local JSON on a persistent writable disk, or your Supabase project | Your Supabase project |
| Authentication | Optional on loopback | `PASSCODE` and `APP_ORIGIN` required | `PASSCODE` and `APP_ORIGIN` required |
| Images | Local private upload storage | Persistent local storage, or Supabase Storage | Private Supabase Storage bucket |
| Book-cover lookup | Internet access; no configured key | Same | Same |
| Link previews | Optional allowed origins | Optional allowed origins | Optional allowed origins |
| Routine push notifications | Optional; needs additional setup | Supabase, VAPID keys, browser permission, and a scheduler | Same, with a separate scheduled worker |

Local files are not suitable for ephemeral serverless filesystems or multiple app instances. The application does not automatically move existing JSON records into Supabase when you add credentials.

## Configuration at a glance

See [`.env.example`](.env.example) for the configuration template and the [full reference](docs/INSTALLATION.md#environment-reference) for details.

| Variable | Purpose |
| --- | --- |
| `PASSCODE` | Shared workspace passcode; at least 16 characters when configured. Required in production. |
| `APP_ORIGIN` | Exact browser-facing origin, such as `https://workspace.example.com`. Required in production. |
| `SUPABASE_URL` | URL of your own Supabase project. Configure together with the service key. |
| `SUPABASE_SERVICE_KEY` | Server-only Supabase service key. Never expose it with a `NEXT_PUBLIC_` prefix. |
| `WORKSPACE_DATA_DIR` | Optional persistent local data directory; defaults to `.data`. |
| `OG_ALLOWED_ORIGINS` | Optional comma-separated HTTPS origins allowed for server-side link previews. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional public key used by the browser and notification sender. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional private key and sender contact for the routine notification script. |

Production uses a signed, expiring session cookie after passcode entry. Changing `PASSCODE` invalidates existing sessions. This gate protects a shared workspace; it is not a multi-user authentication system.

### Optional integrations

**Supabase.** Apply [`supabase/schema.sql`](supabase/schema.sql) to your own project, configure the two server variables, and create the private `workspace-uploads` bucket for images. Database access goes through the app server; the browser does not receive the service key. See [Supabase setup](docs/INSTALLATION.md#how-to-use-your-own-supabase-project).

**Book covers.** The reading screen looks up covers through Google Books and falls back to Open Library. It sends the entered book title and author to those services. Their availability, coverage, and public quotas affect results; a missing cover does not prevent keeping a reading record.

**Link previews.** Preview fetching is disabled unless you configure `OG_ALLOWED_ORIGINS`. Allowed entries are exact HTTPS origins, and redirects are not followed. Saving links and writing notes does not require enabling previews.

**Push notifications.** Browser permission alone is not enough: you need your own VAPID keys, Supabase-backed subscriptions, and a scheduler for [`scripts/push-routines.mjs`](scripts/push-routines.mjs). The repository does not provision a scheduler. See [notification setup](docs/INSTALLATION.md#how-to-enable-routine-notifications).

## Development

The app uses Next.js App Router, React, TypeScript, Tailwind CSS, Lucide icons, and a shared storage layer. Exact dependency versions are in [`package.json`](package.json) and [`package-lock.json`](package-lock.json).

```sh
npm run dev
npm test
npm run typecheck
npm run build
npm run test:integration
```

The integration command starts a production server on loopback using disposable local data. Run it after a successful build; it does not verify live Supabase or push delivery.

`npm start` serves a completed production build. Set production configuration before using it; the unlocked local-development behavior does not apply to production.

| Location | Responsibility |
| --- | --- |
| `app/` | Pages, layouts, and server API routes |
| `app/ds/` | Shared visual styles and design tokens |
| `components/` | Navigation, editors, drawers, collections, and shared UI |
| `lib/store.ts` | Local JSON and Supabase persistence |
| `lib/types.ts` | Core records and Seoul-date helpers |
| `lib/collections.ts` | Collection labels, fields, and grouping |
| `lib/plan.ts` | Editable, generic goal-board defaults |
| `lib/routine-schedule.mjs` | Date-specific routine selection |
| `supabase/schema.sql` | Tables and database access policy setup |
| `scripts/` | Demonstration setup and optional notification worker |
| `tests/` | Automated checks |
| `.data/` | Ignored local records and runtime files |

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the app. In particular, use the Next.js documentation bundled with the installed version when modifying framework behavior.

## Customize it

- Change the app name and description in `app/layout.tsx`, `app/manifest.ts`, and `components/sidebar.tsx`.
- Adjust colors, spacing, and themes in `app/ds/` and `app/globals.css`.
- Replace the generic sprout mascot in `public/avatar.png` with your own sidebar image, or remove it to use the initial-based fallback.
- Edit collection fields in `lib/collections.ts` and the corresponding page client.
- Edit your goals in the UI. Change `lib/plan.ts` only when you want to alter the defaults for a new dataset.
- Update sidebar destinations and `components/quick-nav.tsx` together when adding or removing pages.

Dates and routine scheduling use **Asia/Seoul**, and holiday logic uses the bundled Korean holiday data. Changing the application’s locale requires reviewing labels, date helpers, schedule logic, and tests together; there is no language or time-zone setting in the UI.

## Data ownership and limits

Your records live in your filesystem or your Supabase project. `.data/` and environment files are ignored by Git. Back up records and uploaded images together; storing source code on GitHub is not a data backup.

This repository does not include the source workspace’s personal records, credentials, private attachments, or original Git history. Demo data is created explicitly and kept separate from ordinary local data.

There is no built-in account recovery, per-user authorization, automatic cloud synchronization between storage modes, or offline write queue. The service worker supports notifications; it does not make the app a complete offline application.

## Documentation and contributions

- [한국어 README](README.ko.md)
- [Installation and operations](docs/INSTALLATION.md)
- [Contribution guide](CONTRIBUTING.md)
- [Environment template](.env.example)
- [Database schema](supabase/schema.sql)

Bug reports should describe the screen, steps to reproduce, expected result, and actual result. Use fictional records in screenshots and examples.

## License

Licensed under the [MIT License](LICENSE). You may use, modify, and redistribute this project, including commercially, provided you retain the copyright and permission notices. Third-party packages and assets remain subject to their respective licenses.
