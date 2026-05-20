# accounting-firm

Web application for an accounting firm. Monorepo containing a Spring Boot backend and Angular frontend.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.5, PostgreSQL
- Frontend: Angular 21
- Authentication: Google OAuth2

## Development Setup

### 1. PostgreSQL

**Option A — Homebrew (native macOS):**

```bash
# Install
brew install postgresql@16

# Start the service
brew services start postgresql@16

# Create the database
createdb accounting_firm
```

**Option B — Docker:**

```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
# Then run:
docker run -d --name accounting-pg \
  -e POSTGRES_DB=accounting_firm \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

### 2. Environment variables

Create a `.env` file at the project root (already gitignored):

```bash
# Google OAuth2 — from console.cloud.google.com
# Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
# Application type: Web application
# Authorized redirect URI: http://localhost:8080/login/oauth2/code/google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# JWT signing key — any random string, at least 32 characters
JWT_SECRET=change-me-to-a-random-32-char-string

# PostgreSQL
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/accounting_firm
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# File uploads
UPLOAD_DIR=./uploads
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_MAX_FILENAME_LENGTH=100
BLOCKED_EXTENSIONS=exe,js

# Contact form — email address where contact submissions are delivered
CONTACT_NOTIFICATION_EMAIL=you@example.com
```

### 3. Start the backend

```bash
./start.sh
```

`start.sh` loads `.env` automatically, defaults to the `dev` Spring profile, and starts the backend on `localhost:8080`.

### 4. Start the frontend

```bash
cd frontend && npm start
```

The Angular dev server proxies `/api/**`, `/oauth2/**`, and `/login/oauth2/**` to the Spring Boot server at `localhost:8080`.

## Run with Docker Compose (local testing only)

Alternative to the manual setup above — boots Postgres, backend, and frontend in one command on your laptop. **This setup is for local development/testing only; it is not hardened for production** (no HTTPS, default DB credentials, images built locally rather than pulled from a registry). See [Production Deployment](#production-deployment) for the prod path.

**Prerequisites:** Docker Desktop, and a populated `.env` file at the repo root (see [Environment variables](#2-environment-variables)). The `SPRING_DATASOURCE_*` values in `.env` are ignored under Compose — the backend container is wired to the `db` service automatically.

### 1. Build and start everything

```bash
docker compose up --build
```

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:8080`
- Postgres: `localhost:5432` (user `postgres`, password `postgres`, db `accounting_firm`)

Add `-d` to run in the background:

```bash
docker compose up --build -d
```

### 2. Common commands

```bash
# Tail logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild a single service after a code change
docker compose up --build backend

# Stop everything (keeps DB data and uploads)
docker compose down

# Stop everything AND wipe DB + uploads
docker compose down -v

# Open a psql shell against the running DB
docker compose exec db psql -U postgres -d accounting_firm
```

### 3. Notes

- The OAuth2 callback URL is unchanged: `http://localhost:8080/login/oauth2/code/google` (backend port 8080 is published to the host).
- Database data persists in the `db_data` named volume; uploaded files persist in `backend_uploads`. Both survive `docker compose down` and are wiped by `down -v`.
- Flyway migrations run automatically on backend startup.

## Production Deployment

### 1. Create `.env.prod`

Copy `.env` to `.env.prod` (gitignored) and fill in production values. Add the SMTP block for outbound email:

```bash
# ... same keys as .env, with production values ...

# SMTP — Gmail example (requires an App Password, not your regular password)
# Enable 2-Step Verification at myaccount.google.com first, then generate
# an App Password at myaccount.google.com/apppasswords
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=you@gmail.com
SPRING_MAIL_PASSWORD=your-app-password
```

### 2. Start the production backend

```bash
./start_prod.sh
```

`start_prod.sh` requires `.env.prod` to exist (exits with an error if missing), sources it, forces `SPRING_PROFILES_ACTIVE=prod`, and starts the backend.

## Production Docker Deployment

Deploy the prebuilt images from Docker Hub to a production server using `docker-compose.prod.yml`.

**Prerequisites:**
- A Linux server with Docker and the Docker Compose plugin installed
- A Docker Hub account that has pushed `accounting-firm-backend` and `accounting-firm-frontend` images (see [Publishing images](#publishing-images-to-docker-hub) below)
- Google OAuth2 production callback URL registered in Google Cloud Console: `https://your-domain/login/oauth2/code/google`

### 1. Publish images to Docker Hub

Releases are gated by git tags. Pushing a `v*` tag triggers the `.github/workflows/release.yml` workflow, which builds and pushes both images to Docker Hub:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Required GitHub repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | An access token with Read/Write/Delete permissions |

The workflow tags each image with both the version (`1.0.0`) and `latest`.

### 2. Configure the production server

Clone the repo on the server (you only need `docker-compose.prod.yml`, but cloning keeps things consistent):

```bash
git clone git@github.com:gwang-indoc/accounting-firm.git
cd accounting-firm
```

Create `.env.prod` at the repo root (gitignored). In addition to the keys from the local `.env`, this file must define `DOCKERHUB_USERNAME` and `POSTGRES_PASSWORD`. `IMAGE_TAG` is optional — it defaults to `latest`; set it explicitly to pin a specific version (e.g. for rollback):

```bash
# Image source
DOCKERHUB_USERNAME=your-dockerhub-username
# IMAGE_TAG=1.0.0   # uncomment to pin; otherwise defaults to "latest"

# Google OAuth2 — production credentials
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# JWT signing key (at least 32 characters)
JWT_SECRET=...

# Database (db service uses this; the URL is wired automatically in compose)
POSTGRES_PASSWORD=...

# OAuth2 redirect — must use the production HTTPS URL
OAUTH2_REDIRECT_URI=https://your-domain/portal/dashboard
CORS_ALLOWED_ORIGINS=https://your-domain

# Contact form
CONTACT_NOTIFICATION_EMAIL=ops@your-domain

# SMTP — Gmail example (App Password required)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=you@gmail.com
SPRING_MAIL_PASSWORD=your-app-password

# File uploads
UPLOAD_MAX_FILE_SIZE_MB=10
UPLOAD_MAX_FILENAME_LENGTH=100
BLOCKED_EXTENSIONS=exe,js
```

### 3. Pull and start

```bash
# Log in once so Docker can pull from private Docker Hub repos
docker login -u "$DOCKERHUB_USERNAME"

# Pull the tagged images and start everything in the background
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

### 4. Deploy a new release

If you're tracking `latest` (the default), just pull and restart:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

To pin or roll back to a specific version, set `IMAGE_TAG` in `.env.prod` (e.g. `IMAGE_TAG=1.0.1`) and run the same two commands.

Docker recreates only the containers whose image changed. Flyway runs any new DB migrations automatically on backend startup.

### 5. Things to wire up before going live

- **HTTPS** — put Caddy, Traefik, or nginx (with Let's Encrypt) in front of port 80, or terminate TLS at a managed load balancer (AWS ALB, Cloudflare Tunnel). The Spring `app.cookie.secure` flag must be `true` once HTTPS is live, or the JWT cookie won't be sent.
- **Update Google OAuth callback** — register the production URL `https://your-domain/login/oauth2/code/google` in the Google Cloud Console.
- **Database backups** — `db_data` is a Docker named volume. Back it up with `pg_dump` on a schedule (`docker compose exec db pg_dump -U postgres accounting_firm > backup.sql`), not by copying the volume directory.
- **Make Docker Hub repos private** — `<username>/accounting-firm-backend` and `-frontend` → Settings → Visibility: Private. Otherwise anyone can pull your image.

## Backend Commands

```bash
# Run the application (loads .env automatically)
./start.sh

# Build (skip tests)
cd backend && ./mvnw clean package -DskipTests

# Run all tests
cd backend && ./mvnw test

# Run a single test class
cd backend && ./mvnw test -Dtest=MyServiceTest

# Run a single test method
cd backend && ./mvnw test -Dtest=MyServiceTest#methodName
```

## Frontend Commands

```bash
# Install dependencies
cd frontend && npm install

# Start dev server (http://localhost:4200)
cd frontend && npm start

# Build for production
cd frontend && npm run build

# Run tests
cd frontend && npm test

# Run a single test file
cd frontend && npx ng test --include='**/my.component.spec.ts'

# Lint
cd frontend && npm run lint
```

## E2E Tests (Playwright)

E2E tests live under `e2e/`. Both the backend and frontend must be running before executing them.

```bash
# Install dependencies (first time only)
cd e2e && npm install

# Run all E2E tests
cd e2e && npx playwright test

# Run a specific test file
cd e2e && npx playwright test contact.spec.ts

# Run tests matching a keyword
cd e2e && npx playwright test --grep "login"
```
