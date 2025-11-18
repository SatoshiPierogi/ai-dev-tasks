# Security Hardening Guide

Comprehensive security documentation for Agent Audit Dashboard production deployment.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [API Security](#api-security)
5. [Data Protection](#data-protection)
6. [Infrastructure Security](#infrastructure-security)
7. [Dependency Management](#dependency-management)
8. [OWASP Compliance](#owasp-compliance)
9. [Security Testing](#security-testing)
10. [Incident Response](#incident-response)
11. [Compliance & Standards](#compliance--standards)

---

## Security Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal permissions required
3. **Zero Trust**: Verify every request
4. **Secure by Default**: Security enabled without configuration
5. **Security Monitoring**: Continuous observation and alerting

### Current Security Posture

- ✅ JWT Authentication
- ✅ Role-Based Access Control (RBAC)
- ✅ Password hashing with bcrypt
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ HTTPS/SSL support
- ✅ Environment variable protection
- ✅ Audit logging

---

## Authentication & Authorization

### JWT Token Strategy

**Token Structure:**
```
Header.Payload.Signature

{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "id": "user-123",
  "email": "user@example.com",
  "role": "user",
  "iat": 1700000000,
  "exp": 1700086400
}
```

**Token Lifecycle:**
- **Issued**: Upon successful login
- **Duration**: 24 hours (configurable)
- **Refresh**: Using refresh token
- **Revocation**: On logout

**Best Practices:**
```typescript
// ✓ Good: Short-lived tokens
const TOKEN_EXPIRY = '24h';

// ✗ Bad: Long-lived tokens
const TOKEN_EXPIRY = '30d';

// ✓ Good: Secure storage
localStorage.setItem('token', token);
// But better: httpOnly cookie
res.cookie('token', token, { httpOnly: true });

// ✓ Good: Token rotation
// Refresh token periodically

// ✗ Bad: Token in URL
GET /api/agents?token=abc123
```

### Password Security

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

**Hashing:**
```typescript
// Use bcrypt with salt rounds
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Never:**
- ✗ Store passwords in plain text
- ✗ Use weak hashing (MD5, SHA1)
- ✗ Transmit passwords over HTTP
- ✗ Log passwords

### Role-Based Access Control (RBAC)

**Roles:**
```typescript
enum UserRole {
  ADMIN = 'admin',      // Full system access
  USER = 'user',        // Own resources only
  GUEST = 'guest'       // Read-only access
}
```

**Permission Matrix:**
```
Resource    Admin  User   Guest
Users       R/W    R(own) -
Agents      R/W    R/W    R
Transactions R/W    R/W    R
Settings    R/W    R(own) -
Analytics   R/W    R      -
```

**Implementation:**
```typescript
// Middleware for role-based access
const requireRole = (roles: UserRole[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
app.get('/admin/users', requireRole(['admin']), getUsers);
```

---

## Input Validation & Sanitization

### Validation Strategy

**All Input is Untrusted:**
```typescript
// Always validate and sanitize
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): boolean {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[!@#$%^&*]/.test(password);
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '')
    .substring(0, 255);
}
```

### SQL Injection Prevention

**Parameterized Queries:**
```typescript
// ✓ Good: Parameterized query
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ✗ Bad: String concatenation
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### XSS Prevention

**Output Encoding:**
```typescript
// React automatically escapes by default
<div>{userInput}</div>  // Safe

// But not for HTML attributes
<div data-value={userInput}>  // Safe
<div dangerouslySetInnerHTML={{__html: userInput}}>  // Dangerous!

// Use library for HTML content
import DOMPurify from 'dompurify';
<div>{DOMPurify.sanitize(userInput)}</div>
```

### CSRF Protection

**Token-Based:**
```typescript
// Generate CSRF token
const csrfToken = crypto.randomBytes(32).toString('hex');

// Validate on state-changing requests
app.post('/api/agents', (req, res) => {
  if (req.headers['x-csrf-token'] !== csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Process request
});
```

---

## API Security

### Rate Limiting

**Configuration:**
```typescript
const limiter = rateLimit({
  windowMs: 60000,           // 1 minute
  max: 1000,                 // 1000 requests
  message: 'Too many requests',
  standardHeaders: true,     // Return rate limit info
  legacyHeaders: false
});

app.use(limiter);

// Specific endpoint limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5                      // 5 login attempts
});

app.post('/api/auth/login', authLimiter, login);
```

### CORS Configuration

**Secure Setup:**
```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGIN, // Specific domain only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
};

app.use(cors(corsOptions));
```

### HTTP Headers

**Security Headers:**
```typescript
// Helmet.js for security headers
import helmet from 'helmet';

app.use(helmet());

// Or manual configuration
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable XSS protection
  res.set('X-XSS-Protection', '1; mode=block');
  
  // HSTS - Force HTTPS
  res.set('Strict-Transport-Security', 'max-age=31536000');
  
  // Content Security Policy
  res.set('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'");
  
  next();
});
```

### API Versioning

```typescript
// Use versioning for compatibility
// /api/v1/agents
// /api/v2/agents

// Never break existing versions
// Deprecate gradually with warnings
```

---

## Data Protection

### Encryption at Rest

**Database Encryption:**
```sql
-- Enable PostgreSQL encryption
-- Using pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
ALTER TABLE users ADD COLUMN wallet_encrypted TEXT;

UPDATE users SET wallet_encrypted = 
  pgp_sym_encrypt(wallet_address, 'encryption-key')
WHERE wallet_address IS NOT NULL;
```

### Encryption in Transit

**HTTPS/TLS:**
```bash
# Redirect HTTP to HTTPS
server {
  listen 80;
  return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
  listen 443 ssl http2;
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  # Use modern TLS
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Environment Variables

**Never Commit Secrets:**
```bash
# .env (not committed)
DATABASE_PASSWORD=secret123
JWT_SECRET=long-random-secret
API_KEY=key123

# .env.example (committed)
DATABASE_PASSWORD=<change-me>
JWT_SECRET=<change-me>
API_KEY=<change-me>
```

### Audit Logging

**Track All Changes:**
```typescript
// Log all important events
function auditLog(action: string, userId: string, details: any) {
  db.query(
    'INSERT INTO audit_logs (action, user_id, details, timestamp) VALUES ($1, $2, $3, $4)',
    [action, userId, JSON.stringify(details), new Date()]
  );
}

// Usage
auditLog('LOGIN', user.id, { ip: req.ip });
auditLog('AGENT_CREATED', user.id, { agentId: agent.id });
auditLog('AGENT_DELETED', user.id, { agentId: agent.id });
```

---

## Infrastructure Security

### Database Security

**Principle of Least Privilege:**
```sql
-- Create read-only user for API
CREATE USER api_readonly WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE agent_audit TO api_readonly;
GRANT USAGE ON SCHEMA public TO api_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_readonly;

-- Create write user for migrations
CREATE USER api_write WITH PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE agent_audit TO api_write;

-- Use appropriate user for different operations
# Read-only queries: api_readonly
# Migrations: api_write
```

**Connection Security:**
```
# SSL connections only
sslmode=require

# Connection pooling
PGSQL_CONN_POOL_SIZE=20
```

### Network Security

**Firewall Rules:**
```bash
# Allow only necessary ports
# Port 80: HTTP (redirect to HTTPS)
# Port 443: HTTPS
# Port 5432: PostgreSQL (internal only)
# Port 6379: Redis (internal only)

# Allow specific IPs only
iptables -A INPUT -p tcp --dport 443 -s <trusted-ip> -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s <server-ip> -j ACCEPT
```

### Docker Security

**Container Security:**
```dockerfile
# Use specific base image versions
FROM node:18-alpine

# Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Remove unnecessary packages
RUN apk del apk-tools

# Read-only filesystem
--read-only

# Limited capabilities
--cap-drop=all
--cap-add=NET_BIND_SERVICE
```

---

## Dependency Management

### Audit Dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix known vulnerabilities
npm audit fix

# Check specific package
npm audit <package-name>

# Generate audit report
npm audit --json > audit.json
```

### Keep Dependencies Updated

```bash
# Check outdated packages
npm outdated

# Update packages safely
npm update

# Update major versions
npm install npm@latest -g
ncu -u  # using npm-check-updates
```

### Dangerous Packages

**Never use:**
- Old/unmaintained packages
- Packages with known vulnerabilities
- Packages with excessive dependencies
- Packages with suspicious behavior

---

## OWASP Compliance

### OWASP Top 10 Coverage

| Issue | Status | Implementation |
|-------|--------|-----------------|
| Injection | ✅ Protected | Parameterized queries |
| Broken Auth | ✅ Protected | JWT + role-based |
| Sensitive Data | ✅ Protected | Encryption + TLS |
| XML/XXE | ✅ Protected | XML parsing restricted |
| Broken Access | ✅ Protected | RBAC middleware |
| Security Config | ✅ Protected | Security headers |
| XSS | ✅ Protected | Input validation |
| Deserialization | ✅ Protected | Type validation |
| Components | ✅ Protected | Dependency audit |
| Logging | ✅ Protected | Audit logging |

---

## Security Testing

### Automated Testing

```bash
# Run security tests
npm run test:security

# SAST (Static Application Security Testing)
npm run lint:security

# Dependency scanning
npm audit

# Container scanning
docker scan <image>
```

### Manual Testing Checklist

- [ ] Try SQL injection: `' OR '1'='1`
- [ ] Test authentication bypass
- [ ] Verify rate limiting works
- [ ] Check CORS configuration
- [ ] Test file upload validation
- [ ] Verify password requirements
- [ ] Check token expiration
- [ ] Test role-based access
- [ ] Verify HTTPS redirect
- [ ] Check security headers

### Penetration Testing

**Regular testing:** Quarterly minimum

**Areas to test:**
- Authentication mechanisms
- Authorization controls
- Input validation
- API security
- Data encryption
- Session management
- Error handling

---

## Incident Response

### Security Incident Procedures

**If Breach Detected:**

1. **Immediate Actions (0-1 hour)**
   - Isolate affected systems
   - Preserve evidence/logs
   - Notify security team
   - Stop further exploitation

2. **Investigation (1-24 hours)**
   - Determine scope and impact
   - Identify root cause
   - Review logs and backups
   - Document findings

3. **Remediation (24-72 hours)**
   - Patch vulnerabilities
   - Reset compromised credentials
   - Restore from clean backups
   - Verify system integrity

4. **Communication (Ongoing)**
   - Notify affected users
   - Provide remediation steps
   - Publish security update
   - Monitor for exploitation

### Security Contact

```
Security Issues: security@yourdomain.com
Not: public issue tracker
Response Time: Within 24 hours
```

---

## Compliance & Standards

### Standards Met

- ✅ OWASP Top 10
- ✅ CWE Top 25
- ✅ NIST Cybersecurity Framework
- ✅ GDPR data protection

### Privacy

**GDPR Compliance:**
- Right to access data
- Right to be forgotten
- Data portability
- Breach notification (72 hours)

**Implementation:**
```typescript
// Data export endpoint
app.get('/api/users/me/export', (req, res) => {
  const userData = await getUserData(req.user.id);
  res.download(userData, 'my-data.json');
});

// Data deletion
app.delete('/api/users/me', async (req, res) => {
  await deleteUserData(req.user.id);
  await auditLog('USER_DELETE', req.user.id);
  res.json({ success: true });
});
```

---

## Security Checklist

### Development
- [ ] Input validation on all endpoints
- [ ] Parameterized queries for all database access
- [ ] Password hashing with bcrypt
- [ ] JWT token implementation
- [ ] RBAC for authorization
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Secrets not in code
- [ ] Error messages don't leak info

### Testing
- [ ] Security tests automated
- [ ] Penetration testing done
- [ ] Dependency audit passed
- [ ] SAST scan completed
- [ ] No hardcoded credentials
- [ ] No test data with real passwords
- [ ] Sensitive logs not exposed

### Deployment
- [ ] HTTPS/TLS enabled
- [ ] Database encryption enabled
- [ ] Firewall configured
- [ ] Secrets in environment variables
- [ ] Backups automated
- [ ] Monitoring enabled
- [ ] Audit logging active
- [ ] Security headers verified
- [ ] Rate limiting active
- [ ] Health checks working

### Operations
- [ ] Dependencies updated regularly
- [ ] Security patches applied
- [ ] Logs monitored
- [ ] Backups tested
- [ ] Incident response plan ready
- [ ] Team trained on security
- [ ] Compliance verified

---

## Security Resources

- [OWASP](https://owasp.org/)
- [CWE](https://cwe.mitre.org/)
- [NIST](https://www.nist.gov/)
- [npm Security Advisories](https://www.npmjs.com/advisories)
- [GitHub Security](https://github.com/features/security)

---

**Last Updated**: November 2025
**Version**: 1.0
**Status**: Production Ready

For security vulnerabilities, contact security@yourdomain.com
