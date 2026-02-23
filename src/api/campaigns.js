import { userLoginClient } from './userLoginClient.js';
import { domainApi } from './domain.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

class CampaignsApi {
  async getAllCampaigns() {
    try {
      logger.info('Fetching all campaigns...');
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns?v=3.4&fields=id&fields=name&fields=description&fields=engagementIds`;
      
      const data = await userLoginClient.get(url);
      
      logger.success(`Retrieved ${data.length} campaigns`);
      return data;
    } catch (error) {
      logger.error('Failed to fetch campaigns:', error.message);
      throw error;
    }
  }

  async getCampaignById(campaignId) {
    try {
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns/${campaignId}?v=3.4`;
      
      const data = await userLoginClient.get(url);
      
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }
      logger.error('Failed to fetch campaign:', error.message);
      throw error;
    }
  }

  async getEngagementById(campaignId, engagementId) {
    try {
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns/${campaignId}/engagements/${engagementId}?v=3.4`;
      
      const data = await userLoginClient.get(url);
      
      return data;
    } catch (error) {
      logger.error(`Failed to fetch engagement ${engagementId}:`, error.message);
      throw error;
    }
  }

  async getEngagementsBySkillId(skillId) {
    try {
      logger.info(`Finding engagements with skill ID: ${skillId}...`);
      
      const campaigns = await this.getAllCampaigns();
      const engagementsWithSkill = [];

      for (const campaign of campaigns) {
        try {
          const fullCampaign = await this.getCampaignById(campaign.id);
          
          if (fullCampaign.engagements) {
            const matchingEngagements = fullCampaign.engagements.filter(engagement => 
              engagement.skillId && engagement.skillId === Number(skillId)
            );
            
            matchingEngagements.forEach(engagement => {
              engagementsWithSkill.push({
                ...engagement,
                campaignId: campaign.id,
                campaignName: campaign.name
              });
            });
          }
        } catch (error) {
          logger.warn(`Failed to fetch campaign ${campaign.id}: ${error.message}`);
        }
      }
      
      logger.success(`Found ${engagementsWithSkill.length} engagements with skill ${skillId}`);
      return engagementsWithSkill;
    } catch (error) {
      logger.error('Failed to filter engagements by skill:', error.message);
      throw error;
    }
  }

  async updateCampaign(campaignId, campaignData) {
    try {
      logger.info(`Updating campaign ${campaignId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns/${campaignId}?v=3.4`;
      
      // Add If-Match header with revision for optimistic locking
      const headers = {};
      if (campaignData._revision) {
        headers['If-Match'] = campaignData._revision;
        // Remove _revision from the data payload
        const { _revision, ...cleanData } = campaignData;
        campaignData = cleanData;
      }
      
      const data = await userLoginClient.put(url, campaignData, { headers });
      
      logger.success(`Campaign ${campaignId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update campaign ${campaignId}:`, error.message);
      throw error;
    }
  }

  async updateEngagement(campaignId, engagementId, engagementData) {
    try {
      logger.info(`Updating engagement ${engagementId} in campaign ${campaignId}...`);
      
      const domain = await domainApi.getReadWriteDomain();
      const url = `https://${domain}/api/account/${config.liveperson.accountId}/configuration/le-campaigns/campaigns/${campaignId}/engagements/${engagementId}?v=3.4`;
      
      // Add headers for engagement update (POST with method override)
      const headers = {
        'X-HTTP-Method-Override': 'PUT'
      };
      
      if (engagementData._revision) {
        headers['If-Match'] = engagementData._revision;
        // Remove _revision from the data payload
        const { _revision, ...cleanData } = engagementData;
        engagementData = cleanData;
      }
      
      // Use POST with X-HTTP-Method-Override: PUT
      const data = await userLoginClient.post(url, engagementData, { headers });
      
      logger.success(`Engagement ${engagementId} updated successfully`);
      return data;
    } catch (error) {
      logger.error(`Failed to update engagement ${engagementId}:`, error.message);
      throw error;
    }
  }

  async removeSkillFromEngagement(campaignId, engagementId, skillId) {
    try {
      logger.info(`Removing skill ${skillId} from engagement ${engagementId} in campaign ${campaignId}...`);
      
      // Fetch the engagement directly to get its revision
      const engagement = await this.getEngagementById(campaignId, engagementId);
      
      if (!engagement.skillId || engagement.skillId !== Number(skillId)) {
        logger.warn(`Engagement ${engagementId} does not have skill ${skillId}`);
        return { success: false, reason: 'Skill not assigned to engagement' };
      }

      // Update just the engagement, not the whole campaign
      const updatedEngagement = {
        ...engagement,
        skillId: null,
        skillName: null
      };

      await this.updateEngagement(campaignId, engagementId, updatedEngagement);
      
      logger.success(`Removed skill ${skillId} from engagement ${engagementId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove skill from engagement ${engagementId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  async batchRemoveSkillFromEngagements(engagements, skillId) {
    logger.info(`Removing skill ${skillId} from ${engagements.length} engagements...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const engagement of engagements) {
      const result = await this.removeSkillFromEngagement(engagement.campaignId, engagement.id, skillId);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ engagementId: engagement.id, reason: result.reason });
      }
    }

    logger.info(`Batch update complete: ${results.success} succeeded, ${results.failed} failed`);
    return results;
  }
}

export const campaignsApi = new CampaignsApi();
