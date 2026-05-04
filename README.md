# accounting-firm

Web application for an accounting firm. Monorepo containing a Spring Boot backend and Angular frontend.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.5, PostgreSQL
- Frontend: Angular 21
- Authentication: Google OAuth2

## Development Setup

### 1. PostgreSQL

Start PostgreSQL locally and create the database:

```bash
createdb accounting_firm
```

Or with Docker:

```bash
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
```

Load the file before starting the backend:

```bash
set -a && source .env && set +a
```

Or set them directly in **IntelliJ → Run → Edit Configurations → Environment variables**.

### 3. Start the backend

```bash
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### 4. Start the frontend

```bash
cd frontend && npm start
```

The Angular dev server proxies `/api/**` to the Spring Boot server at `localhost:8080`.

## Backend Commands

```bash
# Run the application
cd backend && ./mvnw spring-boot:run

# Run with a specific profile
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

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
