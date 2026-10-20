# Installation and operations

Use this guide to run Personal Workspace locally, connect your own storage, or deploy a private single-owner workspace. The app interface remains Korean. See the [English README](../README.md) or [한국어 README](../README.ko.md) for the screens and daily workflow.

## Requirements

| Requirement | When it is needed |
| --- | --- |
| Node.js 22.13.0 or newer | Installing, developing, building, and running the app or notification script |
| npm | Installing the versions recorded in `package-lock.json` |
| Git | Cloning the repository and managing source changes |
| A POSIX shell on macOS, Linux, or Windows with WSL | Running the documented commands, including scripts that set environment variables inline |
| A modern browser | Using the app; notification support varies by browser and platform |
| A writable local filesystem | Local JSON records and local image uploads |
| Your own Supabase project | Optional for local use; required for durable records on an ephemeral or serverless host |
| HTTPS and a stable application origin | Internet-facing production use and browser push notifications |
| Your own VAPID key pair and scheduler | Optional routine push notifications |

This app needs a server runtime. It is not a static export or a site that can be hosted directly on GitHub Pages.

## How to start locally

### 1. Install the application

```sh
git clone https://github.com/dpwld/personal-workspace.git
cd personal-workspace
node --version
npm ci
```

`npm ci` installs the lockfile’s dependency versions. If your Node.js version is older than the requirement above, update Node.js before installing.

### 2. Start the development server

```sh
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). No environment file or external account is required for the basic local workflow.

The development command binds to `127.0.0.1`. Unlocked development access is limited to loopback. To expose an instance to another device or the internet, configure authentication and the application origin first.

If the port is occupied:

```sh
npm run dev -- --port 3001
```

Open the port shown by the server. If you configured `APP_ORIGIN`, update it to match the address you actually use.

### 3. Save your first record

Open **할 일**, add a task, and reload. The task should remain. Then open **오늘** to see it in the daily view.

Without Supabase variables, records are saved in `.data/dev.json`. The directory is created when needed and is ignored by Git. Run one app process against the file. JSON storage is intended for local use or a single process on a persistent disk.

## How to try fictional demo data

```sh
npm run demo:seed
npm run demo:dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). The demo uses `.data/demo.json`, not `.data/dev.json`, and is restricted to development.

Treat the demo as disposable sample data. Do not enter records you intend to keep there. Stop the demo server and run `npm run dev` to use your ordinary workspace.

Seeding refuses to overwrite an existing demo file. To start again, stop the demo server and run:

```sh
npm run demo:clean
npm run demo:seed
npm run demo:dev
```

`demo:clean` removes only `.data/demo.json`; it does not erase your ordinary workspace or uploaded files. The demo commands use the fixed `.data` directory, including when your regular workspace has a custom `WORKSPACE_DATA_DIR`.

## Environment reference

Create a local environment file when you need authentication or an integration:

```sh
cp .env.example .env.local
```

Keep `.env.local` out of Git. For a hosted application, enter values through your hosting service’s environment settings. Restart development after changing values; changes to `NEXT_PUBLIC_` variables require a new production build.

| Variable | Required | Meaning |
| --- | --- | --- |
| `PASSCODE` | Production; optional for loopback development | Shared workspace passcode, at least 16 characters. Use a long random value. It also protects the integrity of sessions. |
| `APP_ORIGIN` | Production | Exact externally visible origin, including scheme and any non-default port; for example, `https://workspace.example.com`. Do not include a trailing slash, path, query, or fragment. |
| `SUPABASE_URL` | When using Supabase | Project URL. Must be configured together with `SUPABASE_SERVICE_KEY`. |
| `SUPABASE_SERVICE_KEY` | When using Supabase | Server-only service key for database and Storage access. Never put this in browser code or a `NEXT_PUBLIC_` variable. |
| `WORKSPACE_DATA_DIR` | Optional | Local filesystem directory, default `.data`. Use a persistent absolute path for a self-hosted instance whose source directory changes between releases. Also stores the notification sender’s runtime state. |
| `OG_ALLOWED_ORIGINS` | Optional | Comma-separated exact HTTPS origins allowed for link-preview fetches. Empty means preview fetching is disabled. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser push subscriptions and notification sender | Public VAPID key embedded in the browser bundle and read by `scripts/push-routines.mjs`. Set the same value in both environments. |
| `VAPID_PRIVATE_KEY` | Notification sender | Private VAPID key. Keep it in the scheduler’s secret environment, never in the browser. |
| `VAPID_SUBJECT` | Notification sender | Your own contact identifier, such as `mailto:you@example.com`. |

Configure both Supabase variables or neither. A partial configuration is an error, not a way to choose local mode.

If you place `WORKSPACE_DATA_DIR` inside the repository but outside `.data/`, add that directory to your local Git exclusions before storing records there. Only the default data directory is ignored automatically.

The example domains and contact address in this guide are placeholders. Replace them with your own values. Do not copy credentials from another installation.

## How to configure authentication

The app uses a shared passcode and a signed session cookie. There are no user accounts, email login, or password-reset messages.

1. Generate a random passcode:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ```

2. Save the output as `PASSCODE` in `.env.local` or the host’s secret settings.
3. Set `APP_ORIGIN` to the exact origin you will visit.
4. Restart the application and open it in a private browser window.
5. Confirm that a protected page leads to the unlock screen and that your passcode opens the workspace.

For a local development instance with authentication, the origin can be `http://127.0.0.1:3000`. For a public deployment, use the final HTTPS origin.

Sessions expire after seven days. Changing `PASSCODE` invalidates existing sessions, so every device must unlock again. Keep the passcode somewhere you can retrieve it; recovery means changing the server configuration.

Use the same origin consistently. `localhost`, `127.0.0.1`, a preview hostname, and a custom domain are different origins. The production app checks the configured origin for browser writes.

This protects access to one workspace. It does not isolate one passcode holder’s records from another’s, and it does not encrypt records on disk or in the database.

## How to use your own Supabase project

Use Supabase for a durable hosted database, particularly when the app runs on serverless infrastructure. You need a project you control and its server service key.

### 1. Apply the database schema

Open your project’s SQL editor and run the contents of [`supabase/schema.sql`](../supabase/schema.sql).

The schema creates:

| Table | Contents |
| --- | --- |
| `checkins` | Priority, gratitude, learning, and mood keyed by date |
| `work_logs` | Work duration, project, and note |
| `routines` | Routine definitions |
| `routine_checks` | Per-date completion of a routine |
| `items` | Collection records and push subscriptions, distinguished by `kind` |
| `docs` | Goal board and schedule configuration documents |

Row-level security is enabled. The app accesses these tables from the server with its service key. Do not add broad anonymous policies to make the app work; the browser is not intended to query these tables directly.

The script is the schema for a fresh installation, not an automatic migration system for an unrelated existing database.

### 2. Configure the app server

Set these two values:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-server-service-key
```

The example key is not a working credential. Use your own project’s key, then restart the app.

Adding these variables switches storage to Supabase. Existing local JSON records stay in `.data/dev.json`; they are not imported or merged. A newly connected database will be empty.

### 3. Configure private image storage

Create a Supabase Storage bucket named **`workspace-uploads`** and leave public access disabled.

The app uploads images from the server and serves them through an authenticated `/api/media/…` route. Do not make the bucket public or replace these URLs with public Storage URLs.

Uploads accept PNG, JPEG, GIF, and WebP images up to 10 MB. The declared image type must match the file contents. SVG and arbitrary file attachments are not accepted.

If you do not use image attachments, you can set up the bucket later. Regular text records use the database tables.

### 4. Verify the connection

Create a uniquely named test note, reload the page, and find it in the `items` table in your own project. Upload a test image and confirm it remains visible after reloading. In a private browser window that has not unlocked the app, confirm that its media URL does not return the image.

Remove your test records when finished. A successful local build alone does not verify your provider credentials, schema, bucket configuration, or live deployment.

## How to deploy the app

### Choose storage first

| Deployment model | Storage choice | Operational requirement |
| --- | --- | --- |
| One Node.js process on your own machine or server | Local JSON or Supabase | Preserve the writable data directory across restarts and releases. |
| Serverless Next.js host | Supabase and private Storage | Do not rely on local files surviving invocations or deployments. |
| More than one app instance | Supabase and private Storage | All instances must use the same database and authentication configuration. |

Provider plans, limits, and billing are separate from this project. Use your host’s current Next.js deployment instructions when configuring its build and runtime.

### Build and run on a persistent server

1. Install dependencies with `npm ci`.
2. Configure `PASSCODE` and `APP_ORIGIN`, plus any optional storage variables.
3. Build and start:

   ```sh
   npm run build
   npm start
   ```

4. Put the app behind HTTPS at the configured origin.
5. Use a process manager or your hosting platform to restart it after reboots.
6. Preserve and back up `.data/` if using local storage.

`npm start` is a production command. A missing or weak passcode must be fixed in configuration; the loopback development exception does not make production unlocked.

### Deploy on a hosted Next.js service

1. Connect your own fork or repository through the host’s normal import flow.
2. Select a supported Node.js version meeting the project requirement.
3. Use `npm ci` for installation and `npm run build` for the build.
4. Set `PASSCODE`, `APP_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY`.
5. Apply the schema and create the private upload bucket.
6. Deploy, then test unlock, saving, reloading, and image access on the actual deployed origin.

For preview deployments, configure the preview’s own exact origin and use a separate test database if you do not want preview activity to change your real records.

Do not upload `.env.local`, `.data/`, backups, or real personal screenshots as deployment artifacts.

## How to enable routine notifications

Notifications are optional. The app can save and display routines without them.

The browser subscribes to push messages, but a separate process decides when to send them. This sender currently reads routines, checks, and subscriptions from Supabase.

### 1. Generate your VAPID keys

From the project directory after `npm ci`:

```sh
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Set:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the generated public key in both the app and sender environments.
- `VAPID_PRIVATE_KEY` to the generated private key in the sender environment.
- `VAPID_SUBJECT` to your own contact identifier.
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in the sender environment.

Keep the private key secret. Rebuild a deployed app after changing the public browser key. Rotating VAPID keys requires devices to subscribe again.

### 2. Subscribe in the browser

Open the app in a browser that supports web push, unlock it, and enable notifications on the routines screen. Grant permission when the browser asks.

For iOS, use a supported version and open the web app from the Home Screen. Notification support and delivery remain subject to browser and operating-system behavior.

### 3. Check the sender without delivering

```sh
node --env-file=.env.local scripts/push-routines.mjs --dry
```

The dry run reads the real configured Supabase project and reports eligible notifications without sending them. No result may simply mean that no routine is due in the current window or no browser is subscribed.

### 4. Schedule delivery

Run this command every five minutes using a scheduler you control:

```sh
node --env-file=.env.local scripts/push-routines.mjs
```

Use absolute paths for the Node executable, repository, and environment file in a scheduled job, or provide the variables directly through its secret settings.

The script uses **Asia/Seoul** time, sends for the current five-minute window, and skips routines already checked off. It tracks sends in `push-sent.json` inside `WORKSPACE_DATA_DIR` (default `.data`); keep that file on persistent storage and use one sender process. It is not a distributed job queue, and it does not catch up every missed notification after the worker has been offline.

The repository does not install cron, launchd, or a hosted scheduler for you. A serverless web deployment does not automatically run this script.

## How to configure link previews

Link-preview fetching is off by default. To enable it for selected websites, set a comma-separated list of exact HTTPS origins:

```dotenv
OG_ALLOWED_ORIGINS=https://example.com,https://www.example.org
```

Replace the examples with sites you want to allow. An origin contains the scheme, hostname, and optional port, not a page path. A subdomain is a different origin. Redirects are not followed, so a URL that redirects to another address may not produce a preview.

The app sends the saved URL to that website when fetching metadata. You can continue saving links and manual notes with this setting empty.

Book-cover lookup is separate: it uses public Google Books and Open Library endpoints without a configured key. A network error, quota limit, or missing match can leave a book without a cover.

## How to back up and restore

### Local storage

Stop the app before copying the complete `.data/` directory, or your configured `WORKSPACE_DATA_DIR`, to a private backup location. Keep a dated copy and the application version that created it.

Ordinary local records are in `dev.json`, with images in `uploads/` beneath that directory. Back up the whole directory so records and image files stay together. `demo.json` is sample data; `push-sent.json` is notification runtime state. Demo uploads are isolated in `demo/uploads/`. Keep `.env.local` separately in a secure location if you need to restore configuration.

To restore, stop the app, preserve the current directory as a separate copy, restore the backup into `.data/`, and restart. Check several records and attachments before resuming normal use. Do not edit the JSON while the app is writing to it.

### Supabase

Back up the six application tables and the objects in `workspace-uploads` using the facilities available for your project. A database backup does not by itself guarantee that uploaded Storage objects are included.

Keep object names intact: records reference uploaded images by their media paths. Restore into a test project and verify records and images before replacing a live dataset.

Changing storage modes does not transfer data. There is no built-in import, export, or local-to-Supabase migration command.

## How to verify a change

Run the repository checks:

```sh
npm test
npm run typecheck
npm run build
npm run test:integration
```

Run `test:integration` after building. It starts a production server on `127.0.0.1:4318`, supplies a generated passcode, and uses a temporary local dataset under `.qa/`. It checks local app routes, authentication, input handling, persistence, and uploads without calling live external APIs. Set `TEST_PORT` if that port is occupied.

Then test the affected screen in the browser. For a new installation, a useful smoke check is:

1. Add, edit, reload, and remove a task.
2. Add a routine and check it for a date.
3. Save a daily priority and a work log; confirm the record appears in History.
4. Save a note or diary entry and reload.
5. If images are configured, upload an image and verify authenticated access.
6. If deployed, open a private browser window and verify the unlock boundary.

Automated checks do not replace verification of your own database, notification provider, device, or deployed environment.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Dependency installation fails | Check `node --version`, use the repository root, and install with `npm ci`. |
| Port 3000 is in use | Stop the other server or use `npm run dev -- --port 3001`. Match `APP_ORIGIN` if configured. |
| A non-local development URL is refused | Configure authentication and an explicit origin before exposing development beyond loopback. |
| Production refuses to open | Set a passcode of at least 16 characters and the exact `APP_ORIGIN`; restart or redeploy. |
| Unlock works but writes fail | Verify the browser URL matches `APP_ORIGIN`, including scheme, hostname, and port. |
| Records disappear after deployment | Use Supabase on ephemeral hosts. For local files, preserve `.data/` and run one app instance. |
| Local records disappear after adding Supabase | Storage has switched to the database. Local records are still in their JSON file; there is no automatic import. |
| Supabase records cannot be saved or loaded | Check both variables, the server key, project availability, and the applied schema. Do not expose tables anonymously as a workaround. |
| Images fail to upload | Use PNG, JPEG, GIF, or WebP up to 10 MB with matching file content; check local write permissions or the private `workspace-uploads` bucket. |
| A book has no cover | The public lookup may have no match or be unavailable. Keep the book record and try a more precise title or author later. |
| Link preview is blank | Confirm the exact HTTPS origin is allowed and the URL does not require a redirect; some pages have no usable metadata. |
| Notification button is unavailable | Check browser support, secure context, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; rebuild after changing it. |
| Notifications are enabled but never arrive | Check the scheduler, sender variables, Supabase subscription, Seoul routine time, current five-minute window, and device settings. |
| A record appears on an unexpected date | The application’s day boundary uses Asia/Seoul. There is no per-user time-zone setting. |

For a bug report, include the route, reproduction steps, storage mode, Node.js version, and relevant error with secrets removed. See [CONTRIBUTING.md](../CONTRIBUTING.md).
