/**
 * API Integration Tests
 * Tests for complete API flows including database, authentication, and business logic
 */

import request from 'supertest';
import { createServer } from '../server';
import { getDatabase } from '../database';

describe('API Integration Tests', () => {
  let app: any;
  let db: any;
  let authToken: string;

  beforeAll(async () => {
    app = createServer();
    db = getDatabase();
    // Perform database setup
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clear test data
    await db.clearAllTables();
  });

  // ============================================================================
  // AUTHENTICATION FLOW
  // ============================================================================

  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should prevent duplicate registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User 2',
        });

      expect(response.status).toBe(409);
    });

    it('should login with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      authToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // AGENT MANAGEMENT FLOW
  // ============================================================================

  describe('Agent Management Flow', () => {
    beforeEach(async () => {
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });
      authToken = authResponse.body.token;
    });

    it('should create a new agent', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test agent description',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Agent');
    });

    it('should get agent details', async () => {
      const createResponse = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test agent description',
        });

      const agentId = createResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe('Test Agent');
    });

    it('should list all agents', async () => {
      // Create multiple agents
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/agents')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Agent ${i}`,
            address: `0x${String(i).padStart(40, '0')}`,
            description: `Description ${i}`,
          });
      }

      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.agents).toHaveLength(3);
    });

    it('should update an agent', async () => {
      const createResponse = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test agent description',
        });

      const agentId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Agent',
          description: 'Updated description',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Agent');
    });

    it('should delete an agent', async () => {
      const createResponse = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test agent description',
        });

      const agentId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(204);

      // Verify deleted
      const getResponse = await request(app)
        .get(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  // ============================================================================
  // TRANSACTION TRACKING FLOW
  // ============================================================================

  describe('Transaction Tracking Flow', () => {
    let agentId: string;

    beforeEach(async () => {
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          name: 'Test User',
        });
      authToken = authResponse.body.token;

      const agentResponse = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test agent',
        });

      agentId = agentResponse.body.id;
    });

    it('should track a transaction', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId,
          hash: '0xabc123',
          type: 'swap',
          protocol: 'uniswap',
          tokenIn: { symbol: 'ETH', amount: '1.0' },
          tokenOut: { symbol: 'USDC', amount: '2500' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
    });

    it('should verify a transaction', async () => {
      const txResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId,
          hash: '0xabc123',
          type: 'swap',
          protocol: 'uniswap',
          tokenIn: { symbol: 'ETH', amount: '1.0' },
          tokenOut: { symbol: 'USDC', amount: '2500' },
        });

      const txId = txResponse.body.id;

      const verifyResponse = await request(app)
        .post(`/api/transactions/${txId}/verify`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.status).toMatch(/verified|pending/);
    });

    it('should list agent transactions', async () => {
      // Create multiple transactions
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            agentId,
            hash: `0x${String(i).padStart(64, 'a')}`,
            type: 'swap',
            protocol: 'uniswap',
            tokenIn: { symbol: 'ETH', amount: '1.0' },
            tokenOut: { symbol: 'USDC', amount: '2500' },
          });
      }

      const response = await request(app)
        .get(`/api/agents/${agentId}/transactions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions).toHaveLength(3);
    });
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  describe('Authorization', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/agents');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should prevent access to other users data', async () => {
      // User 1 creates agent
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123!',
          name: 'User 1',
        });
      const user1Token = user1Response.body.token;

      const agentResponse = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'User 1 Agent',
          address: '0x1234567890123456789012345678901234567890',
          description: 'Test',
        });
      const agentId = agentResponse.body.id;

      // User 2 tries to access User 1's agent
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password123!',
          name: 'User 2',
        });
      const user2Token = user2Response.body.token;

      const accessResponse = await request(app)
        .get(`/api/agents/${agentId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(accessResponse.status).toBe(403);
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid request body', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer invalid`)
        .send({
          name: '', // Invalid: empty name
          address: 'invalid-address',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle server errors gracefully', async () => {
      // Request to non-existent resource
      const response = await request(app)
        .get('/api/agents/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
