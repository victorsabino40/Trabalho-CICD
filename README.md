# UNIFOR - CI/CD (Back-end)

A Node.js REST API for product management, built with Express, Prisma, and TypeScript. Includes CI/CD workflow and Vitest tests.

## Features
- Product CRUD operations
- Dashboard statistics
- Health check endpoint
- Prisma ORM with SQLite
- CI/CD workflow for main and develop branches
- Unit tests with Vitest

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Database Setup
- The app uses SQLite (see `prisma/schema.prisma`).
- To migrate and generate Prisma client:
```bash
npx prisma migrate dev
```

### Running the Application
```bash
npm run dev
```
The server runs on `http://localhost:3000` by default.

### API Endpoints
- `GET /health` — Health check
- `GET /api/products` — List products
- `GET /api/products/:id` — Get product by ID
- `POST /api/products` — Create product
- `PUT /api/products/:id` — Update product
- `DELETE /api/products/:id` — Delete product
- `GET /api/products/dashboard` — Dashboard stats

### Testing
```bash
npm test
```

## CI/CD
- GitHub Actions workflow runs build and tests on `main` and `develop` branches.

## Project Structure
```
src/
  server.ts
  controllers/
  routes/
  database/
  @shared/
prisma/
  schema.prisma
  dev.db
  migrations/
```
