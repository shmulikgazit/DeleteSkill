import { apiClient } from './client.js';
import { domainApi } from './domain.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class PredefinedContentApi {
  async getAllPredefinedContent() {
    try {
      logger.info('Fetching all predefined content (canned responses)...');
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/engagement-window/canned-responses?v=2.0`;
      
      const data = await apiClient.get(url);
      
      logger.success(`Retrieved ${data.length} predefined content items`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch predefined content:', error.message);
      throw error;
    }
  }

  async getPredefinedContentById(itemId) {
    try {
      logger.debug(`Fetching predefined content with ID: ${itemId}...`);
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/engagement-window/canned-responses/${itemId}?v=2.0`;
      
      const data = await apiClient.get(url);
      
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Predefined content with ID ${itemId} not found`);
      }
      logger.error('Failed to fetch predefined content:', error.message);
      throw error;
    }
  }

  async getPredefinedContentBySkillId(skillId) {
    try {
      logger.info(`Finding predefined content with skill ID: ${skillId}...`);
      
      const allContent = await this.getAllPredefinedContent();
      
      const contentWithSkill = allContent.filter(item => 
        item.skillIds && item.skillIds.includes(Number(skillId))
      );
      
      logger.success(`Found ${contentWithSkill.length} predefined content items with skill ${skillId}`);
      return contentWithSkill;
    } catch (error) {
      logger.error('Failed to filter predefined content by skill:', error.message);
      throw error;
    }
  }

  async updatePredefinedContent(itemId, itemData) {
    try {
      logger.info(`Updating predefined content ${itemId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/engagement-window/canned-responses/${itemId}?v=2.0`;
      
      const currentItem = await this.getPredefinedContentById(itemId);
      
      const updatedItem = {
        ...currentItem,
        ...itemData
      };
      
      // Add If-Match header with revision for optimistic locking
      const headers = {};
      if (currentItem._revision) {
        headers['If-Match'] = currentItem._revision;
      }
      
      const data = await apiClient.put(url, updatedItem, { headers });
      
      logger.success(`Predefined content ${itemId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update predefined content ${itemId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromPredefinedContent(itemId, skillId) {
    try {
      logger.info(`Removing skill ${skillId} from predefined content ${itemId}...`);
      
      const item = await this.getPredefinedContentById(itemId);
      
      if (!item.skillIds || !item.skillIds.includes(Number(skillId))) {
        logger.warn(`Predefined content ${itemId} does not have skill ${skillId}`);
        return { success: false, reason: 'Skill not assigned to item' };
      }

      const updatedSkillIds = item.skillIds.filter(id => id !== Number(skillId));
      
      await this.updatePredefinedContent(itemId, { skillIds: updatedSkillIds });
      
      logger.success(`Removed skill ${skillId} from predefined content ${itemId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove skill from predefined content ${itemId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async batchRemoveSkillFromPredefinedContent(itemIds, skillId) {
    logger.info(`Removing skill ${skillId} from ${itemIds.length} predefined content items...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      const result = await this.removeSkillFromPredefinedContent(itemId, skillId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ itemId, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const predefinedContentApi = new PredefinedContentApi();
