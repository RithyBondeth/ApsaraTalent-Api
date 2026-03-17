# Gemini Project Context: ApsaraTalent API

This document provides context for the ApsaraTalent API project, which is a NestJS-based monorepo.

## Project Overview

ApsaraTalent is a talent and recruitment platform built with a microservices architecture using the NestJS framework. The project is structured as a monorepo, containing multiple services and a shared library.

## Architecture

The project is a monorepo managed with Nest CLI, consisting of several microservices and a common library.

### Services:

-   **api-gateway**: The main entry point for the application. It aggregates requests and routes them to the appropriate microservices.
-   **auth-service**: Handles user authentication and authorization.
-   **user-service**: Manages user profiles, including employees and companies.
-   **resume-builder-service**: Provides functionality for creating and managing resumes.
-   **chat-service**: Powers the real-time chat functionality.
-   **job-service**: Manages job postings and applications.
-   **payment-service**: Handles all payment-related logic.
-   **notification-service**: Manages and sends notifications to users.

### Shared Library:

-   **libs/common**: Contains shared modules and utilities used across the different services. This includes configuration, database connections, JWT handling, logging, and more.

### Key Technologies:

-   **Framework**: NestJS
-   **Language**: TypeScript
-   **Database**: PostgreSQL (using TypeORM)
-   **Caching**: Redis
-   **Testing**: Jest
-   **Code Style**: ESLint and Prettier

## Getting Started

To set up the development environment, install the dependencies:

```bash
npm install
```

## Running the Application

You can run the entire application in different modes:

-   **Development mode with watch:**
    ```bash
    npm run start:dev
    ```
-   **Production mode:**
    ```bash
    npm run start:prod
    ```

## Running Individual Services

You can run each microservice individually in development mode. This is useful for focusing on a specific part of the application.

-   **API Gateway**: `npm run start:dev:api`
-   **Auth Service**: `npm run start:dev:auth`
-   **User Service**: `npm run start:dev:users`
-   **Resume Builder Service**: `npm run start:dev:resume`
-   **Chat Service**: `npm run start:dev:chat`
-   **Job Service**: `npm run start:dev:job`
-   **Payment Service**: `npm run start:dev:payment`
-   **Notification Service**: `npm run start:dev:notification`

## Testing

The project uses Jest for testing. You can run tests using the following commands:

-   **Run unit tests:**
    ```bash
    npm run test
    ```
-   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```
-   **Get test coverage:**
    ```bash
    npm run test:cov
    ```

## Code Style

The project uses ESLint and Prettier to maintain a consistent code style.

-   **Lint and fix files:**
    ```bash
    npm run lint
    ```
-   **Format files:**
    ```bash
    npm run format
    ```
