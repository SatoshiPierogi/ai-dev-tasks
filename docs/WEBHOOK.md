# Agent Webhook Specification

## Overview

The Agent Webhook allows AI agents to report their actions to the Agent Audit Dashboard in real-time. This enables the dashboard to track off-chain actions and supplement blockchain data.

**Endpoint**: `POST /api/webhooks/action`

## Authentication

Webhooks are authenticated using HMAC-SHA256 signatures. Each webhook request must include:

1. **Header**: `X-Signature: {signature}`
2. **Body**: Contains the action data and timestamp

### Signature Generation

```typescript
const crypto = require('crypto');

// Secret: Agent's API key (provided during registration)
const secret = process.env.AGENT_WEBHOOK_SECRET;

// Message: Concatenate action data with timestamp
const message = JSON.stringify({
  agent_id: '0x...',
  user_id: 123,
  action_type: 'swap',
  metadata: {...},
  timestamp: new Date().toISOString()
});

// Signature: HMAC-SHA256(message, secret)
const signature = crypto
  .createHmac('sha256', secret)
  .update(message)
  .digest('hex');
```

## Request Format

### POST /api/webhooks/action

```json
{
  "agent_id": "0x1234567890123456789012345678901234567890",
  "user_id": 123,
  "action_type": "swap|transfer|stake|lp|vote|bridge|custom",
  "metadata": {
    "tx_hash": "0x...",
    "protocol": "uniswap_v3",
    "tokens_in": [
      {
        "symbol": "ETH",
        "address": "0x0000000000000000000000000000000000000000",
        "amount": "1.5",
        "decimals": 18
      }
    ],
    "tokens_out": [
      {
        "symbol": "USDC",
        "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "amount": "2500",
        "decimals": 6
      }
    ],
    "description": "Swapped 1 ETH for 2500 USDC on Uniswap V3",
    "gas_used": "120000",
    "gas_price": "50000000000",
    "slippage": 0.5
  },
  "timestamp": "2025-01-18T12:34:56Z",
  "signature": "0x..."
}
```

## Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Agent's contract address (0x...) |
| `user_id` | number | Yes | User ID who owns the agent |
| `action_type` | string | Yes | Type of action (swap, transfer, stake, lp, vote, bridge, custom) |
| `metadata` | object | Yes | Action-specific metadata (see below) |
| `timestamp` | string | Yes | ISO 8601 timestamp of the action |
| `signature` | string | Yes | HMAC-SHA256 signature of the request |

## Metadata Fields

### Required Metadata

All actions must include:
- `tx_hash`: Transaction hash on blockchain (0x...)
- `protocol`: Protocol name (e.g., "uniswap_v3", "aave", "curve")
- `tokens_in`: Array of input tokens (with symbol, address, amount, decimals)
- `tokens_out`: Array of output tokens
- `description`: Human-readable description of the action

### Optional Metadata

- `gas_used`: Gas units consumed (string)
- `gas_price`: Gas price in Wei (string)
- `slippage`: Slippage percentage (number)
- `mev_exposure`: Estimated MEV exposure (number)
- Custom fields relevant to specific protocols

## Action Types

### swap
Decentralized exchange swap

```json
{
  "action_type": "swap",
  "metadata": {
    "protocol": "uniswap_v3",
    "tokens_in": [{symbol: "ETH", ...}],
    "tokens_out": [{symbol: "USDC", ...}],
    "description": "Swapped ETH for USDC"
  }
}
```

### transfer
Token or ETH transfer

```json
{
  "action_type": "transfer",
  "metadata": {
    "to_address": "0x...",
    "tokens": [{symbol: "USDC", amount: "1000", ...}],
    "description": "Transferred 1000 USDC to 0x..."
  }
}
```

### stake
Staking on a protocol (Lido, Ethereum staking, etc.)

```json
{
  "action_type": "stake",
  "metadata": {
    "protocol": "lido",
    "tokens_in": [{symbol: "ETH", amount: "10", ...}],
    "tokens_out": [{symbol: "stETH", amount: "10", ...}],
    "description": "Staked 10 ETH for stETH"
  }
}
```

### lp
Liquidity pool operations (add/remove liquidity)

```json
{
  "action_type": "lp",
  "metadata": {
    "protocol": "uniswap_v3",
    "operation": "add|remove",
    "tokens_in": [{symbol: "ETH", ...}, {symbol: "USDC", ...}],
    "tokens_out": [{symbol: "LP_TOKEN", ...}],
    "description": "Added liquidity to ETH/USDC pool"
  }
}
```

### vote
Governance voting

```json
{
  "action_type": "vote",
  "metadata": {
    "protocol": "aave",
    "proposal_id": "123",
    "vote": "for|against|abstain",
    "voting_power": "1000000000000000000",
    "description": "Voted FOR Aave proposal #123"
  }
}
```

### bridge
Cross-chain bridge transaction

```json
{
  "action_type": "bridge",
  "metadata": {
    "protocol": "stargate",
    "from_chain": "ethereum",
    "to_chain": "arbitrum",
    "tokens_in": [{symbol: "USDC", amount: "1000", ...}],
    "tokens_out": [{symbol: "USDC", amount: "999", ...}],
    "description": "Bridged 1000 USDC from Ethereum to Arbitrum"
  }
}
```

### custom
Custom action (for extensibility)

```json
{
  "action_type": "custom",
  "metadata": {
    "custom_type": "my_custom_action",
    "protocol": "my_protocol",
    "description": "Custom action description",
    "custom_field_1": "value",
    "custom_field_2": "value"
  }
}
```

## Response Format

### Success (200 OK)

```json
{
  "success": true,
  "transaction_id": 12345,
  "message": "Action recorded successfully"
}
```

### Error (4xx/5xx)

```json
{
  "success": false,
  "error": "Invalid signature",
  "code": "INVALID_SIGNATURE",
  "details": {
    "expected": "abc123...",
    "received": "xyz789..."
  }
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_SIGNATURE` | 401 | Signature validation failed |
| `MISSING_FIELDS` | 400 | Required fields missing |
| `INVALID_FORMAT` | 400 | Malformed request |
| `EXPIRED_TIMESTAMP` | 400 | Request timestamp too old (>5 minutes) |
| `DUPLICATE_TX` | 409 | Transaction hash already recorded |
| `USER_NOT_FOUND` | 404 | User ID not found |
| `AGENT_NOT_FOUND` | 404 | Agent not found for this user |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

## Security Considerations

### 1. Signature Validation

Always validate the HMAC signature before processing the webhook:

```typescript
const crypto = require('crypto');

function validateSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}
```

### 2. Timestamp Validation

Verify the timestamp is within acceptable bounds (e.g., <5 minutes old):

```typescript
function validateTimestamp(timestamp: string, maxAgeMs: number = 5 * 60 * 1000): boolean {
  const requestTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  return Math.abs(currentTime - requestTime) <= maxAgeMs;
}
```

### 3. Rate Limiting

Implement rate limiting per agent:
- Max 100 webhook requests per minute per agent
- Max 10,000 per day per agent
- Return 429 if exceeded

### 4. Duplicate Prevention

Track transaction hashes to prevent duplicate entries:
- Check if `tx_hash` already exists for agent
- Return 409 Conflict if duplicate
- Use database unique constraint

### 5. Data Validation

Validate all input:
- Ethereum addresses (0x format, 40 hex chars)
- Token amounts (positive, valid decimal numbers)
- Enum values (action_type, protocol)
- URL/email fields if any

## Implementation Example

### Node.js Agent

```javascript
const crypto = require('crypto');
const axios = require('axios');

class AgentWebhookClient {
  constructor(agentId, userId, webhookSecret, dashboardUrl) {
    this.agentId = agentId;
    this.userId = userId;
    this.webhookSecret = webhookSecret;
    this.dashboardUrl = dashboardUrl;
  }

  async reportAction(actionType, metadata) {
    const timestamp = new Date().toISOString();

    const body = {
      agent_id: this.agentId,
      user_id: this.userId,
      action_type: actionType,
      metadata,
      timestamp,
    };

    // Generate signature
    const message = JSON.stringify(body);
    const signature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(message)
      .digest('hex');

    try {
      const response = await axios.post(
        `${this.dashboardUrl}/api/webhooks/action`,
        body,
        {
          headers: {
            'X-Signature': signature,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Webhook sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Webhook failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async reportSwap(tokensIn, tokensOut, protocol, gasUsed, gasPrice) {
    return this.reportAction('swap', {
      protocol,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      description: `Swapped ${tokensIn[0].symbol} for ${tokensOut[0].symbol}`,
      gas_used: gasUsed,
      gas_price: gasPrice,
    });
  }
}

module.exports = AgentWebhookClient;
```

## Retry Policy

If the webhook fails (5xx errors or timeout):

1. **Immediate retry**: Fail immediately, don't retry on 4xx
2. **Exponential backoff** for transient failures:
   - Retry after 1 second
   - Retry after 4 seconds
   - Retry after 16 seconds
   - Max 3 retries

3. **Circuit breaker**: If >10 consecutive failures, pause webhook for 1 hour

## Testing

### Mock Endpoint

For testing without a full dashboard setup, use:

```bash
# Test webhook signature validation
POST http://localhost:3001/api/webhooks/action
```

See `mockServer.ts` for testing webhook endpoint.

### Curl Example

```bash
curl -X POST http://localhost:3000/api/webhooks/action \
  -H "Content-Type: application/json" \
  -H "X-Signature: abc123..." \
  -d '{
    "agent_id": "0x...",
    "user_id": 1,
    "action_type": "swap",
    "metadata": {...},
    "timestamp": "2025-01-18T12:34:56Z",
    "signature": "..."
  }'
```

## Best Practices

1. **Send immediately**: Report actions as they complete
2. **Include all metadata**: Gas costs, slippage, all token info
3. **Handle errors gracefully**: Implement retry logic
4. **Log webhook failures**: For debugging and monitoring
5. **Use descriptive messages**: Make action descriptions user-friendly
6. **Validate locally first**: Before sending webhook request
7. **Keep webhook secret safe**: Store in environment variables
8. **Rotate secrets periodically**: For security
