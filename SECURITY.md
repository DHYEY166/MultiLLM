# Security Implementation Guide

## Overview
This document outlines the security measures implemented in MultiLLM and provides guidance for maintaining secure operations.

## Implemented Security Features

### 1. Session Security ✅
- **Crypto-generated secrets**: Automatic generation of secure session secrets if not provided
- **Warning system**: Logs security warnings when SESSION_SECRET is not set
- **Session regeneration**: Sessions are regenerated on login/logout to prevent fixation attacks
- **Secure cookie settings**: HttpOnly, SameSite, and Secure flags enabled in production

### 2. Authentication Security ✅
- **Rate limiting**: Strict 5 attempts per 15 minutes for login endpoints
- **Account lockout**: Rate limiter prevents brute force attacks
- **Security logging**: All login attempts, successes, and failures are logged
- **Password hashing**: bcrypt with appropriate work factor
- **Session destruction**: Proper cleanup on logout

### 3. File Upload Security ✅
- **Strict validation**: MIME type and extension matching required
- **Size limits**: 50MB maximum file size
- **Upload rate limiting**: 50 uploads per hour per user
- **Path traversal prevention**: All file paths validated against allowed directories
- **Filename sanitization**: Dangerous characters removed from filenames
- **Security logging**: All uploads tracked with user ID, IP, and file details

### 4. Path Traversal Prevention ✅
- **Path validation**: `validatePath()` ensures all paths stay within allowed directories
- **User ID sanitization**: `sanitizeUserId()` removes dangerous characters
- **Resolved path checking**: Uses `path.resolve()` to detect directory traversal attempts

### 5. CSV Injection Prevention ✅
- **Cell sanitization**: `sanitizeCsvCell()` prefixes dangerous characters with single quote
- **Sample row sanitization**: All CSV data displayed to users is sanitized
- **Dangerous patterns**: Detects =, +, -, @, \t, \r at cell start

### 6. Input Validation ✅
- **Query validation**: `validateQuery()` enforces 10,000 character limit
- **Injection detection**: Warns about suspicious patterns (prompt injection, XSS)
- **XSS prevention**: Strips `<script>` and `<iframe>` tags
- **Security logging**: Suspicious queries logged with IP and user context

### 7. Security Logging ✅
- **Comprehensive events**: Login, logout, upload, cleanup, rate limit violations
- **Structured logging**: JSON format with timestamp, event type, and details
- **IP tracking**: All security events include source IP address
- **Audit trail**: Complete history of security-relevant actions

### 8. Enhanced Headers ✅
- **Helmet.js**: Comprehensive security headers (CSP, HSTS, etc.)
- **CORS**: Configured for production security
- **Content Security Policy**: Protects against XSS attacks

## Security Configuration

### Environment Variables
```bash
# Generate strong session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set in .env file
SESSION_SECRET=<generated-secret>
NODE_ENV=production
SECURE_COOKIES=true
```

### Google OAuth (Optional)
Only set these if using Google authentication:
```bash
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

**⚠️ CRITICAL**: Never expose OAuth secrets in:
- Git repositories
- Log files
- Client-side code
- Error messages

## Security Best Practices

### For Deployment
1. **Always use HTTPS** in production
2. **Set strong SESSION_SECRET** before deploying
3. **Enable secure cookies** (NODE_ENV=production)
4. **Monitor security logs** regularly
5. **Keep dependencies updated** (`npm audit fix`)
6. **Backup users.json** regularly
7. **Use Redis** for session storage in production

### For Development
1. Test with `NODE_ENV=development` first
2. Never commit `.env` file
3. Use separate OAuth credentials for dev/prod
4. Review security logs for anomalies
5. Test rate limiting and validation

### For Users
1. Use strong, unique passwords
2. Enable Google OAuth for additional security
3. Monitor account activity
4. Report suspicious behavior
5. Keep uploaded files under 50MB

## Security Monitoring

### Log Locations
Security events are logged to console with `[SECURITY]` prefix:
```
[SECURITY] 2024-01-15T12:00:00.000Z - LOGIN_SUCCESS: {"userId":"123","email":"user@example.com","ip":"1.2.3.4"}
[SECURITY] 2024-01-15T12:05:00.000Z - FILE_UPLOAD_SUCCESS: {"userId":"123","filename":"data.csv","size":1048576,"ip":"1.2.3.4"}
[SECURITY] 2024-01-15T12:10:00.000Z - RATE_LIMIT_EXCEEDED: {"ip":"5.6.7.8","path":"/auth/login"}
```

### Events to Monitor
- **RATE_LIMIT_EXCEEDED**: Potential brute force attempts
- **FILE_UPLOAD_REJECTED**: Suspicious file upload attempts
- **QUERY_VALIDATION_FAILED**: Potential injection attacks
- **CLEANUP_ERROR**: File system issues
- **AUTH_ERROR**: Authentication system problems

### Monitoring Tools
Set up alerts for:
1. Multiple failed login attempts from same IP
2. Unusual file upload patterns
3. High rate of validation failures
4. Repeated rate limit hits
5. Session errors or regeneration failures

## Incident Response

### If Compromise Suspected
1. **Rotate all secrets immediately**
   ```bash
   # Generate new SESSION_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Update .env and restart server
   ```

2. **Review security logs** for anomalies
   ```bash
   grep "\[SECURITY\]" logs/*.log | grep -i "failed\|error\|exceeded"
   ```

3. **Force logout all users**
   - Restart server with new SESSION_SECRET
   - Clear Redis session store if used

4. **Check uploaded files** for malicious content
   ```bash
   find uploads/ -type f -mtime -7 -ls
   ```

5. **Verify user accounts** for unauthorized changes
   ```bash
   cat data/users.json | jq .
   ```

### If OAuth Compromised
1. **Revoke credentials** in Google Cloud Console immediately
2. **Generate new OAuth credentials**
3. **Update .env** with new credentials
4. **Restart server**
5. **Notify affected users**

## Security Roadmap

### Completed (v1.0)
- ✅ Session security hardening
- ✅ Authentication rate limiting
- ✅ File upload validation
- ✅ Path traversal prevention
- ✅ CSV injection prevention
- ✅ Input validation and sanitization
- ✅ Comprehensive security logging

### Future Enhancements (v1.1+)
- 🔄 Two-factor authentication (2FA)
- 🔄 Email verification for registration
- 🔄 Password complexity requirements
- 🔄 Security headers tuning
- 🔄 Automated security scanning
- 🔄 Encrypted file storage
- 🔄 Database migration from JSON to PostgreSQL
- 🔄 Security audit logs dashboard
- 🔄 CSRF token implementation
- 🔄 Content Security Policy refinement

## Compliance

### Data Protection
- User passwords are hashed with bcrypt (never stored plaintext)
- Session data uses secure, encrypted cookies
- User data stored in protected `data/` directory
- File uploads isolated per user in `uploads/user_<id>/`

### GDPR Considerations
- User data cleanup on account deletion
- Data export capability through file downloads
- Session expiry (24 hours)
- Clear data retention policies

## Contact

For security concerns or vulnerabilities, please contact:
- **GitHub Issues**: [Report a security issue](https://github.com/DHYEY166/MultiLLM/issues)
- **Email**: Create a private security disclosure

## Changelog

### v1.0.0 (2024-01-15)
- Initial security implementation
- Session hardening with crypto-generated secrets
- Enhanced authentication with rate limiting
- File upload security improvements
- Path traversal protection
- CSV injection prevention
- Query validation and sanitization
- Comprehensive security logging

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0  
**Status**: Production Ready
