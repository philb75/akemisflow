# AkemisFlow Stability & Reliability Guide

## Overview

This document outlines the comprehensive stability and reliability improvements implemented in AkemisFlow to ensure robust development and production operation.

## 🚀 Enhanced Startup System

### Development Scripts

```bash
# Enhanced development startup with health checks
npm run dev:enhanced

# Run pre-flight checks only
npm run dev:check

# Traditional development startup (fallback)
npm run dev
```

### Features

- **Pre-flight health checks** - Validates all dependencies before starting
- **Automatic dependency installation** - Ensures packages are up to date
- **Docker service coordination** - Starts and manages required services
- **Real-time monitoring** - Continuous health monitoring during development
- **Graceful restart** - Automatic recovery from crashes (max 3 attempts)

## 📊 Centralized Logging System

### Log Levels

- **ERROR** - Critical issues requiring immediate attention
- **WARN** - Warning conditions that should be investigated
- **INFO** - General operational messages
- **DEBUG** - Detailed information for troubleshooting (dev only)

### Log Categories

- **STARTUP** - Application initialization
- **DATABASE** - Database operations and connections
- **AUTH** - Authentication and authorization
- **API** - API request/response logging
- **REACT** - Client-side React errors
- **HEALTH** - System health monitoring

### Log Storage

- **Console** - Real-time output during development
- **Files** - Persistent storage in `logs/` directory
- **Rotation** - Automatic log file rotation (10MB max, 5 files)

### Usage Examples

```typescript
import logger from '@/lib/logger'

// Basic logging
logger.error('Something went wrong', { error, metadata: { userId: '123' } })
logger.warn('Performance degradation detected')
logger.info('User logged in successfully')

// Category-specific logging
logger.database('Connection pool exhausted', { poolSize: 10 })
logger.auth('Failed login attempt', { email: 'user@example.com' })
logger.api('Slow API response', { endpoint: '/api/users', duration: '2500ms' })
```

## 🛡️ Error Handling & Recovery

### API Error Middleware

All API routes are wrapped with comprehensive error handling:

```typescript
import { apiRoute, ValidationError, DatabaseError } from '@/middleware/error-handler'

export const POST = apiRoute(async (req) => {
  // Your API logic here
  // Errors are automatically caught, logged, and formatted
})
```

### Error Types

- **ValidationError** (400) - Invalid request data
- **UnauthorizedError** (401) - Authentication required
- **ForbiddenError** (403) - Insufficient permissions
- **NotFoundError** (404) - Resource not found
- **DatabaseError** (500) - Database operation failed
- **ExternalServiceError** (503) - Third-party service unavailable

### React Error Boundaries

Client-side errors are caught and handled gracefully:

```typescript
import ErrorBoundary from '@/components/error-boundary'

// Automatic error boundary in root layout
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// Manual error handling in components
import { useErrorHandler } from '@/components/error-boundary'

const { handleError } = useErrorHandler()

try {
  // risky operation
} catch (error) {
  handleError(error)
}
```

## 🏥 Health Monitoring

### Health Check Endpoints

```bash
# Quick readiness check
GET /api/health

# Detailed system health
GET /api/health?detailed=true

# Simple up/down check
HEAD /api/health
```

### Health Check Components

- **Environment** - Required environment variables
- **Database** - Connection and query performance
- **File System** - Write permissions and disk space
- **Memory** - Process memory usage
- **External Services** - Airwallex API connectivity

### Response Format

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 300000,
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "responseTime": 45,
      "message": "Database responding normally"
    }
  ]
}
```

## 🐳 Docker Reliability

### Enhanced Docker Compose

- **Health checks** for all services
- **Restart policies** with exponential backoff
- **Dependency management** with health conditions
- **Resource limits** to prevent system overload

### Service Health Checks

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U akemisflow -d akemisflow_dev"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### Restart Policies

```yaml
deploy:
  restart_policy:
    condition: on-failure
    delay: 5s
    max_attempts: 3
    window: 120s
```

## 🔧 Development Experience

### TypeScript Configuration

- **Development** - Full type checking and ESLint
- **Production** - Error masking for deployment only
- **Build-time** - Early error detection

### Pre-commit Hooks

- Code formatting with Prettier
- Type checking with TypeScript
- Linting with ESLint
- Health check validation

### Hot Reload Recovery

- **Error isolation** - Components crash individually
- **State preservation** - Minimal state loss on reload
- **Source map accuracy** - Precise error locations

## 📈 Monitoring & Observability

### Request Tracking

Every API request gets a unique ID for tracing:

```
X-Request-ID: a1b2c3d4e5f6
```

### Performance Metrics

- Response times for API endpoints
- Database query performance
- Memory usage monitoring
- Error rate tracking

### Log Analysis

```bash
# View recent logs
tail -f logs/app-$(date +%Y-%m-%d).log

# Search for errors
grep "ERROR" logs/app-*.log

# Monitor API performance
grep "duration" logs/app-*.log | grep -E "[0-9]{4,}ms"
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start

1. Run health check: `npm run dev:check`
2. Check environment variables in `.env.local`
3. Verify database connection
4. Ensure Docker services are running

#### Database Connection Errors

1. Check Docker container status: `docker ps`
2. Verify connection string in environment
3. Test direct connection: `psql $DATABASE_URL`
4. Check firewall/network connectivity

#### TypeScript Compilation Errors

1. Clear Next.js cache: `rm -rf .next`
2. Regenerate Prisma client: `npx prisma generate`
3. Check for missing dependencies: `npm install`
4. Verify TypeScript configuration

#### Memory Issues

1. Monitor memory usage in health endpoint
2. Check for memory leaks in logs
3. Restart development server
4. Increase Node.js memory limit: `--max-old-space-size=4096`

### Emergency Recovery

#### Reset Development Environment

```bash
# Stop all services
docker-compose down -v

# Clean caches
rm -rf .next node_modules logs
npm install

# Restart with health checks
npm run dev:enhanced
```

#### Production Recovery

```bash
# Check system health
curl https://your-domain.com/api/health?detailed=true

# View recent logs
heroku logs --tail (or your hosting provider's equivalent)

# Database recovery
npm run db:migrate
```

## 📚 Best Practices

### Error Handling

- Always use try-catch for async operations
- Provide meaningful error messages
- Include context in error metadata
- Use appropriate HTTP status codes

### Logging

- Log at appropriate levels
- Include relevant context/metadata
- Use structured logging format
- Avoid logging sensitive information

### Performance

- Monitor response times
- Use database connection pooling
- Implement caching where appropriate
- Profile memory usage regularly

### Security

- Validate all inputs
- Sanitize error messages in production
- Use HTTPS in production
- Implement rate limiting

## 🔄 Continuous Improvement

### Metrics to Monitor

- Application uptime
- Error rates by endpoint
- Average response times
- Memory usage trends
- Database performance

### Regular Maintenance

- Review logs weekly
- Update dependencies monthly
- Performance testing quarterly
- Security audits annually

## 📞 Support

For issues or questions about the stability system:

1. Check the logs in `logs/` directory
2. Run health checks: `npm run dev:check`
3. Review this documentation
4. Contact the development team

---

*Last Updated: January 2025*  
*System Version: 0.1.0 Enhanced*