# Aventix Backend Architecture (NestJS + PostgreSQL + Prisma ORM)

This directory provides the starting architectural layout for the Aventix backend application, built with **NestJS**, **PostgreSQL**, and **Prisma ORM**.

## Directory Structure

```text
backend/
├── prisma/
│   └── schema.prisma         # Database schema, PostgreSQL datasource, and Prisma models
├── src/
│   ├── common/               # Shared cross-cutting concerns
│   │   ├── decorators/       # Custom NestJS parameter and method decorators
│   │   ├── filters/          # Global exception filters
│   │   ├── guards/           # JWT authentication and RBAC authorization guards
│   │   ├── interceptors/     # Logging, serialization, and response transformers
│   │   └── pipes/            # Validation and sanitization pipes
│   ├── config/               # Environment configuration and validation
│   ├── database/             # Prisma database service and connection lifecycle
│   ├── modules/              # Domain feature modules
│   │   ├── auth/             # User and Organizer authentication (JWT, OAuth)
│   │   ├── users/            # Customer profile and preferences
│   │   ├── events/           # Event discovery, filtering, and detail management
│   │   ├── tickets/          # Ticket tiers, QR code generation, and inventory
│   │   ├── bookings/         # Order creation, reservation timer, and checkout
│   │   ├── organizers/       # Event organizer portal and analytics
│   │   └── payments/         # Payment gateway integration (GCash, Maya, Cards)
│   ├── app.module.ts         # Root NestJS module
│   └── main.ts               # Application entrypoint
├── .env.example              # Environment variables template
├── nest-cli.json             # NestJS CLI configuration
└── tsconfig.json             # TypeScript configuration for NestJS
```

## Quick Start (When Ready to Implement)

1. **Install NestJS and Prisma dependencies**:
   ```bash
   cd backend
   npm install @nestjs/core @nestjs/common @nestjs/platform-express prisma @prisma/client
   ```

2. **Configure Database URL**:
   Update `DATABASE_URL` in `.env` with your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/aventix_db?schema=public"
   ```

3. **Run Prisma Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```
