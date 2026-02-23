import { apiClient } from './client.js';
import { domainApi } from './domain.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { userLoginClient } from './userLoginClient.js';

class InternalApi {
  async getAllWidgets() {
    try {
      logger.info('Fetching all widgets...');
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-ui-personalization/widgets?v=2.0&select=$all`;
      
      const data = await apiClient.get(url);
      
      logger.success(`Retrieved ${data.length} widgets`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch widgets:', error.message);
      logger.warn('Widgets may require additional OAuth permissions');
      return [];
    }
  }

  async getWidgetsBySkillId(skillId) {
    try {
      logger.info(`Finding widgets with skill ID: ${skillId}...`);
      
      const allWidgets = await this.getAllWidgets();
      const widgetsWithSkill = allWidgets.filter(widget => 
        widget.skillIds && widget.skillIds.includes(Number(skillId))
      );
      
      logger.success(`Found ${widgetsWithSkill.length} widgets with skill ${skillId}`);
      return widgetsWithSkill;
    } catch (error) {
      logger.error('Failed to filter widgets by skill:', error.message);
      return [];
    }
  }

  async getEngagementsBySkillId(skillId) {
    if (userLoginClient.isConfigured()) {
      try {
        const campaignsApi = (await import('./campaigns.js')).campaignsApi;
        return await campaignsApi.getEngagementsBySkillId(skillId);
      } catch (error) {
        logger.error('Failed to get engagements via user login:', error.message);
        logger.warn('Falling back to manual check');
        return [];
      }
    } else {
      logger.info(`Finding engagements with skill ID: ${skillId}...`);
      logger.warn('Engagements require user login credentials (LP_USERNAME and LP_PASSWORD in .env)');
      logger.warn('Add credentials to .env to automatically check engagements, or check manually in UI');
      return [];
    }
  }

  async updateWidget(widgetId, widgetData) {
    try {
      logger.info(`Updating widget ${widgetId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-ui-personalization/widgets/${widgetId}?v=2.0`;
      
      const data = await apiClient.put(url, widgetData);
      
      logger.success(`Widget ${widgetId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update widget ${widgetId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromWidget(widgetId, skillId) {
    try {
      logger.info(`Removing skill ${skillId} from widget ${widgetId}...`);
      
      const allWidgets = await this.getAllWidgets();
      const widget = allWidgets.find(w => w.id === widgetId);
      
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found`);
      }
      
      if (!widget.skillIds || !widget.skillIds.includes(Number(skillId))) {
        logger.warn(`Widget ${widgetId} does not have skill ${skillId}`);
        return { success: false, reason: 'Skill not assigned to widget' };
      }

      const updatedSkillIds = widget.skillIds.filter(id => id !== Number(skillId));
      
      await this.updateWidget(widgetId, { ...widget, skillIds: updatedSkillIds });
      
      logger.success(`Removed skill ${skillId} from widget ${widgetId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove skill from widget ${widgetId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async batchRemoveSkillFromWidgets(widgetIds, skillId) {
    logger.info(`Removing skill ${skillId} from ${widgetIds.length} widgets...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const widgetId of widgetIds) {
      const result = await this.removeSkillFromWidget(widgetId, skillId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ widgetId, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const internalApi = new InternalApi();
