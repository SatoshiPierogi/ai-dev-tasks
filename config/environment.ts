/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

export interface EnvironmentConfig {
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  isTest: boolean;

  // Server
  server: {
    port: number;
    host: string;
  };

  // Database
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
  };

  // Redis
  redis: {
    url: string;
    maxRetries: number;
    enableOfflineQueue: boolean;
  };

  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };

  // Blockchain RPC
  blockchain: {
    rpcProviders: {
      alchemy: string;
      infura: string;
      ankr: string;
    };
    timeout: number;
    retries: number;
    healthCheckInterval: number;
  };

  // The Graph
  theGraph: {
    endpoint: string;
    timeout: number;
  };

  // Caching
  cache: {
    ttl: number;
    maxSizeAgents: number;
    maxSizeTransactions: number;
    cleanupInterval: number;
  };

  // Archival
  archival: {
    retentionDays: number;
    batchSize: number;
    scheduleInterval: number;
  };

  // Storage monitoring
  storage: {
    checkInterval: number;
    warningGB: number;
    criticalGB: number;
  };

  // WebSocket
  websocket: {
    port: number;
    maxConnections: number;
    heartbeatInterval: number;
    messageQueueSize: number;
  };

  // Security
  security: {
    corsOrigins: string[];
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
  };

  // Frontend URLs
  frontend: {
    apiUrl: string;
    wsUrl: string;
  };

  // Verification
  verification: {
    confirmationBlocks: number;
    reorgDetectionDepth: number;
    maxRetries: number;
    retryInterval: number;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };
}

// ============================================================================
// DEVELOPMENT ENVIRONMENT
// ============================================================================

const developmentConfig: EnvironmentConfig = {
  env: 'development',
  isDevelopment: true,
  isProduction: false,
  isStaging: false,
  isTest: false,

  server: {
    port: 3001,
    host: '0.0.0.0',
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://dev_user:dev_password@localhost:5432/agent_audit',
    maxConnections: 20,
    connectionTimeout: 10000,
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetries: 3,
    enableOfflineQueue: true,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key_not_for_production',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
  },

  blockchain: {
    rpcProviders: {
      alchemy: process.env.ALCHEMY_API_KEY || '',
      infura: process.env.INFURA_API_KEY || '',
      ankr: process.env.ANKR_API_KEY || '',
    },
    timeout: 10000,
    retries: 3,
    healthCheckInterval: 60000,
  },

  theGraph: {
    endpoint: process.env.THE_GRAPH_ENDPOINT || 'https://api.thegraph.com/subgraphs/name',
    timeout: 30000,
  },

  cache: {
    ttl: 1800000, // 30 minutes
    maxSizeAgents: 1000,
    maxSizeTransactions: 50000,
    cleanupInterval: 60000,
  },

  archival: {
    retentionDays: 7,
    batchSize: 1000,
    scheduleInterval: 3600000, // 1 hour
  },

  storage: {
    checkInterval: 3600000, // 1 hour
    warningGB: 10,
    criticalGB: 20,
  },

  websocket: {
    port: 8080,
    maxConnections: 10000,
    heartbeatInterval: 30000,
    messageQueueSize: 1000,
  },

  security: {
    corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    rateLimitWindow: 900000, // 15 minutes
    rateLimitMaxRequests: 100,
  },

  frontend: {
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3001/ws',
  },

  verification: {
    confirmationBlocks: 12,
    reorgDetectionDepth: 100,
    maxRetries: 5,
    retryInterval: 5000,
  },

  logging: {
    level: 'debug',
    format: 'detailed',
  },
};

// ============================================================================
// STAGING ENVIRONMENT
// ============================================================================

const stagingConfig: EnvironmentConfig = {
  ...developmentConfig,
  env: 'staging',
  isDevelopment: false,
  isStaging: true,

  server: {
    port: 3001,
    host: '0.0.0.0',
  },

  database: {
    url: process.env.DATABASE_URL || '',
    maxConnections: 50,
    connectionTimeout: 15000,
  },

  cache: {
    ...developmentConfig.cache,
    ttl: 3600000, // 1 hour
  },

  archival: {
    ...developmentConfig.archival,
    scheduleInterval: 1800000, // 30 minutes
  },

  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    rateLimitWindow: 900000,
    rateLimitMaxRequests: 200,
  },

  frontend: {
    apiUrl: 'https://api-staging.agent-audit.dev',
    wsUrl: 'wss://api-staging.agent-audit.dev/ws',
  },

  logging: {
    level: 'info',
    format: 'json',
  },
};

// ============================================================================
// PRODUCTION ENVIRONMENT
// ============================================================================

const productionConfig: EnvironmentConfig = {
  ...developmentConfig,
  env: 'production',
  isDevelopment: false,
  isProduction: true,

  server: {
    port: 3001,
    host: '0.0.0.0',
  },

  database: {
    url: process.env.DATABASE_URL || '',
    maxConnections: 100,
    connectionTimeout: 20000,
  },

  cache: {
    ...developmentConfig.cache,
    ttl: 7200000, // 2 hours
  },

  archival: {
    ...developmentConfig.archival,
    scheduleInterval: 900000, // 15 minutes
  },

  storage: {
    ...developmentConfig.storage,
    checkInterval: 1800000, // 30 minutes
  },

  security: {
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
    rateLimitWindow: 900000,
    rateLimitMaxRequests: 500,
  },

  frontend: {
    apiUrl: 'https://api.agent-audit.dev',
    wsUrl: 'wss://api.agent-audit.dev/ws',
  },

  logging: {
    level: 'warn',
    format: 'json',
  },
};

// ============================================================================
// TEST ENVIRONMENT
// ============================================================================

const testConfig: EnvironmentConfig = {
  ...developmentConfig,
  env: 'test',
  isDevelopment: false,
  isTest: true,

  database: {
    url: 'postgresql://test_user:test_password@localhost:5432/agent_audit_test',
    maxConnections: 5,
    connectionTimeout: 5000,
  },

  cache: {
    ...developmentConfig.cache,
    ttl: 300000, // 5 minutes
    cleanupInterval: 10000,
  },

  websocket: {
    ...developmentConfig.websocket,
    maxConnections: 100,
  },

  logging: {
    level: 'error',
    format: 'minimal',
  },
};

// ============================================================================
// CONFIGURATION FACTORY
// ============================================================================

function getConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

export const config = getConfig();

// Export specific configuration sections for convenience
export const {
  server,
  database,
  redis,
  jwt,
  blockchain,
  theGraph,
  cache,
  archival,
  storage,
  websocket,
  security,
  frontend,
  verification,
  logging,
} = config;
