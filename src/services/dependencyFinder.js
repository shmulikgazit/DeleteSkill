import { skillsApi } from '../api/skills.js';
import { usersApi } from '../api/users.js';
import { predefinedContentApi } from '../api/predefinedContent.js';
import { internalApi } from '../api/internal.js';
import { logger } from '../utils/logger.js';

class DependencyFinder {
  async findSkillDependencies(skillId) {
    try {
      logger.info(`\nSearching for dependencies of skill ID: ${skillId}...`);
      logger.info('This may take a moment...\n');

      const skill = await skillsApi.getSkillById(skillId);
      
      const [users, cannedResponses, referencingSkills, engagements, widgets] = await Promise.all([
        usersApi.getUsersBySkillId(skillId),
        predefinedContentApi.getPredefinedContentBySkillId(skillId),
        skillsApi.getSkillsReferencingSkill(skillId),
        internalApi.getEngagementsBySkillId(skillId),
        internalApi.getWidgetsBySkillId(skillId)
      ]);

      const dependencies = {
        skillId: Number(skillId),
        skillName: skill.name,
        skillDescription: skill.description,
        users: users.map(user => ({
          id: user.id,
          loginName: user.loginName,
          email: user.email,
          nickname: user.nickname,
          fullName: user.name
        })),
        cannedResponses: cannedResponses.map(item => ({
          id: item.id,
          title: item.data?.[0]?.title || item.title || 'Untitled',
          type: item.type,
          enabled: item.enabled,
          categoriesIds: item.categoriesIds
        })),
        skills: referencingSkills.map(s => ({
          id: s.id,
          name: s.name,
          hasInTransferList: s.skillTransferList && s.skillTransferList.includes(Number(skillId)),
          hasAsFallback: s.fallbackSkill && s.fallbackSkill === Number(skillId)
        })),
        engagements: engagements.map(eng => ({
          id: eng.id,
          name: eng.name,
          campaignId: eng.campaignId,
          campaignName: eng.campaignName
        })),
        widgets: widgets.map(widget => ({
          id: widget.id,
          name: widget.name
        }))
      };

      const totalDeps = dependencies.users.length + 
                       dependencies.cannedResponses.length + 
                       dependencies.skills.length +
                       dependencies.engagements.length + 
                       dependencies.widgets.length;

      logger.info(`\nDependency scan complete!`);
      logger.info(`Found ${totalDeps} total dependencies`);

      return dependencies;
    } catch (error) {
      logger.error('Failed to find skill dependencies:', error.message);
      throw error;
    }
  }

  async findMultipleSkillsDependencies(skillIds) {
    logger.info(`Scanning ${skillIds.length} skills for dependencies...`);
    
    const results = [];
    
    for (const skillId of skillIds) {
      try {
        const deps = await this.findSkillDependencies(skillId);
        results.push(deps);
      } catch (error) {
        logger.error(`Failed to scan skill ${skillId}:`, error.message);
        results.push({
          skillId: Number(skillId),
          error: error.message,
          users: [],
          cannedResponses: [],
          engagements: [],
          widgets: []
        });
      }
    }

    return results;
  }

  getDependencySummary(dependencies) {
    return {
      totalUsers: dependencies.users.length,
      totalCannedResponses: dependencies.cannedResponses.length,
      totalSkills: dependencies.skills?.length || 0,
      totalEngagements: dependencies.engagements.length,
      totalWidgets: dependencies.widgets.length,
      totalDependencies: dependencies.users.length + 
                        dependencies.cannedResponses.length + 
                        (dependencies.skills?.length || 0) +
                        dependencies.engagements.length + 
                        dependencies.widgets.length,
      canDelete: dependencies.users.length === 0 && 
                dependencies.cannedResponses.length === 0 && 
                (dependencies.skills?.length || 0) === 0 &&
                dependencies.engagements.length === 0 && 
                dependencies.widgets.length === 0
    };
  }
}

export const dependencyFinder = new DependencyFinder();
