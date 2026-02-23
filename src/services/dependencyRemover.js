import { usersApi } from '../api/users.js';
import { predefinedContentApi } from '../api/predefinedContent.js';
import { skillsApi } from '../api/skills.js';
import { userLoginClient } from '../api/userLoginClient.js';
import { dependencyFinder } from './dependencyFinder.js';
import { logger } from '../utils/logger.js';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../utils/config.js';

class DependencyRemover {
  async createBackup(skillId, dependencies) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = join(process.cwd(), config.output.backupsDir);
      mkdirSync(backupDir, { recursive: true });
      
      const backupPath = join(backupDir, `skill-${skillId}-backup-${timestamp}.json`);
      
      const backup = {
        timestamp: new Date().toISOString(),
        skillId,
        dependencies,
        metadata: {
          totalUsers: dependencies.users.length,
          totalCannedResponses: dependencies.cannedResponses.length,
          totalSkills: dependencies.skills?.length || 0,
          totalEngagements: dependencies.engagements.length,
          totalWidgets: dependencies.widgets.length
        }
      };

      writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
      logger.success(`Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      logger.error('Failed to create backup:', error.message);
      throw error;
    }
  }

  async removeSkillDependencies(skillId, options = {}) {
    const {
      dryRun = false,
      entities = ['users', 'cannedResponses'],
      createBackup = true,
      deleteSkillAfter = false
    } = options;

    try {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`${dryRun ? 'DRY RUN: ' : ''}Removing skill ${skillId} from dependencies`);
      logger.info(`${'='.repeat(80)}\n`);

      const dependencies = await dependencyFinder.findSkillDependencies(skillId);

      if (createBackup && !dryRun) {
        await this.createBackup(skillId, dependencies);
      }

      const summary = {
        users: { success: 0, failed: 0, errors: [] },
        cannedResponses: { success: 0, failed: 0, errors: [] },
        skills: { success: 0, failed: 0, errors: [] },
        engagements: { success: 0, failed: 0, errors: [] },
        widgets: { success: 0, failed: 0, errors: [] }
      };

      if (entities.includes('users') || entities.includes('all')) {
        if (dependencies.users.length > 0) {
          logger.info(`\nProcessing ${dependencies.users.length} users...`);
          
          if (dryRun) {
            logger.info('DRY RUN: Would remove skill from the following users:');
            dependencies.users.forEach(user => {
              logger.info(`  - ${user.loginName} (ID: ${user.id})`);
            });
            summary.users.success = dependencies.users.length;
          } else {
            const userIds = dependencies.users.map(u => u.id);
            const result = await usersApi.batchRemoveSkillFromUsers(userIds, skillId);
            summary.users = result;
          }
        } else {
          logger.info('No users have this skill assigned');
        }
      }

      if (entities.includes('cannedResponses') || entities.includes('all')) {
        if (dependencies.cannedResponses.length > 0) {
          logger.info(`\nProcessing ${dependencies.cannedResponses.length} canned responses...`);
          
          if (dryRun) {
            logger.info('DRY RUN: Would remove skill from the following canned responses:');
            dependencies.cannedResponses.forEach(item => {
              logger.info(`  - ${item.title} (ID: ${item.id})`);
            });
            summary.cannedResponses.success = dependencies.cannedResponses.length;
          } else {
            const itemIds = dependencies.cannedResponses.map(c => c.id);
            const result = await predefinedContentApi.batchRemoveSkillFromPredefinedContent(itemIds, skillId);
            summary.cannedResponses = result;
          }
        } else {
          logger.info('No canned responses have this skill assigned');
        }
      }

      if (entities.includes('skills') || entities.includes('all')) {
        if (dependencies.skills && dependencies.skills.length > 0) {
          logger.info(`\nProcessing ${dependencies.skills.length} skills with references...`);
          
          if (dryRun) {
            logger.info('DRY RUN: Would remove skill references from the following skills:');
            dependencies.skills.forEach(skill => {
              const refTypes = [];
              if (skill.hasInTransferList) refTypes.push('Transfer List');
              if (skill.hasAsFallback) refTypes.push('Fallback');
              logger.info(`  - ${skill.name} (ID: ${skill.id}) - ${refTypes.join(', ')}`);
            });
            summary.skills.success = dependencies.skills.length;
          } else {
            const skillIds = dependencies.skills.map(s => s.id);
            const result = await skillsApi.batchRemoveSkillFromSkillReferences(skillIds, skillId);
            summary.skills = result;
          }
        } else {
          logger.info('No skills reference this skill');
        }
      }

      if (entities.includes('engagements') || entities.includes('all')) {
        if (dependencies.engagements.length > 0) {
          if (userLoginClient.isConfigured()) {
            logger.info(`\nProcessing ${dependencies.engagements.length} engagements...`);
            
            if (dryRun) {
              logger.info('DRY RUN: Would remove skill from the following engagements:');
              dependencies.engagements.forEach(eng => {
                logger.info(`  - ${eng.name} (ID: ${eng.id}) in campaign ${eng.campaignName} (${eng.campaignId})`);
              });
              summary.engagements.success = dependencies.engagements.length;
            } else {
              const campaignsApi = (await import('../api/campaigns.js')).campaignsApi;
              const result = await campaignsApi.batchRemoveSkillFromEngagements(dependencies.engagements, skillId);
              summary.engagements = result;
            }
          } else {
            logger.warn('\nEngagements found but user login not configured');
            logger.warn('Add LP_USERNAME and LP_PASSWORD to .env to automatically remove engagements');
            logger.warn('Or remove manually from UI: Engagement Studio > Campaigns');
            summary.engagements.failed = dependencies.engagements.length;
          }
        } else {
          logger.info('No engagements have this skill assigned');
        }
      }

      if (entities.includes('widgets') || entities.includes('all')) {
        if (dependencies.widgets.length > 0) {
          logger.info(`\nProcessing ${dependencies.widgets.length} widgets...`);
          
          if (dryRun) {
            logger.info('DRY RUN: Would remove skill from the following widgets:');
            dependencies.widgets.forEach(widget => {
              logger.info(`  - ${widget.name} (ID: ${widget.id})`);
            });
            summary.widgets.success = dependencies.widgets.length;
          } else {
            const widgetIds = dependencies.widgets.map(w => w.id);
            const internalApi = (await import('../api/internal.js')).internalApi;
            const result = await internalApi.batchRemoveSkillFromWidgets(widgetIds, skillId);
            summary.widgets = result;
          }
        } else {
          logger.info('No widgets have this skill assigned');
        }
      }

      if (deleteSkillAfter && !dryRun) {
        const totalRemaining = summary.skills.failed + summary.engagements.failed + summary.widgets.failed;
        if (totalRemaining === 0) {
          logger.info('\nAttempting to delete skill...');
          try {
            await skillsApi.deleteSkill(skillId);
            logger.success(`Skill ${skillId} deleted successfully!`);
          } catch (error) {
            logger.error('Failed to delete skill:', error.message);
            logger.error('There may still be dependencies. Please check manually.');
          }
        } else {
          logger.warn(`Cannot delete skill yet. ${totalRemaining} dependencies remain (skills/engagements/widgets)`);
        }
      }

      return {
        dryRun,
        skillId,
        skillName: dependencies.skillName,
        summary
      };
    } catch (error) {
      logger.error('Failed to remove skill dependencies:', error.message);
      throw error;
    }
  }

  async rollback(backupPath) {
    try {
      logger.info(`Rolling back from backup: ${backupPath}`);
      
      const backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
      
      logger.warn('Rollback functionality is not yet fully implemented');
      logger.warn('Manual rollback may be required using the backup data');
      logger.info('Backup contains:');
      logger.info(`  - ${backup.metadata.totalUsers} users`);
      logger.info(`  - ${backup.metadata.totalCannedResponses} canned responses`);
      logger.info(`  - ${backup.metadata.totalSkills} skills`);
      logger.info(`  - ${backup.metadata.totalEngagements} engagements`);
      logger.info(`  - ${backup.metadata.totalWidgets} widgets`);
      
      return backup;
    } catch (error) {
      logger.error('Failed to rollback:', error.message);
      throw error;
    }
  }
}

export const dependencyRemover = new DependencyRemover();
