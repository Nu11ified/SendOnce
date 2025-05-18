# SendOnce

SendOnce is an AI-powered email client built with Next.js 14, designed to provide a modern and intelligent email experience.

## Overview

This project aims to leverage the power of AI to enhance email productivity. It features a rich text editor, email parsing and display capabilities, and robust backend services for managing email data.

## Key Features

- **AI-Powered Assistance:** Integrates AI models for features like email summarization, smart replies, and potentially more.
- **Modern Tech Stack:** Built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.
- **Rich Text Editor:** Uses Novel (a Notion-style WYSIWYG editor) for composing emails.
- **Email Integration:** Utilizes the Nylas SDK for connecting to email accounts and managing email data.
- **Database & ORM:** Employs Prisma as an ORM for database interactions.
- **API Layer:** Uses tRPC for typesafe API routes between the client and server.
- **Authentication:** Implements user authentication using Clerk.
- **UI Components:** Leverages Radix UI and Shadcn/ui for a polished and accessible user interface.
- **Email Rendering:** Uses `react-letter` for accurately rendering email content.

## Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Libraries:** Radix UI, Shadcn/ui, Lucide React icons
- **Editor:** Novel
- **Email Integration:** Nylas SDK
- **AI:** OpenAI SDK, Vercel AI SDK, Xenova Transformers.js
- **API:** tRPC
- **ORM:** Prisma
- **Authentication:** Clerk
- **State Management:** Jotai, React Query (via tRPC)
- **Forms:** React Hook Form, Zod for validation
- **Linting/Formatting:** ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js (version recommended by Next.js 14, likely >= 18.17)
- Bun (used in `package.json` lockfile, though npm/yarn might also work)
- A database supported by Prisma (e.g., PostgreSQL, MySQL, SQLite)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd SendOnce 
    ```
    (Replace `<repository-url>` with the actual URL of this repository)

2.  **Install dependencies:**
    ```bash
    bun install 
    ```
    (or `npm install` / `yarn install` if you prefer, though `bun.lockb` exists)

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project. You'll need to populate it with credentials for:
    *   Clerk (see `src/env.js` for expected variables like `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
    *   Nylas (credentials for the Nylas SDK)
    *   OpenAI (API key if using OpenAI models)
    *   Database connection URL (for Prisma, e.g., `DATABASE_URL`)

    Refer to `src/env.js` for a more complete list of environment variables used by T3 Env.

4.  **Set up the database:**
    ```bash
    bun run db:generate # Or npx prisma migrate dev
    bun run db:push     # Or npx prisma db push (if you prefer not to use migrations initially)
    ```
    This will create the necessary database schema based on your `prisma/schema.prisma` file.

### Running the Development Server

```bash
bun run dev
```
This will start the Next.js development server, typically on `http://localhost:3001`.
The command `next dev --turbo --port 3001 | egrep -v '^\\s?(GET|POST|OPTIONS)'` is used to start the server with TurboPack and filter out noisy GET/POST/OPTIONS logs.

## Available Scripts

The `package.json` file defines several scripts for common tasks:

-   `bun run build`: Builds the application for production.
-   `bun run db:generate`: Runs `prisma migrate dev` to create/update database migrations based on your schema and applies them.
-   `bun run db:migrate`: Runs `prisma migrate deploy` to apply pending migrations, typically used in production.
-   `bun run db:push`: Pushes the Prisma schema state to the database without creating migrations. Good for rapid prototyping.
-   `bun run db:studio`: Opens Prisma Studio, a GUI for your database.
-   `bun run dev`: Starts the Next.js development server (with TurboPack on port 3001).
-   `bun run postinstall`: Runs `prisma generate` automatically after package installation.
-   `bun run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
-   `bun run start`: Starts the application in production mode (after running `build`).

## Project Structure

-   `src/app/`: Contains the pages and layouts for the Next.js App Router.
-   `src/components/`: Shared React components.
-   `src/lib/`: Utility functions and library initializations.
-   `src/server/`: Server-side logic, including tRPC routers and API handlers.
-   `src/trpc/`: tRPC client setup and React Query integration.
-   `src/hooks/`: Custom React hooks.
-   `src/styles/`: Global styles and Tailwind CSS configuration.
-   `prisma/`: Prisma schema (`schema.prisma`) and migration files.
-   `public/`: Static assets.
-   `middleware.ts`: Next.js middleware for handling requests (e.g., authentication).