# Deployment Guide - JDConnect

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Vercel account (Frontend)
- Railway/Heroku (Backend)

## Frontend Deployment (Vercel)
1. `npm install`
2. `npm run build`
3. `vercel --prod`

Environment Variables:
```
NEXT_PUBLIC_API_BASE_URL=https://api.jdconnect.com
```

## Backend Deployment (Railway)
1. `npm install`
2. `npm run build`
3. `railway up`

Environment Variables:
```
DB_HOST=...
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
JWT_SECRET=your-secret-key
REDIS_URL=...
```

## Database Setup
```sql
-- Run migrations
npm run migration:run

-- Seed initial data
npm run seed:run
```

## Monitoring
- **Frontend**: Vercel Analytics
- **Backend**: Railway Logs + Sentry
- **Database**: pgAdmin or TablePlus

## Rollback Procedure
1. `git checkout previous-tag`
2. `npm run build`
3. `vercel deploy --prebuilt`
4. Database rollback using migration down

## Maintenance
- Weekly dependency updates
- Monthly security scans
- Quarterly performance audits
