import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class DomainApi {
  constructor() {
    this.cache = new Map();
  }

  async getBaseUri(serviceName) {
    if (this.cache.has(serviceName)) {
      logger.debug(`Using cached domain for service: ${serviceName}`);
      return this.cache.get(serviceName);
    }

    try {
      logger.debug(`Fetching base URI for service: ${serviceName}`);
      
      const url = `${config.liveperson.domainApiBase}/api/account/${config.liveperson.accountId}/service/${serviceName}/baseURI.json?version=${config.liveperson.apiVersion}`;
      
      logger.debug(`Domain API URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json'
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      if (response.status === 404) {
        logger.error(`Service name '${serviceName}' not found. Response:`, response.data);
        throw new Error(`Service '${serviceName}' not found in Domain API. Check service name.`);
      }
      
      if (response.status !== 200) {
        logger.error(`Domain API returned status ${response.status}:`, response.data);
        throw new Error(`Domain API returned status ${response.status}`);
      }
      
      const baseUri = response.data.baseURI;
      
      this.cache.set(serviceName, baseUri);
      logger.debug(`Base URI for ${serviceName}: ${baseUri}`);
      
      return baseUri;
    } catch (error) {
      if (error.response) {
        logger.error(`Domain API HTTP ${error.response.status}:`, error.response.data);
      } else {
        logger.error(`Failed to retrieve base URI for service ${serviceName}:`, error.message);
      }
      throw new Error(`Domain API lookup failed for service: ${serviceName}`);
    }
  }

  async getReadOnlyDomain() {
    return this.getBaseUri(config.liveperson.serviceNames.readOnly);
  }

  async getReadWriteDomain() {
    return this.getBaseUri(config.liveperson.serviceNames.readWrite);
  }

  async getLiveEngageDomain() {
    return this.getBaseUri('liveEngage');
  }

  clearCache() {
    this.cache.clear();
    logger.debug('Domain cache cleared');
  }
}

export const domainApi = new DomainApi();
