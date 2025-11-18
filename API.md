# API Documentation

Complete reference for Agent Audit Dashboard REST API endpoints and usage examples.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints (except auth) require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:** (201)
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login User

**POST** `/auth/login`

Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** (200)
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Refresh Token

**POST** `/auth/refresh`

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** (200)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Logout

**POST** `/auth/logout`

Invalidate refresh token.

**Response:** (200)
```json
{
  "success": true
}
```

---

## Agent Endpoints

### List Agents

**GET** `/agents`

Get all agents for authenticated user.

**Query Parameters:**
- `limit`: (optional) Number of results (default: 20)
- `offset`: (optional) Number to skip (default: 0)
- `status`: (optional) Filter by status (active, paused, disabled)

**Response:** (200)
```json
{
  "agents": [
    {
      "id": "agent-456",
      "userId": "user-123",
      "name": "Arbitrage Bot",
      "type": "arbitrage",
      "status": "active",
      "description": "Automated arbitrage trader",
      "createdAt": "2025-11-01T10:00:00Z",
      "updatedAt": "2025-11-18T15:30:00Z",
      "stats": {
        "totalTransactions": 45,
        "successfulTransactions": 43,
        "failedTransactions": 2,
        "successRate": 0.9556
      }
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

### Get Agent

**GET** `/agents/:agentId`

Get specific agent details.

**Response:** (200)
```json
{
  "id": "agent-456",
  "userId": "user-123",
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "status": "active",
  "description": "Automated arbitrage trader",
  "config": {
    "minProfit": "100",
    "maxSlippage": "0.5",
    "gasLimit": "500000"
  },
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-18T15:30:00Z"
}
```

### Create Agent

**POST** `/agents`

Create a new AI agent.

**Request:**
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "description": "Automated arbitrage trader",
  "config": {
    "minProfit": "100",
    "maxSlippage": "0.5",
    "gasLimit": "500000"
  }
}
```

**Response:** (201)
```json
{
  "id": "agent-456",
  "userId": "user-123",
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "status": "active",
  "createdAt": "2025-11-18T15:30:00Z"
}
```

### Update Agent

**PUT** `/agents/:agentId`

Update agent configuration.

**Request:**
```json
{
  "name": "Improved Arbitrage Bot",
  "config": {
    "minProfit": "200",
    "maxSlippage": "0.3"
  }
}
```

**Response:** (200)
```json
{
  "id": "agent-456",
  "name": "Improved Arbitrage Bot",
  "updatedAt": "2025-11-18T16:00:00Z"
}
```

### Delete Agent

**DELETE** `/agents/:agentId`

Delete an agent.

**Response:** (204) No Content

---

## Transaction Endpoints

### List Transactions

**GET** `/transactions`

Get transactions for authenticated user.

**Query Parameters:**
- `agentId`: (optional) Filter by agent
- `status`: (optional) pending, verified, failed
- `limit`: (optional) Number of results
- `offset`: (optional) Skip number

**Response:** (200)
```json
{
  "transactions": [
    {
      "id": "tx-001",
      "agentId": "agent-456",
      "userId": "user-123",
      "txHash": "0x123abc...",
      "protocol": "uniswap",
      "amount": "1.5",
      "status": "verified",
      "createdAt": "2025-11-18T10:00:00Z",
      "verifiedAt": "2025-11-18T10:05:00Z"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### Get Transaction

**GET** `/transactions/:txId`

Get transaction details.

**Response:** (200)
```json
{
  "id": "tx-001",
  "agentId": "agent-456",
  "txHash": "0x123abc...",
  "protocol": "uniswap",
  "amount": "1.5",
  "status": "verified",
  "verification": {
    "blockNumber": 18500000,
    "gasUsed": "150000",
    "gasPrice": "25",
    "ethPrice": "2100",
    "profitLoss": "250"
  },
  "createdAt": "2025-11-18T10:00:00Z",
  "verifiedAt": "2025-11-18T10:05:00Z"
}
```

### Create Transaction

**POST** `/transactions`

Create a new transaction record.

**Request:**
```json
{
  "agentId": "agent-456",
  "txHash": "0x123abc...",
  "protocol": "uniswap",
  "amount": "1.5"
}
```

**Response:** (201)
```json
{
  "id": "tx-001",
  "agentId": "agent-456",
  "txHash": "0x123abc...",
  "status": "pending",
  "createdAt": "2025-11-18T10:00:00Z"
}
```

---

## Verification Endpoints

### Verify Transaction

**POST** `/verify/:txHash`

Verify a transaction on blockchain.

**Request:**
```json
{
  "agentId": "agent-456"
}
```

**Response:** (200)
```json
{
  "txHash": "0x123abc...",
  "status": "verified",
  "blockNumber": 18500000,
  "gasUsed": "150000",
  "proof": {
    "blockHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "1500000000000000000"
  },
  "timestamp": "2025-11-18T10:05:00Z"
}
```

### Get Verification

**GET** `/verify/:txHash`

Get verification details for transaction.

**Response:** (200)
```json
{
  "txHash": "0x123abc...",
  "status": "verified",
  "blockNumber": 18500000,
  "gasUsed": "150000",
  "gasPrice": "25",
  "ethPrice": "2100",
  "profitLoss": "250",
  "verifiedAt": "2025-11-18T10:05:00Z"
}
```

---

## Analytics Endpoints

### Get Metrics

**GET** `/analytics/metrics`

Get overall system metrics.

**Query Parameters:**
- `timeWindow`: (optional) Time window in seconds (default: 3600)

**Response:** (200)
```json
{
  "timeWindow": 3600000,
  "metrics": {
    "totalEvents": 1250,
    "totalTransactions": 45,
    "successfulTransactions": 43,
    "failedTransactions": 2,
    "successRate": 0.9556,
    "apiRequests": 342,
    "apiErrors": 2,
    "errorRate": 0.0058,
    "averageResponseTime": 145
  }
}
```

### Get User Analytics

**GET** `/analytics/users/:userId`

Get analytics for specific user.

**Response:** (200)
```json
{
  "analytics": {
    "userId": "user-123",
    "totalEvents": 150,
    "totalTransactions": 12,
    "totalAgents": 3,
    "lastActivityAt": "2025-11-18T16:00:00Z",
    "firstActivityAt": "2025-11-01T10:00:00Z"
  },
  "recentEvents": [...]
}
```

### Get Agent Analytics

**GET** `/analytics/agents/:agentId`

Get analytics for specific agent.

**Response:** (200)
```json
{
  "analytics": {
    "agentId": "agent-456",
    "totalTransactions": 45,
    "successfulTransactions": 43,
    "failedTransactions": 2,
    "successRate": 0.9556,
    "averageTransactionTime": 2500
  }
}
```

### Get System Health

**GET** `/analytics/health`

Get system health status.

**Response:** (200)
```json
{
  "status": "healthy",
  "metrics": {
    "errorRate": "0.58",
    "avgResponseTime": "145.32",
    "totalRequests": 342,
    "transactionSuccess": "95.56"
  }
}
```

---

## Admin Endpoints

### List All Users

**GET** `/admin/users` (Admin only)

Get all users in system.

**Response:** (200)
```json
{
  "users": [
    {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "total": 50
}
```

### Suspend User

**POST** `/admin/users/:userId/suspend` (Admin only)

Suspend user account.

**Response:** (200)
```json
{
  "userId": "user-123",
  "status": "suspended",
  "suspendedAt": "2025-11-18T16:00:00Z"
}
```

### System Settings

**GET** `/admin/settings` (Admin only)

Get system settings.

**Response:** (200)
```json
{
  "cacheTTL": 3600,
  "maxCacheSize": "512MB",
  "archivalRetention": 30,
  "verificationTimeout": 300
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "message": "Email is required",
  "details": {...}
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "Not found",
  "message": "Agent not found"
}
```

### 500 Server Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "requestId": "req-123456"
}
```

---

## Rate Limiting

API has rate limiting:
- **Limit**: 1000 requests per hour
- **Header**: `X-RateLimit-Remaining`
- **Reset**: `X-RateLimit-Reset`

---

## Pagination

List endpoints support pagination:

```
GET /agents?limit=20&offset=0
```

Response includes:
```json
{
  "data": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

## WebSocket Connection

Connect to real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

// Send authentication
ws.send(JSON.stringify({
  type: 'AUTHENTICATE',
  data: { token: 'your-jwt-token' }
}));

// Subscribe to events
ws.send(JSON.stringify({
  type: 'SUBSCRIBE',
  data: { channels: ['agent:123', 'transactions'] }
}));

// Receive updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message);
};
```

---

## Example Usage

### Create and Monitor Agent

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123",
    "name": "John Doe"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123"
  }'

# 3. Create Agent
curl -X POST http://localhost:3000/api/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Arbitrage Bot",
    "type": "arbitrage",
    "description": "Automated arbitrage"
  }'

# 4. List Transactions
curl -X GET http://localhost:3000/api/transactions \
  -H "Authorization: Bearer <token>"

# 5. Verify Transaction
curl -X POST http://localhost:3000/api/verify/0x123abc... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent-456"}'
```

---

## API Versioning

Currently on **v1** (no version prefix).

Future versions will use `/api/v2/` prefix.

---

**For complete API specification, see [docs/API-SPEC.md](docs/API-SPEC.md)**
