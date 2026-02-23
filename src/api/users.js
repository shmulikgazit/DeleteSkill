import { apiClient } from './client.js';
import { domainApi } from './domain.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class UsersApi {
  async getAllUsers() {
    try {
      logger.info('Fetching all users...');
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/users?v=6.0&select=id,pid,deleted,userTypeId,isApiUser,email,loginName,nickname,fullName,employeeId,isEnabled,maxChats,maxAsyncChats,skillIds,memberOf(agentGroupId,assignmentDate),managerOf(agentGroupId,assignmentDate),profileIds,lobIds`;
      
      const data = await apiClient.get(url);
      
      logger.success(`Retrieved ${data.length} users`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch users:', error.message);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      logger.debug(`Fetching user with ID: ${userId}...`);
      
      const domain = await domainApi.getReadOnlyDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/users/${userId}?v=6.0`;
      
      const data = await apiClient.get(url);
      
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`User with ID ${userId} not found`);
      }
      logger.error('Failed to fetch user:', error.message);
      throw error;
    }
  }

  async getUsersBySkillId(skillId) {
    try {
      logger.info(`Finding users with skill ID: ${skillId}...`);
      
      const allUsers = await this.getAllUsers();
      
      const usersWithSkill = allUsers.filter(user => 
        user.skillIds && user.skillIds.includes(Number(skillId))
      );
      
      logger.success(`Found ${usersWithSkill.length} users with skill ${skillId}`);
      return usersWithSkill;
    } catch (error) {
      logger.error('Failed to filter users by skill:', error.message);
      throw error;
    }
  }

  async updateUser(userId, userData) {
    try {
      logger.info(`Updating user ${userId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-users/users/${userId}?v=6.0`;
      
      const currentUser = await this.getUserById(userId);
      
      const updatedUser = {
        ...currentUser,
        ...userData
      };
      
      // Add If-Match header with revision for optimistic locking
      const headers = {};
      if (currentUser._revision) {
        headers['If-Match'] = currentUser._revision;
      }
      
      const data = await apiClient.put(url, updatedUser, { headers });
      
      logger.success(`User ${userId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update user ${userId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromUser(userId, skillId) {
    try {
      logger.info(`Removing skill ${skillId} from user ${userId}...`);
      
      const user = await this.getUserById(userId);
      
      if (!user.skillIds || !user.skillIds.includes(Number(skillId))) {
        logger.warn(`User ${userId} does not have skill ${skillId}`);
        return { success: false, reason: 'Skill not assigned to user' };
      }

      const updatedSkillIds = user.skillIds.filter(id => id !== Number(skillId));
      
      await this.updateUser(userId, { skillIds: updatedSkillIds });
      
      logger.success(`Removed skill ${skillId} from user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove skill from user ${userId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async batchRemoveSkillFromUsers(userIds, skillId) {
    logger.info(`Removing skill ${skillId} from ${userIds.length} users...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const userId of userIds) {
      const result = await this.removeSkillFromUser(userId, skillId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ userId, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const usersApi = new UsersApi();
