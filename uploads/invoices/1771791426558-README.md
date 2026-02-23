# CREDITORFLOW - Enterprise Invoice Management System

## Technology Stack
- **Frontend**: Next.js 14 (App Router) with TypeScript
- **Backend**: Python gRPC Microservices
- **Database**: PostgreSQL 15+
- **Cache/Queue**: Redis
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and navigate to project**
```bash
cd CREDITORFLOW# Create the full directory structure
mkdir -p src/app/{api,dashboard,invoices,approvals,suppliers,reports}
mkdir -p src/components/{ui,dashboard,invoices}
mkdir -p src/lib/{database,utils}
mkdir -p src/logic-engine/{approval-engine,compliance,duplicates,risk}
mkdir -p src/{services,types,workflows}
mkdir -p prisma/migrations
mkdir -p uploads/invoices
mkdir -p tests/{unit,integration,e2e}
mkdir -p supabase

# Create key files with basic structure
# 1. Package.json for Node.js/Next.js
cat > package.json << 'EOF'
{
  "name": "creditorflow",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "zod": "^3.22.0",
    "@prisma/client": "^5.7.0",
    "zustand": "^4.4.0",
    "react-hook-form": "^7.48.0",
    "recharts": "^2.10.0",
    "@radix-ui/react-icons": "^1.3.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5.3.3",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "14.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "prisma": "^5.7.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0"
  }
}
