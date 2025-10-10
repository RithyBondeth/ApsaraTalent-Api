# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apsara Talent Platform is a comprehensive NestJS-based talent management platform built as a microservices architecture. The platform facilitates connections between companies and employees through job matching, resume building, and real-time chat functionality.

## Development Commands

### Build and Start
```bash
# Build the entire project
npm run build

# Start all services in development mode
npm run start:dev

# Start individual services in development mode
npm run start:dev:api      # API Gateway
npm run start:dev:auth     # Authentication Service
npm run start:dev:users    # User Service
npm run start:dev:resume   # Resume Builder Service
npm run start:dev:chat     # Chat Service
npm run start:dev:job      # Job Service
npm run start:dev:payment  # Payment Service

# Start individual services in production mode
npm run start:api
npm run start:auth
npm run start:users
npm run start:resume
npm run start:chat
npm run start:job
npm run start:payment
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

### Code Quality
```bash
# Lint and fix code
npm run lint

# Format code
npm run format
```

## Architecture Overview

### Microservices Structure
The application follows a microservices architecture with the following services:

- **API Gateway** (`apps/api-gateway`): Entry point that routes requests to appropriate microservices
- **Auth Service** (`apps/auth-service`): Handles authentication, registration, password management, and social login
- **User Service** (`apps/user-service`): Manages user profiles for both employees and companies
- **Job Service** (`apps/job-service`): Handles job postings and job matching algorithms
- **Resume Builder Service** (`apps/resume-builder-service`): Manages resume creation and templates
- **Chat Service** (`apps/chat-service`): Real-time messaging between users
- **Payment Service** (`apps/payment-service`): Handles payment processing and billing

### Shared Libraries
- **Common Library** (`libs/common`): Shared utilities, database entities, guards, interceptors, and services used across all microservices

### Database Design
The application uses PostgreSQL with TypeORM as the ORM. Key entities include:

- **User**: Base user entity with role-based access (Employee/Company)
- **Employee**: Employee profiles with education, experience, and skills
- **Company**: Company profiles with jobs, benefits, and values
- **Job**: Job postings with matching capabilities
- **Chat**: Real-time messaging functionality
- **ResumeTemplate**: Template system for resume generation

### Key Technologies
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport strategies (Google, Facebook, LinkedIn, GitHub)
- **Real-time**: Socket.IO for chat functionality
- **File Upload**: Multer with image processing via Sharp
- **Email**: Nodemailer for email services
- **PDF Generation**: Puppeteer for resume generation
- **Logging**: Pino logger
- **Rate Limiting**: NestJS Throttler

## Environment Configuration

The application uses environment variables managed through ConfigModule. Configuration files are located in `libs/.env`.

### Service Configuration
All services use environment variables for host and port configuration:
- `services.apiGateway.port`: API Gateway port
- `services.auth.host` / `services.auth.port`: Auth Service configuration
- `services.user.host` / `services.user.port`: User Service configuration
- `services.resume.host` / `services.resume.port`: Resume Service configuration
- `services.chat.host` / `services.chat.port`: Chat Service configuration
- `services.job.host` / `services.job.port`: Job Service configuration
- `services.payment.host` / `services.payment.port`: Payment Service configuration

### Database and Core Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_SYNCHRONIZE`: TypeORM synchronization setting
- `SESSION_SECRET`: Session management secret
- Social OAuth credentials for various providers (Google, Facebook, LinkedIn, GitHub)
- `frontend.origin`: CORS configuration for frontend

## File Upload System

The platform includes a comprehensive file upload system located in `libs/common/src/uploadfile/`:
- Profile avatars for employees and companies
- Company cover images
- Resume and cover letter uploads
- Resume template images

Files are stored in the `storage/` directory with organized subdirectories.

## Development Patterns

### Service Structure
Each microservice follows a consistent structure:
- `controllers/`: HTTP request handlers
- `services/`: Business logic implementation
- `dtos/`: Data Transfer Objects for validation
- `interfaces/`: TypeScript interfaces
- `main.ts`: Service bootstrap file

### Common Library Usage
Import shared functionality from the common library:
```typescript
import { DatabaseModule } from '@app/common/database/database.module';
import { JwtModule } from '@app/common/jwt/jwt.module';
import { AuthGuard } from '@app/common/guards/auth.guard';
```

### Entity Relationships
The database uses TypeORM relationships:
- User has OneToOne relationships with Employee and Company
- Employee has OneToMany relationships with Education, Experience, Skills
- Company has OneToMany relationships with Jobs, Benefits, Values
- Favorite systems create ManyToMany relationships between employees and companies

## Testing Strategy

Tests are configured with Jest and use the following patterns:
- Unit tests for services and controllers (`*.spec.ts`)
- End-to-end tests for complete request flows
- Coverage reports generated in `./coverage` directory
- Module aliases configured for `@app/common` imports

## Microservice Communication

### Transport Layer
- **Protocol**: TCP-based communication between microservices
- **Service Discovery**: Environment variable-based host/port configuration
- **API Gateway**: HTTP REST endpoints that proxy to internal TCP services
- **Real-time**: WebSocket connections via Socket.IO for chat functionality

### Error Handling
- Use `RpcException` for microservice-to-microservice communication errors
- HTTP exceptions for API Gateway responses
- Centralized error handling through NestJS exception filters

## Common Development Tasks

When working with this codebase:
1. Always run `npm run lint` before committing changes
2. Use the shared common library for database entities and utilities
3. Follow the established DTO pattern for request validation
4. Implement proper error handling using NestJS exception filters
5. Use TypeORM decorators consistently for entity definitions
6. Maintain the microservices separation of concerns
7. Configure service host/port through environment variables in main.ts files
8. Import Logger from 'nestjs-pino' for consistent logging across services