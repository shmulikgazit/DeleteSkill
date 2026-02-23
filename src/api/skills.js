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

      // Get the skill to obtain its revision
      const skill = await this.getSkillById(skillId);
      
      const headers = {};
      if (skill._revision) {
        headers['If-Match'] = skill._revision;
      }

      await apiClient.delete(url, { headers });

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
      
      // Add If-Match header with revision for optimistic locking
      const headers = {};
      if (currentSkill._revision) {
        headers['If-Match'] = currentSkill._revision;
      }
      
      const data = await apiClient.put(url, updatedSkill, { headers });
      
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
      const warnings = [];

      if (skill.skillTransferList && skill.skillTransferList.includes(Number(targetSkillId))) {
        updates.skillTransferList = skill.skillTransferList.filter(id => id !== Number(targetSkillId));
        hasChanges = true;
        logger.info(`  - Removing from skillTransferList`);
      }

      if (skill.fallbackSkill && skill.fallbackSkill === Number(targetSkillId)) {
        updates.fallbackSkill = null;
        hasChanges = true;
        logger.info(`  - Removing from fallbackSkill`);
        warnings.push(`Skill "${skill.name}" (${referencingSkillId}) will have NO fallback after this removal`);
      }

      if (!hasChanges) {
        logger.warn(`Skill ${referencingSkillId} does not reference skill ${targetSkillId}`);
        return { success: false, reason: 'Skill not referenced' };
      }

      await this.updateSkill(referencingSkillId, updates);
      
      logger.success(`Removed skill ${targetSkillId} references from skill ${referencingSkillId}`);
      
      if (warnings.length > 0) {
        warnings.forEach(w => logger.warn(`⚠️  ${w}`));
      }
      
      return { success: true, warnings };
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
      errors: [],
      warnings: []
    };

    for (const skillId of referencingSkillIds) {
      const result = await this.removeSkillFromSkillReferences(skillId, targetSkillId);
      if (result.success) {
        results.success++;
        if (result.warnings && result.warnings.length > 0) {
          results.warnings.push(...result.warnings);
        }
      } else {
        results.failed++;
        results.errors.push({ skillId, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    
    if (results.warnings.length > 0) {
      logger.warn('\n⚠️  Important Warnings:');
      results.warnings.forEach(w => logger.warn(`   ${w}`));
    }
    
    return results;
  }

  async batchRemoveMultipleSkillsFromSkillReferences(referencingSkillIds, targetSkillIds) {
    logger.info(`Removing ${targetSkillIds.length} skill references from ${referencingSkillIds.length} skills...`);
    logger.info('Optimizing: fetching each skill once and removing all references together...');
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const skillId of referencingSkillIds) {
      try {
        logger.info(`Processing skill ${skillId}...`);
        
        const skill = await this.getSkillById(skillId);
        const updates = {};
        let hasChanges = false;

        // Remove all target skills from transfer list
        if (skill.skillTransferList && skill.skillTransferList.length > 0) {
          const originalLength = skill.skillTransferList.length;
          updates.skillTransferList = skill.skillTransferList.filter(id => 
            !targetSkillIds.includes(Number(id))
          );
          if (updates.skillTransferList.length < originalLength) {
            hasChanges = true;
            logger.info(`  - Removed ${originalLength - updates.skillTransferList.length} skill(s) from transfer list`);
          }
        }

        // Remove from fallback if it matches any target skill
        if (skill.fallbackSkill && targetSkillIds.includes(Number(skill.fallbackSkill))) {
          updates.fallbackSkill = null;
          hasChanges = true;
          logger.info(`  - Removed fallback skill`);
        }

        if (hasChanges) {
          await this.updateSkill(skillId, updates);
          results.success++;
          logger.success(`Removed all references from skill ${skillId}`);
        } else {
          logger.info(`  - No changes needed for skill ${skillId}`);
          results.success++;
        }
      } catch (error) {
        logger.error(`Failed to update skill ${skillId}:`, error.message);
        results.failed++;
        results.errors.push({ skillId, reason: error.message });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const skillsApi = new SkillsApi();
