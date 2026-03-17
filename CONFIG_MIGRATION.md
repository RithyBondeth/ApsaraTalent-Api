# Configuration Migration Guide

## 🔄 Changes Made

### Old Structure (❌ Removed)
```
apps/api-gateway/.env
apps/auth-service/.env
apps/user-service/.env
apps/resume-builder-service/.env
apps/chat-service/.env
apps/job-service/.env
libs/.env
```

### New Structure (✅ Implemented)
```
.env                    # Main development config (tracked)
.env.production        # Production config template (tracked)
.env.example          # Environment template (tracked)
.env.local           # Local overrides (gitignored)
libs/common/src/config/  # Centralized config module
```

## 📁 New Configuration Files

### Core Configuration
- `libs/common/src/config/configuration.ts` - Main config factory
- `libs/common/src/config/validation.schema.ts` - Joi validation schema
- `libs/common/src/config/config.module.ts` - NestJS config module
- `libs/common/src/config/index.ts` - Barrel exports

### Environment Files
- `.env` - Development configuration (now tracked in git)
- `.env.production` - Production template with commented secrets
- `.env.example` - Template for new developers
- `.env.local` - Local overrides (gitignored for sensitive data)

## 🚀 Usage in Services

### Import the ConfigModule
```typescript
import { ConfigModule } from '@app/common/config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  // ...
})
export class YourServiceModule {}
```

### Use Configuration in Services
```typescript
@Injectable()
export class YourService {
  constructor(private configService: ConfigService) {}

  getDatabaseConfig() {
    return {
      url: this.configService.get('database.url'),
      synchronize: this.configService.get('database.synchronize'),
    };
  }

  getJwtConfig() {
    return {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    };
  }
}
```

## 🔧 Configuration Structure

All configs are now organized by domain:

```typescript
{
  database: { url, synchronize },
  jwt: { secret, expiresIn, refreshExpiresIn, emailExpiresIn },
  email: { host, port, user, password, from },
  throttle: { ttl, limit },
  sms: { twilio: {...}, plasgate: {...} },
  services: { apiGateway: {...}, auth: {...}, user: {...} },
  redis: { websocket: {...} },
  frontend: { origin },
  social: { google: {...}, linkedin: {...}, github: {...}, facebook: {...} },
  baseUrl
}
```

## 🔒 Security Improvements

1. **Sensitive data in .env.local** (gitignored)
2. **Production secrets commented out** in .env.production
3. **Validation schema** ensures required vars are present
4. **Type-safe access** through ConfigService
5. **Environment-specific loading** (.env.local overrides .env)

## 🔄 Environment Loading Priority

1. `.env.local` (highest priority, gitignored)
2. `.env.${NODE_ENV}` (e.g., .env.production)
3. `.env` (lowest priority, tracked)

## ⚠️ Migration Notes

1. **Update your local .env.local** with any sensitive credentials
2. **All services now use the centralized config**
3. **Old individual .env files have been removed**
4. **ConfigModule is globally available**

## 📝 Next Steps

1. Update each microservice to import ConfigModule
2. Replace direct process.env usage with ConfigService
3. Test all services with the new configuration
4. Update deployment scripts to use new environment structure