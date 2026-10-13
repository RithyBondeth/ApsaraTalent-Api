<div align="center">

# Apsara Talent — API

**The microservices backend for Apsara Talent, a recruitment platform that connects companies and professionals through job matching, resume building, and real-time chat.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![TypeORM](https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## Overview

Apsara Talent is a Cambodia-focused recruitment platform. This repository is its backend: a **NestJS monorepo** with one HTTP API gateway and six internal microservices that talk over TCP RPC.

In production, PostgreSQL runs on Neon, Redis and the services run on Railway, uploads live in Cloudflare R2, and a Prometheus, Grafana and Alertmanager stack monitors the platform.

## Features

- **Authentication:** email and phone login, OTP, two-factor authentication, password recovery, and social login (Google, GitHub, Facebook, LinkedIn) for web and mobile.
- **Profiles** for employees and companies, with ownership guards, moderation, and support tickets.
- **Jobs:** postings, applications, interviews, saved searches, employer analytics, and AI-assisted matching.
- **Resume builder:** AI-generated resumes, cover letters and profile bios from templates, rendered to PDF, plus resume import and parsing.
- **Real-time chat and voice calls** over Socket.IO, with WebRTC ICE server provisioning, attachments, and rate limiting.
- **Notifications:** in-app notifications, user preferences, and Firebase Cloud Messaging push.
- **AI features** streamed from OpenAI, with per-user quotas.
- **Admin tools:** user management, reports, problem reports, and job moderation.
- **Production hardening:** Helmet, throttling, Redis caching, structured Pino logging, Sentry, Prometheus metrics, and health checks.
- **Operations:** CI/CD with CodeQL, migration rehearsal, rollback, database recovery, infrastructure drift checks, and storage backups.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | NestJS (monorepo with microservices over TCP) |
| Language | TypeScript |
| Database | PostgreSQL (Neon), TypeORM migrations |
| Cache | Redis |
| Real-time | Socket.IO, WebRTC |
| AI | OpenAI |
| Storage | Cloudflare R2 (S3 API) |
| Messaging | Nodemailer, Twilio, Firebase Cloud Messaging |
| Observability | Pino, Sentry, Prometheus, Grafana, Alertmanager, PostHog |
| Infrastructure | Docker, Railway, GitHub Actions |

## Architecture

| Service | Path | Port | Role |
| --- | --- | --- | --- |
| API Gateway | `apps/api-gateway` | 3000 | The only HTTP surface; proxies to the TCP services |
| Auth | `apps/auth-service` | 3001 | Registration, login, 2FA, password recovery, social login |
| User | `apps/user-service` | 3002 | Employee and company profiles, moderation, support |
| Resume Builder | `apps/resume-builder-service` | 3003 | Resume and cover-letter generation, templates |
| Chat | `apps/chat-service` | 3004 | Message persistence |
| Job | `apps/job-service` | 3005 | Job postings, applications, interviews, matching |
| Notification | `apps/notification-service` | 3007 | Notifications and push delivery |

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc`) and npm
- PostgreSQL and Redis (local or hosted)

### Installation

```bash
git clone https://github.com/RithyBondeth/ApsaraTalent-Api.git
cd ApsaraTalent-Api
npm ci
cp .env.example .env      # then fill it in
npm run start:dev         # or ./scripts/dev/run.sh to run every service in tmux
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start the API gateway in watch mode |
| `npm run build` | Build the API gateway |
| `npm run migration:run` | Apply TypeORM migrations |
| `npm test` | Run unit tests (Jest) |
| `npm run test:e2e` | Run the end-to-end suite with its own Docker infrastructure |
| `npm run lint` | Lint and fix |

## Project Structure

```text
ApsaraTalent-Api/
├── apps/              # One folder per deployable service
├── libs/
│   ├── common/        # Database, storage, Redis, JWT, guards, utilities
│   └── contracts/     # DTOs, service interfaces, shared constants
├── migrations/        # TypeORM migrations
├── scripts/           # CI, database, storage, dev, and load-testing tooling
├── monitoring/        # Prometheus, Grafana, Alertmanager
├── docs/              # Infrastructure, runbook, storage, rollout, load testing
└── test/e2e/          # End-to-end suite
```

## Documentation

| Document | Use it when |
| --- | --- |
| [Infrastructure map](docs/INFRASTRUCTURE.md) | You need to know where something lives and when it runs |
| [Runbook](docs/RUNBOOK.md) | Something is broken: backups, restores, rollbacks |
| [Production rollout](docs/PRODUCTION-ROLLOUT.md) | You are provisioning the platform from scratch |
| [Storage](docs/STORAGE.md) | You are working on uploaded files |
| [Load testing](docs/load-testing.md) | You are measuring throughput and latency |
| [Monitoring](monitoring/production/README.md) | You are working on production metrics and alerting |

## Related Repositories

- [ApsaraTalent-Web](https://github.com/RithyBondeth/ApsaraTalent-Web): the Next.js web app
- [ApsaraTalent-Mobile](https://github.com/RithyBondeth/ApsaraTalent-Mobile): the Flutter mobile app

## Author

**Rithy Bondeth** — Full Stack Developer & AI Engineer

[![Portfolio](https://img.shields.io/badge/Portfolio-0A0A0A?style=for-the-badge&logo=vercel&logoColor=white)](https://bondeth.dev)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RithyBondeth)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rithy-bondeth-484073282/)
