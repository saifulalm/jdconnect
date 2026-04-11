# Troubleshooting Guide - JDConnect

## Common Issues

### 1. Authentication Errors
**Symptom**: "Invalid token" or login failures
**Cause**: Expired JWT or incorrect API URL
**Solution**:
- Clear browser storage: `localStorage.clear()`
- Verify NEXT_PUBLIC_API_BASE_URL in .env
- Check backend JWT_SECRET consistency

### 2. Transaction Failures
**Symptom**: "Insufficient balance" or payment errors
**Cause**: Balance sync issues or provider downtime
**Solution**:
- Check user balance via API: GET /users/profile
- Verify provider status in admin panel
- Review transaction logs in backend

### 3. Performance Issues
**Symptom**: Slow loading (>3s)
**Cause**: Large bundles or database queries
**Solution**:
- Run `npm run analyze` for bundle size
- Optimize images with Next.js Image
- Add database indexes for frequent queries

### 4. API Integration Problems
**Symptom**: "Invalid signature" or 401 errors
**Cause**: HMAC calculation or timestamp issues
**Solution**:
- Verify timestamp within 5 minutes window
- Check HMAC-SHA256 calculation: apiKey + body + timestamp
- Ensure IP whitelisted in settings

### 5. Mobile Responsiveness
**Symptom**: Layout breaks on mobile
**Cause**: Missing responsive classes
**Solution**:
- Test with Chrome DevTools device mode
- Ensure grid-cols-1 md:grid-cols-2 patterns
- Verify touch targets minimum 44px

## Backend Troubleshooting
### Database Connection
```bash
# Test connection
npm run db:connect

# Check migrations
npm run migration:status
```

### Redis Issues
```bash
# Test Redis
npm run redis:ping

# Clear cache if needed
npm run redis:flush
```

## Monitoring & Alerts
- **Sentry**: Real-time error tracking
- **Vercel Analytics**: Performance metrics
- **Railway Logs**: Backend monitoring
- **UptimeRobot**: API health checks

## Emergency Procedures
1. **Immediate Rollback**: `git checkout v1.0.0 && npm run deploy`
2. **Database Restore**: Use pg_dump backups
3. **Cache Clear**: Redis FLUSHALL command
4. **Contact Support**: #emergency channel in Slack

## Contact Information
- **Technical Support**: support@jdconnect.com
- **Emergency**: +62 812 3456 7890
- **Documentation**: https://docs.jdconnect.com
