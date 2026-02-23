import { apiClient } from './client.js';
import { domainApi } from './domain.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class SkillsApi {
  async getAllSkills() {
    try {
      logger.info('Fetching all skills...');
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/skills?v=2.0&select=$all`;
      
      const data = await apiClient.get(url);
      
      logger.success(`Retrieved ${data.length} skills`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch skills:', error.message);
      throw error;
    }
  }

  async getSkillById(skillId) {
    try {
      logger.info(`Fetching skill with ID: ${skillId}...`);
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/skills/${skillId}?v=2.0&select=$all`;
      
      const data = await apiClient.get(url);
      
      logger.success(`Retrieved skill: ${data.name}`);
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Skill with ID ${skillId} not found`);
      }
      logger.error('Failed to fetch skill:', error.message);
      throw error;
    }
  }

  async deleteSkill(skillId) {
    try {
      logger.info(`Deleting skill with ID: ${skillId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/skills/${skillId}?v=2.0`;
      
      await apiClient.delete(url);
      
      logger.success(`Skill ${skillId} deleted successfully`);
      return true;
    } catch (error) {
      if (error.message.includes('cannot be deleted')) {
        logger.error(`Skill ${skillId} cannot be deleted because it has dependencies`);
        throw new Error('Skill has dependencies and cannot be deleted. Remove all dependencies first.');
      }
      logger.error('Failed to delete skill:', error.message);
      throw error;
    }
  }

  async deleteSkills(skillIds) {
    try {
      logger.info(`Deleting ${skillIds.length} skills...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/skills?v=2.0`;
      
      await apiClient.delete(url, {
        data: skillIds.map(id => ({ id }))
      });
      
      logger.success(`${skillIds.length} skills deleted successfully`);
      return true;
    } catch (error) {
      logger.error('Failed to delete skills:', error.message);
      throw error;
    }
  }

  async getSkillsReferencingSkill(skillId) {
    try {
      logger.info(`Finding skills that reference skill ID: ${skillId}...`);
      
      const allSkills = await this.getAllSkills();
      
      const referencingSkills = allSkills.filter(skill => {
        const inTransferList = skill.skillTransferList && skill.skillTransferList.includes(Number(skillId));
        const isFallback = skill.fallbackSkill && skill.fallbackSkill === Number(skillId);
        return inTransferList || isFallback;
      });
      
      logger.success(`Found ${referencingSkills.length} skills referencing skill ${skillId}`);
      return referencingSkills;
    } catch (error) {
      logger.error('Failed to find skills referencing skill:', error.message);
      throw error;
    }
  }

  async updateSkill(skillId, skillData) {
    try {
      logger.info(`Updating skill ${skillId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/skills/${skillId}?v=2.0`;
      
      const currentSkill = await this.getSkillById(skillId);
      
      const updatedSkill = {
        ...currentSkill,
        ...skillData
      };
      
      const data = await apiClient.put(url, updatedSkill);
      
      logger.success(`Skill ${skillId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update skill ${skillId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromSkillReferences(referencingSkillId, targetSkillId) {
    try {
      logger.info(`Removing skill ${targetSkillId} references from skill ${referencingSkillId}...`);
      
      const skill = await this.getSkillById(referencingSkillId);
      const updates = {};
      let hasChanges = false;

      if (skill.skillTransferList && skill.skillTransferList.includes(Number(targetSkillId))) {
        updates.skillTransferList = skill.skillTransferList.filter(id => id !== Number(targetSkillId));
        hasChanges = true;
        logger.info(`  - Removing from skillTransferList`);
      }

      if (skill.fallbackSkill && skill.fallbackSkill === Number(targetSkillId)) {
        updates.fallbackSkill = null;
        hasChanges = true;
        logger.info(`  - Removing from fallbackSkill`);
      }

      if (!hasChanges) {
        logger.warn(`Skill ${referencingSkillId} does not reference skill ${targetSkillId}`);
        return { success: false, reason: 'Skill not referenced' };
      }

      await this.updateSkill(referencingSkillId, updates);
      
      logger.success(`Removed skill ${targetSkillId} references from skill ${referencingSkillId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove skill references from skill ${referencingSkillId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async batchRemoveSkillFromSkillReferences(referencingSkillIds, targetSkillId) {
    logger.info(`Removing skill ${targetSkillId} references from ${referencingSkillIds.length} skills...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const skillId of referencingSkillIds) {
      const result = await this.removeSkillFromSkillReferences(skillId, targetSkillId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ skillId, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const skillsApi = new SkillsApi();
