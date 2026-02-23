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

  async getWidgetById(widgetId) {
    try {
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-ui-personalization/widgets/${widgetId}?v=2.0&select=$all`;
      
      // Try with OAuth first, fall back to user login if needed
      try {
        const data = await apiClient.get(url);
        return data;
      } catch (error) {
        if (error.response?.status === 403 && userLoginClient.isConfigured()) {
          const data = await userLoginClient.get(url);
          return data;
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to fetch widget ${widgetId}:`, error.message);
      throw error;
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

  async getAllEngagements() {
    if (userLoginClient.isConfigured()) {
      try {
        logger.info('Fetching all engagements...');
        const campaignsApi = (await import('./campaigns.js')).campaignsApi;
        const campaigns = await campaignsApi.getAllCampaigns();
        
        const allEngagements = [];
        for (const campaign of campaigns) {
          const fullCampaign = await campaignsApi.getCampaignById(campaign.id);
          if (fullCampaign.engagements) {
            fullCampaign.engagements.forEach(eng => {
              allEngagements.push({
                ...eng,
                campaignId: campaign.id,
                campaignName: campaign.name
              });
            });
          }
        }
        
        logger.success(`Retrieved ${allEngagements.length} engagements from ${campaigns.length} campaigns`);
        return allEngagements;
      } catch (error) {
        logger.error('Failed to fetch engagements:', error.message);
        logger.warn('Engagements require user login credentials');
        return [];
      }
    } else {
      logger.warn('Engagements require user login credentials (LP_USERNAME and LP_PASSWORD in .env)');
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
      
      // Add headers for widget update (POST with method override)
      const headers = {
        'X-HTTP-Method-Override': 'PUT'
      };
      
      if (widgetData._revision) {
        headers['If-Match'] = widgetData._revision;
        // Remove _revision from the data payload
        const { _revision, ...cleanData } = widgetData;
        widgetData = cleanData;
      }
      
      // Use POST with X-HTTP-Method-Override: PUT (requires user login)
      if (userLoginClient.isConfigured()) {
        const data = await userLoginClient.post(url, widgetData, { headers });
        logger.success(`Widget ${widgetId} updated successfully`);
        return data;
      } else {
        logger.warn('Widgets API requires user login credentials. Please configure LP_USERNAME and LP_PASSWORD in .env');
        throw new Error('User login required for widgets API');
      }
    } catch (error) {
      logger.error(`Failed to update widget ${widgetId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromWidget(widgetId, skillId) {
    try {
      logger.info(`Removing skill ${skillId} from widget ${widgetId}...`);
      
      const widget = await this.getWidgetById(widgetId);
      
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
