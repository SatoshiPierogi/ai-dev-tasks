openapi: 3.0.0
info:
  title: Agent Audit Dashboard API
  description: Real-time monitoring and verification platform for AI crypto agents
  version: 1.0.0
  contact:
    name: API Support
    url: https://github.com/SatoshiPierogi/agent-audit-dashboard
  license:
    name: MIT

servers:
  - url: http://localhost:3000/api
    description: Development server
  - url: https://api.agentaudit.app/api
    description: Production server

tags:
  - name: Authentication
    description: Wallet-based authentication endpoints
  - name: Agents
    description: Agent management (add, list, update, remove)
  - name: Transactions
    description: Transaction activity feed and details
  - name: Verification
    description: Transaction verification proofs
  - name: WebSocket
    description: Real-time updates via WebSocket

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

paths:
  /auth/challenge:
    post:
      tags:
        - Authentication
      summary: Generate authentication challenge
      description: |
        Generate a challenge message for the user to sign with their wallet.
        Used to prove wallet ownership without storing private keys.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChallengeRequest'
      responses:
        '200':
          description: Challenge message generated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChallengeResponse'
        '400':
          description: Invalid wallet address format
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /auth/verify:
    post:
      tags:
        - Authentication
      summary: Verify signed challenge and issue JWT token
      description: |
        Verify the signed challenge message and issue a JWT token.
        The JWT token is used for all subsequent authenticated requests.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyRequest'
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Invalid signature or challenge expired
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '400':
          description: Missing required fields
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

# ============================================================================
# AGENT ENDPOINTS
# ============================================================================

  /agents:
    get:
      tags:
        - Agents
      summary: List all agents for authenticated user
      description: |
        Retrieve all AI agents being monitored by the authenticated user.
        Results include agent status, last activity, and statistics.
      security:
        - BearerAuth: []
      parameters:
        - name: status
          in: query
          description: Filter by agent status
          schema:
            type: string
            enum: [active, paused, error, archived]
        - name: skip
          in: query
          description: Number of results to skip for pagination
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: limit
          in: query
          description: Maximum number of results to return
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: List of agents
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentListResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

    post:
      tags:
        - Agents
      summary: Manually add a new agent to monitor
      description: |
        Add an AI agent to the dashboard by contract address.
        User can provide a custom name and optional tags.
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAgentRequest'
      responses:
        '201':
          description: Agent created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentDetail'
        '400':
          description: Invalid contract address or duplicate agent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /agents/{agentId}:
    get:
      tags:
        - Agents
      summary: Get detailed information for a specific agent
      description: Get full details including statistics, recent activity, and metrics.
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: path
          required: true
          description: Agent ID
          schema:
            type: integer
      responses:
        '200':
          description: Agent details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentDetail'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          description: User does not have access to this agent
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '404':
          description: Agent not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    patch:
      tags:
        - Agents
      summary: Update agent information
      description: Update agent name, status, tags, or other metadata.
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: path
          required: true
          description: Agent ID
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAgentRequest'
      responses:
        '200':
          description: Agent updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentDetail'
        '400':
          description: Invalid update data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          description: Agent not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

    delete:
      tags:
        - Agents
      summary: Remove agent from dashboard
      description: Remove an agent from monitoring. Does not delete historical data.
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: path
          required: true
          description: Agent ID
          schema:
            type: integer
      responses:
        '204':
          description: Agent removed successfully
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          description: Agent not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /agents/{agentId}/transactions:
    get:
      tags:
        - Transactions
      summary: Get transactions for a specific agent
      description: Retrieve activity feed for a single agent with filtering and pagination.
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: path
          required: true
          schema:
            type: integer
        - name: type
          in: query
          description: Filter by transaction type
          schema:
            type: string
            enum: [swap, transfer, stake, lp, vote, bridge, custom]
        - name: protocol
          in: query
          description: Filter by protocol (e.g., uniswap_v3, aave, curve)
          schema:
            type: string
        - name: verificationStatus
          in: query
          description: Filter by verification status
          schema:
            type: string
            enum: [pending, verified, unverified]
        - name: startDate
          in: query
          description: Start date (ISO 8601 format)
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          description: End date (ISO 8601 format)
          schema:
            type: string
            format: date-time
        - name: skip
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
      responses:
        '200':
          description: List of transactions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransactionListResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /agents/{agentId}/stats:
    get:
      tags:
        - Agents
      summary: Get agent performance statistics
      description: |
        Get aggregated statistics for an agent:
        - Total transactions
        - Verification rate
        - Total gas spent
        - Protocols used
        - Win rate (for trading agents)
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: Agent statistics
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentStats'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

# ============================================================================
# TRANSACTION ENDPOINTS
# ============================================================================

  /transactions:
    get:
      tags:
        - Transactions
      summary: Get activity feed for all user agents
      description: |
        Retrieve transactions from all agents owned by the authenticated user.
        Supports filtering by agent, type, protocol, and time range.
      security:
        - BearerAuth: []
      parameters:
        - name: agentId
          in: query
          description: Filter by specific agent
          schema:
            type: integer
        - name: type
          in: query
          description: Filter by transaction type
          schema:
            type: string
            enum: [swap, transfer, stake, lp, vote, bridge, custom]
        - name: protocol
          in: query
          description: Filter by protocol
          schema:
            type: string
        - name: verificationStatus
          in: query
          description: Filter by verification status
          schema:
            type: string
            enum: [pending, verified, unverified]
        - name: startDate
          in: query
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          schema:
            type: string
            format: date-time
        - name: skip
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
      responses:
        '200':
          description: List of transactions
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransactionListResponse'
        '401':
          $ref: '#/components/responses/UnauthorizedError'

  /transactions/{txHash}:
    get:
      tags:
        - Transactions
      summary: Get detailed transaction information
      description: Get full transaction breakdown including inputs, outputs, gas, verification proof.
      security:
        - BearerAuth: []
      parameters:
        - name: txHash
          in: path
          required: true
          description: Transaction hash (0x...)
          schema:
            type: string
      responses:
        '200':
          description: Transaction details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransactionDetail'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          description: Transaction not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

# ============================================================================
# VERIFICATION ENDPOINTS
# ============================================================================

  /verify/{txHash}:
    get:
      tags:
        - Verification
      summary: Get verification proof for a transaction
      description: |
        Retrieve the cryptographic proof that a transaction was verified on-chain.
        Includes block number, event logs, and signatures.
      security:
        - BearerAuth: []
      parameters:
        - name: txHash
          in: path
          required: true
          description: Transaction hash (0x...)
          schema:
            type: string
      responses:
        '200':
          description: Verification proof
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VerificationProof'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          description: No verification proof found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

# ============================================================================
# COMPONENTS (Data Models)
# ============================================================================

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token issued by /auth/verify endpoint

  schemas:
    # Authentication Schemas
    ChallengeRequest:
      type: object
      required:
        - wallet_address
      properties:
        wallet_address:
          type: string
          description: Ethereum wallet address (0x...)
          example: "0x1234567890123456789012345678901234567890"

    ChallengeResponse:
      type: object
      properties:
        challenge:
          type: string
          description: Message to sign with wallet
          example: "Sign this message to prove wallet ownership: [timestamp]"
        expires_at:
          type: string
          format: date-time
          description: Challenge expiration time (5 minutes)

    VerifyRequest:
      type: object
      required:
        - wallet_address
        - signature
        - challenge
      properties:
        wallet_address:
          type: string
          example: "0x1234567890123456789012345678901234567890"
        signature:
          type: string
          description: Signed challenge message (EIP-191 format)
          example: "0x..."
        challenge:
          type: string
          description: Original challenge message

    AuthResponse:
      type: object
      properties:
        access_token:
          type: string
          description: JWT token for authenticated requests
        token_type:
          type: string
          example: "Bearer"
        expires_in:
          type: integer
          description: Token expiration time in seconds
          example: 86400
        user:
          $ref: '#/components/schemas/UserProfile'

    UserProfile:
      type: object
      properties:
        id:
          type: integer
        wallet_address:
          type: string
        email:
          type: string
          nullable: true
        display_name:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time

    # Agent Schemas
    CreateAgentRequest:
      type: object
      required:
        - contract_address
        - agent_name
      properties:
        contract_address:
          type: string
          description: Smart contract address (0x...)
          example: "0x2345678901234567890123456789012345678901"
        agent_name:
          type: string
          description: User-friendly name
          example: "TradingBot_A"
        tags:
          type: array
          items:
            type: string
          example: ["dex-trading", "yield-farming"]

    UpdateAgentRequest:
      type: object
      properties:
        agent_name:
          type: string
        status:
          type: string
          enum: [active, paused, error, archived]
        tags:
          type: array
          items:
            type: string

    AgentDetail:
      type: object
      properties:
        id:
          type: integer
        contract_address:
          type: string
        agent_name:
          type: string
        status:
          type: string
          enum: [active, paused, error, archived]
        last_activity:
          type: string
          format: date-time
          nullable: true
        created_at:
          type: string
          format: date-time
        transaction_count:
          type: integer
        total_gas_spent:
          type: string
          description: Wei as string for precision
        verification_rate:
          type: number
          format: float
          description: Percentage 0-100
          example: 95.5
        tags:
          type: array
          items:
            type: string

    AgentListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/AgentDetail'
        pagination:
          $ref: '#/components/schemas/Pagination'
        total:
          type: integer
          description: Total number of agents

    AgentStats:
      type: object
      properties:
        agent_id:
          type: integer
        total_transactions:
          type: integer
        verified_transactions:
          type: integer
        verification_rate:
          type: number
          format: float
          example: 92.3
        total_gas_spent:
          type: string
          description: Wei
        protocols_used:
          type: integer
        last_activity:
          type: string
          format: date-time
          nullable: true
        first_activity:
          type: string
          format: date-time
          nullable: true
        daily_transactions:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
                format: date
              count:
                type: integer

    # Transaction Schemas
    TokenInfo:
      type: object
      properties:
        symbol:
          type: string
          example: "ETH"
        address:
          type: string
          example: "0x0000000000000000000000000000000000000000"
        amount:
          type: string
          description: Amount as string for precision
          example: "1.5"
        decimals:
          type: integer
          example: 18

    TransactionSummary:
      type: object
      properties:
        id:
          type: integer
        tx_hash:
          type: string
          description: Transaction hash (0x...)
        type:
          type: string
          enum: [swap, transfer, stake, lp, vote, bridge, custom]
        protocol:
          type: string
          example: "uniswap_v3"
        description:
          type: string
          example: "Swapped 1 ETH for 2500 USDC on Uniswap V3"
        tokens_in:
          type: array
          items:
            $ref: '#/components/schemas/TokenInfo'
        tokens_out:
          type: array
          items:
            $ref: '#/components/schemas/TokenInfo'
        verification_status:
          type: string
          enum: [pending, verified, unverified]
        block_timestamp:
          type: string
          format: date-time
        agent_id:
          type: integer

    TransactionDetail:
      allOf:
        - $ref: '#/components/schemas/TransactionSummary'
        - type: object
          properties:
            gas_used:
              type: string
            gas_price:
              type: string
            total_gas_cost:
              type: string
            slippage:
              type: number
              nullable: true
            mev_exposure:
              type: number
              nullable: true
            confirmation_blocks:
              type: integer
            block_number:
              type: integer
              nullable: true
            transaction_index:
              type: integer
              nullable: true
            verification_proof:
              $ref: '#/components/schemas/VerificationProof'

    TransactionListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: '#/components/schemas/TransactionSummary'
        pagination:
          $ref: '#/components/schemas/Pagination'
        total:
          type: integer

    # Verification Schemas
    VerificationProof:
      type: object
      properties:
        tx_hash:
          type: string
        verification_status:
          type: string
          enum: [pending, verified, unverified, error]
        verification_method:
          type: string
          enum: [on_chain, tee_attestation, zk_proof]
        verified_at:
          type: string
          format: date-time
          nullable: true
        block_explorer_url:
          type: string
          nullable: true
          example: "https://etherscan.io/tx/0x..."
        proof_data:
          type: object
          description: Method-specific proof data
          properties:
            transaction_hash:
              type: string
            block_hash:
              type: string
            block_number:
              type: integer
            status:
              type: integer
              description: 1 = success, 0 = failed
            confirmations:
              type: integer
        event_logs:
          type: array
          items:
            type: object
            description: Raw event logs
        signatures:
          type: array
          items:
            type: object
            description: Event signature validation data

    # Common Schemas
    Pagination:
      type: object
      properties:
        skip:
          type: integer
        limit:
          type: integer
        has_more:
          type: boolean

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
          description: Error message
        code:
          type: string
          description: Error code for client handling
          example: "INVALID_WALLET_ADDRESS"
        details:
          type: object
          nullable: true
          description: Additional error details

  responses:
    UnauthorizedError:
      description: Missing or invalid authentication token
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

# ============================================================================
# WEBSOCKET (Real-time Updates)
# ============================================================================

# WebSocket connection: ws://localhost:3000/ws
# Authentication: Include JWT token in query param (?token=...) or via initial message
#
# Client sends (subscription):
# {
#   "type": "subscribe",
#   "agents": [1, 2, 3],  // Agent IDs to subscribe to (optional, default: all)
#   "channels": ["transactions", "verification", "agent_status"]  // Channels to subscribe to
# }
#
# Server sends (transaction update):
# {
#   "type": "transaction_update",
#   "agent_id": 1,
#   "transaction": { ... TransactionSummary ... }
# }
#
# Server sends (verification update):
# {
#   "type": "verification_update",
#   "tx_hash": "0x...",
#   "verification_status": "verified",
#   "proof": { ... VerificationProof ... }
# }
#
# Server sends (agent status update):
# {
#   "type": "agent_status_update",
#   "agent_id": 1,
#   "status": "active",
#   "last_activity": "2025-01-18T12:34:56Z"
# }

# ============================================================================
# WEBHOOK (Agent → Platform)
# ============================================================================

# POST /api/webhooks/action
# Authentication: HMAC signature in header X-Signature
#
# Request body:
# {
#   "agent_id": "0x...",
#   "user_id": 1,
#   "action_type": "swap|transfer|stake|lp|vote|bridge|custom",
#   "metadata": {
#     "tx_hash": "0x...",
#     "protocol": "uniswap_v3",
#     "tokens_in": [...],
#     "tokens_out": [...],
#     "description": "..."
#   },
#   "timestamp": "2025-01-18T12:34:56Z",
#   "signature": "0x..."  // HMAC-SHA256
# }
#
# Response:
# {
#   "success": true,
#   "transaction_id": 12345
# }
