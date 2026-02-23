import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class UserLoginClient {
  constructor() {
    this.bearerToken = null;
    this.csrfToken = null;
    this.sessionId = null;
  }

  isConfigured() {
    return !!(config.liveperson.username && config.liveperson.password);
  }

  async authenticate() {
    if (!this.isConfigured()) {
      throw new Error('User login not configured. LP_USERNAME and LP_PASSWORD required in .env');
    }

    try {
      logger.info('Authenticating with user login (AgentVEP)...');
      
      const agentVepDomain = await this.getAgentVepDomain();
      const loginUrl = `https://${agentVepDomain}/api/account/${config.liveperson.accountId}/login?v=1.3`;
      
      const response = await axios.post(
        loginUrl,
        {
          username: config.liveperson.username,
          password: config.liveperson.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      this.bearerToken = response.data.bearer;
      this.csrfToken = response.data.csrf;
      this.sessionId = response.data.sessionId;

      logger.success('User login authentication successful');
      return this.bearerToken;
    } catch (error) {
      logger.error('User login authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with user login');
    }
  }

  async getAgentVepDomain() {
    try {
      const response = await axios.get(
        `${config.liveperson.domainApiBase}/api/account/${config.liveperson.accountId}/service/agentVep/baseURI.json?version=1.0`
      );
      return response.data.baseURI;
    } catch (error) {
      logger.warn('Could not retrieve AgentVEP endpoint from Domain API, using fallback');
      return 'agentvep.liveperson.net';
    }
  }

  async ensureAuthenticated() {
    if (!this.bearerToken) {
      await this.authenticate();
    }
  }

  async get(url, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await axios.get(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn('User session expired, re-authenticating...');
        await this.authenticate();
        const response = await axios.get(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      }
      throw error;
    }
  }

  async put(url, data, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await axios.put(url, data, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn('User session expired, re-authenticating...');
        await this.authenticate();
        const response = await axios.put(url, data, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      }
      throw error;
    }
  }
}

export const userLoginClient = new UserLoginClient();
