import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class ApiClient {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.baseClient.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          logger.warn('Access token expired, refreshing...');
          await this.authenticate();
          originalRequest.headers['Authorization'] = `Bearer ${this.accessToken}`;
          return this.baseClient(originalRequest);
        }

        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 5;
          logger.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
          await this.sleep(retryAfter * 1000);
          return this.baseClient(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  async authenticate() {
    try {
      logger.debug('Authenticating with OAuth 2.0 Client Credentials...');
      
      const tokenEndpoint = await this.getOAuthTokenEndpoint();
      logger.debug(`Token endpoint: ${tokenEndpoint}`);
      
      const params = new URLSearchParams();
      params.append('client_id', config.liveperson.clientId);
      params.append('client_secret', config.liveperson.clientSecret);
      params.append('grant_type', 'client_credentials');
      
      const response = await axios.post(
        tokenEndpoint,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;

      logger.success('Authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('Authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with LivePerson API');
    }
  }

  async getOAuthTokenEndpoint() {
    try {
      const response = await axios.get(
        `${config.liveperson.domainApiBase}/api/account/${config.liveperson.accountId}/service/sentinel/baseURI.json?version=1.0`
      );
      return `https://${response.data.baseURI}/sentinel/api/v2/account/${config.liveperson.accountId}/app/token`;
    } catch (error) {
      logger.warn('Could not retrieve OAuth endpoint from Domain API, using fallback');
      return `https://sentinel.liveperson.net/sentinel/api/v2/account/${config.liveperson.accountId}/app/token`;
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async get(url, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.baseClient.get(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      // If response has ac-revision header, attach it to the data
      if (response.headers['ac-revision']) {
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          response.data._revision = response.headers['ac-revision'];
        }
      }
      
      return response.data;
    } catch (error) {
      this.handleError(error, 'GET', url);
    }
  }

  async post(url, data, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.baseClient.post(url, data, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'POST', url);
    }
  }

  async put(url, data, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.baseClient.put(url, data, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'PUT', url);
    }
  }

  async delete(url, options = {}) {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.baseClient.delete(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      this.handleError(error, 'DELETE', url);
    }
  }

  handleError(error, method, url) {
    if (error.response) {
      logger.error(`${method} ${url} failed with status ${error.response.status}`);
      logger.error('Response:', error.response.data);
      throw new Error(`API request failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      logger.error(`${method} ${url} - No response received`);
      throw new Error('No response from API server');
    } else {
      logger.error(`${method} ${url} - Request setup failed:`, error.message);
      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async retryWithBackoff(fn, maxRetries = 3) {
    const { maxRetries: configRetries, initialDelayMs, maxDelayMs } = config.liveperson.retryPolicy;
    const retries = maxRetries || configRetries;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries - 1) throw error;
        
        const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }
}

export const apiClient = new ApiClient();
