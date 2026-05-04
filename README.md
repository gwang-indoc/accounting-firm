# accounting-firm

Web application for an accounting firm. Monorepo containing a Spring Boot backend and Angular frontend.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.5, PostgreSQL
- Frontend: Angular 21
- Authentication: Google OAuth2

## Development Setup

1. Start PostgreSQL locally and create the `accounting_firm` database.
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables (obtain from Google Cloud Console).
3. Start the backend: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
4. Start the frontend: `cd frontend && npm start`

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

### Database connection

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/accounting_firm
SPRING_DATASOURCE_USERNAME=...
SPRING_DATASOURCE_PASSWORD=...
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
