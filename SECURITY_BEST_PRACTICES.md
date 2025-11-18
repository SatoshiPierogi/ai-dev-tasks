# Security Best Practices

Development and operational security guidelines for Agent Audit Dashboard.

## Development Guidelines

### 1. Code Security

**Never Hardcode Secrets:**
```typescript
// ✗ Bad: Secret in code
const apiKey = 'sk-12345678';
const dbPassword = 'myPassword123';

// ✓ Good: Use environment variables
const apiKey = process.env.API_KEY;
const dbPassword = process.env.DATABASE_PASSWORD;
```

**Validate All Input:**
```typescript
// ✗ Bad: No validation
app.post('/api/agents', (req, res) => {
  db.query('INSERT INTO agents VALUES (...)', [req.body]);
});

// ✓ Good: Validate everything
app.post('/api/agents', (req, res) => {
  const { name, type } = req.body;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (name.length > 255) {
    return res.status(400).json({ error: 'Name too long' });
  }
  
  // Process...
});
```

**Use Parameterized Queries:**
```typescript
// ✗ Bad: String concatenation
const user = await db.query(
  `SELECT * FROM users WHERE id = ${req.params.id}`
);

// ✓ Good: Parameterized
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [req.params.id]
);
```

**Log Securely:**
```typescript
// ✗ Bad: Logging sensitive data
logger.info(`User login: ${user.email} password: ${password}`);

// ✓ Good: No sensitive data
logger.info(`User login: ${user.email}`);
logger.debug(`Auth attempt for IP ${req.ip}`);
```

### 2. Authentication Security

**Strong Passwords:**
```typescript
// Enforce minimum requirements
const passwordRules = {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

function isPasswordStrong(password: string): boolean {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password) &&
         /[!@#$%^&*]/.test(password);
}
```

**Secure Token Management:**
```typescript
// Short expiration times
const TOKEN_EXPIRY = '24h';      // Access token
const REFRESH_EXPIRY = '7d';    // Refresh token

// Invalidate old tokens on password change
app.post('/api/auth/change-password', async (req, res) => {
  // Change password
  await updatePassword(user.id, newPassword);
  
  // Invalidate all existing tokens
  await invalidateTokens(user.id);
  
  // Force re-login
  res.json({ message: 'Please login again' });
});
```

### 3. Authorization Security

**Principle of Least Privilege:**
```typescript
// Database user for API (read-only)
const readOnlyUser = 'api_readonly';

// Database user for migrations (full access)
const adminUser = 'postgres';

// Application roles
enum Role {
  ADMIN = 'admin',      // Full access
  USER = 'user',        // Own resources
  VIEWER = 'viewer'     // Read-only
}

// Check permissions on every endpoint
app.delete('/api/agents/:id', (req, res) => {
  const agent = await getAgent(req.params.id);
  
  // Only owner or admin can delete
  if (req.user.id !== agent.userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Proceed with deletion
});
```

### 4. Error Handling

**Don't Leak Information:**
```typescript
// ✗ Bad: Reveals too much
if (!user) {
  res.status(404).json({ 
    error: 'User not found',
    userId: req.params.id,
    query: 'SELECT * FROM users WHERE id = ?'
  });
}

// ✓ Good: Generic error messages
if (!user) {
  res.status(401).json({ error: 'Invalid credentials' });
}
```

**Log Details Securely:**
```typescript
// Log full error for debugging (not exposed to user)
logger.error('Database error', {
  error: dbError.message,
  query: dbError.query,
  userId: req.user?.id
});

// Return generic message to user
res.status(500).json({ error: 'An error occurred' });
```

---

## Deployment Security

### 1. Environment Configuration

**Secure .env Setup:**
```bash
# Never commit .env
echo ".env" >> .gitignore

# Create .env.example for reference
# Change all actual values in .env

# Verify before deployment
grep -E "password|secret|key" .env
# Should show actual values, not placeholders

# Use secrets manager in production
# AWS Secrets Manager
# Azure Key Vault
# HashiCorp Vault
```

### 2. HTTPS/TLS

**Always Use HTTPS:**
```nginx
# Redirect all HTTP to HTTPS
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
  listen 443 ssl http2;
  
  # Use modern TLS only
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...;
}
```

**Certificate Management:**
```bash
# Let's Encrypt (free)
certbot certonly --standalone -d yourdomain.com

# Auto-renewal
certbot renew --dry-run

# Monitor expiration
echo "0 0 * * * certbot renew" | crontab -
```

### 3. Database Security

**Access Control:**
```sql
-- Create least-privilege users
CREATE USER app_read ENCRYPTED PASSWORD 'strong-pass';
CREATE USER app_write ENCRYPTED PASSWORD 'strong-pass';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE agent_audit TO app_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;

GRANT CREATE ON DATABASE agent_audit TO app_write;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES TO app_write;

-- Use appropriate user for each operation
# Read queries: app_read
# Writes: app_write
# Migrations: postgres admin only
```

**Backups:**
```bash
# Regular automated backups
0 2 * * * pg_dump agent_audit | gzip > /backup/agent_audit_$(date +\%Y\%m\%d).sql.gz

# Test restore periodically
pg_restore /backup/agent_audit_20251118.sql.gz

# Encrypt backups
gpg --encrypt /backup/agent_audit_20251118.sql.gz

# Off-site storage
# AWS S3, Azure Blob, Google Cloud Storage
```

### 4. Network Security

**Firewall Configuration:**
```bash
# UFW (Ubuntu)
ufw default deny incoming
ufw default allow outgoing

# Allow HTTPS
ufw allow 443/tcp

# Allow SSH from specific IP
ufw allow from 203.0.113.0 to any port 22

# Database internal only
ufw allow from 10.0.0.0/24 to any port 5432

ufw enable
```

**DDoS Protection:**
```bash
# Use CDN (Cloudflare, Akamai)
# Rate limiting at Nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req zone=general burst=20 nodelay;

# Database connection limits
max_connections = 100
```

---

## Operational Security

### 1. Monitoring

**Security Monitoring:**
```typescript
// Monitor login attempts
SELECT user_id, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'LOGIN' AND success = false
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5;

// Monitor privilege escalation
SELECT * FROM audit_logs
WHERE action = 'ROLE_CHANGE'
  AND timestamp > NOW() - INTERVAL '1 day';

// Monitor data access
SELECT user_id, COUNT(*) 
FROM audit_logs
WHERE action = 'DATA_ACCESS'
GROUP BY user_id
ORDER BY COUNT(*) DESC;
```

**Alert on Suspicious Activity:**
```bash
# Failed login attempts
if [ $(failed_logins) -gt 10 ]; then
  send_alert "Failed login threshold exceeded"
fi

# Unusual data access
if [ $(data_access_rate) -gt 1000 ]; then
  send_alert "Unusual data access detected"
fi

# System errors
if [ $(error_rate) -gt 0.05 ]; then
  send_alert "Error rate above threshold"
fi
```

### 2. Audit Logging

**Track All Changes:**
```typescript
// Log every important event
auditLog('LOGIN', userId, { ip, userAgent });
auditLog('LOGOUT', userId);
auditLog('PASSWORD_CHANGE', userId);
auditLog('PERMISSION_GRANT', userId, { targetUser, role });
auditLog('DATA_EXPORT', userId, { recordCount });
auditLog('CONFIG_CHANGE', adminId, { setting, oldValue, newValue });

// Keep logs for compliance
// Minimum 1 year retention
// Backup regularly
// Audit access to logs
```

### 3. Incident Response

**Prepare Response Plan:**

1. **Detection & Analysis** (0-1 hour)
   - Identify the incident
   - Determine scope and severity
   - Notify incident response team

2. **Containment** (1-4 hours)
   - Stop ongoing exploit
   - Isolate affected systems
   - Preserve evidence

3. **Eradication** (4-24 hours)
   - Remove malware/compromise
   - Patch vulnerabilities
   - Close attack vectors

4. **Recovery** (24-72 hours)
   - Restore from clean backups
   - Verify integrity
   - Return to normal operations

5. **Post-Incident** (1+ week)
   - Complete investigation
   - Update security measures
   - Inform stakeholders

---

## Security Checklist

### Weekly
- [ ] Review audit logs for anomalies
- [ ] Check for failed authentication attempts
- [ ] Monitor error rates and exceptions
- [ ] Verify backups completed successfully

### Monthly
- [ ] Dependency vulnerability scan
- [ ] Security header verification
- [ ] Access control audit
- [ ] Review user permissions

### Quarterly
- [ ] Full security assessment
- [ ] Penetration testing (internal)
- [ ] Compliance review
- [ ] Team security training

### Annually
- [ ] Third-party security audit
- [ ] Penetration testing (external)
- [ ] Code security review
- [ ] Update security policies

---

## Secure Coding Standards

### DO's ✓

- ✓ Validate ALL input
- ✓ Use parameterized queries
- ✓ Hash passwords with bcrypt
- ✓ Use HTTPS/TLS
- ✓ Implement rate limiting
- ✓ Log security events
- ✓ Use security headers
- ✓ Test security regularly
- ✓ Keep dependencies updated
- ✓ Document security decisions

### DON'Ts ✗

- ✗ Hardcode secrets
- ✗ Log sensitive data
- ✗ Use weak passwords
- ✗ Trust user input
- ✗ Skip validation
- ✗ Use deprecated crypto
- ✗ Expose error details
- ✗ Ignore security warnings
- ✗ Allow unrestricted file uploads
- ✗ Use default credentials

---

## Further Resources

- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **npm Security**: https://www.npmjs.com/advisories
- **GitHub Security**: https://github.blog/
- **Snyk**: https://snyk.io/

---

**Remember: Security is everyone's responsibility.**

For security concerns: security@yourdomain.com
