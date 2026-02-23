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

      const fallbackWarnings = [];
      
      if (entities.includes('skills') || entities.includes('all')) {
        if (dependencies.skills && dependencies.skills.length > 0) {
          logger.info(`\nProcessing ${dependencies.skills.length} skills with references...`);
          
          if (dryRun) {
            logger.info('DRY RUN: Would remove skill references from the following skills:');
            dependencies.skills.forEach(skill => {
              const refTypes = [];
              if (skill.hasInTransferList) refTypes.push('Transfer List');
              if (skill.hasAsFallback) {
                refTypes.push('Fallback');
                fallbackWarnings.push({ id: skill.id, name: skill.name });
              }
              logger.info(`  - ${skill.name} (ID: ${skill.id}) - ${refTypes.join(', ')}`);
            });
            summary.skills.success = dependencies.skills.length;
          } else {
            const skillIds = dependencies.skills.map(s => s.id);
            const result = await skillsApi.batchRemoveSkillFromSkillReferences(skillIds, skillId);
            summary.skills = result;
            
            // Collect fallback warnings
            if (result.warnings) {
              result.warnings.forEach(warning => {
                const match = warning.match(/Skill "(.+?)" \((\d+)\)/);
                if (match) {
                  fallbackWarnings.push({ name: match[1], id: match[2] });
                }
              });
            }
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

      const deletedSkills = [];
      
      if (deleteSkillAfter && !dryRun) {
        const totalRemaining = summary.skills.failed + summary.engagements.failed + summary.widgets.failed;
        if (totalRemaining === 0) {
          logger.info('\nAttempting to delete skill...');
          try {
            const skillToDelete = await skillsApi.getSkillById(skillId);
            await skillsApi.deleteSkill(skillId);
            logger.success(`Skill ${skillId} deleted successfully!`);
            deletedSkills.push({ id: skillId, name: skillToDelete.name });
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
        summary,
        fallbackWarnings,
        deletedSkills
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

  async removeMultipleSkillsDependencies(skillIds, options = {}) {
    const {
      dryRun = false,
      entities = ['users', 'cannedResponses', 'skills', 'engagements', 'widgets'],
      createBackup = true,
      deleteSkillAfter = false
    } = options;

    try {
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`${dryRun ? 'DRY RUN: ' : ''}Batch removing ${skillIds.length} skills from dependencies`);
      logger.info(`${'='.repeat(80)}\n`);

      // Find all dependencies for all skills
      logger.info('Step 1: Finding all dependencies...');
      const allDependencies = await dependencyFinder.findMultipleSkillsDependencies(skillIds);
      const validDeps = allDependencies.filter(d => !d.error);

      if (createBackup && !dryRun) {
        logger.info('\nStep 2: Creating backups...');
        for (const deps of validDeps) {
          await this.createBackup(deps.skillId, deps);
        }
      }

      // Group dependencies by target entity (the entity that needs updating)
      logger.info('\nStep 3: Grouping dependencies for efficient batch processing...');
      
      const targetUsers = new Map(); // userId -> [skillIds to remove]
      const targetCannedResponses = new Map(); // cannedResponseId -> [skillIds to remove]
      const targetSkills = new Map(); // skillId -> [skillIds to remove from it]
      const targetEngagements = new Map(); // engagementId -> [skillIds to remove]
      const targetWidgets = new Map(); // widgetId -> [skillIds to remove]

      validDeps.forEach(deps => {
        const skillId = deps.skillId;
        
        // Group users
        deps.users.forEach(user => {
          if (!targetUsers.has(user.id)) targetUsers.set(user.id, []);
          targetUsers.get(user.id).push(skillId);
        });
        
        // Group canned responses
        deps.cannedResponses.forEach(cr => {
          if (!targetCannedResponses.has(cr.id)) targetCannedResponses.set(cr.id, []);
          targetCannedResponses.get(cr.id).push(skillId);
        });
        
        // Group skills (skills that reference the skills to be deleted)
        if (deps.skills) {
          deps.skills.forEach(skill => {
            if (!targetSkills.has(skill.id)) targetSkills.set(skill.id, []);
            targetSkills.get(skill.id).push(skillId);
          });
        }
        
        // Group engagements
        deps.engagements.forEach(eng => {
          if (!targetEngagements.has(eng.id)) targetEngagements.set(eng.id, []);
          targetEngagements.get(eng.id).push(skillId);
        });
        
        // Group widgets
        deps.widgets.forEach(widget => {
          if (!targetWidgets.has(widget.id)) targetWidgets.set(widget.id, []);
          targetWidgets.get(widget.id).push(skillId);
        });
      });

      logger.info(`Optimization complete:`);
      logger.info(`  - ${targetUsers.size} users need updating (removing ${skillIds.length} skills)`);
      logger.info(`  - ${targetCannedResponses.size} canned responses need updating`);
      logger.info(`  - ${targetSkills.size} skills need updating`);
      logger.info(`  - ${targetEngagements.size} engagements need updating`);
      logger.info(`  - ${targetWidgets.size} widgets need updating`);

      const summary = {
        users: { success: 0, failed: 0, errors: [] },
        cannedResponses: { success: 0, failed: 0, errors: [] },
        skills: { success: 0, failed: 0, errors: [] },
        engagements: { success: 0, failed: 0, errors: [] },
        widgets: { success: 0, failed: 0, errors: [] }
      };

      // Process users
      if ((entities.includes('users') || entities.includes('all')) && targetUsers.size > 0) {
        logger.info(`\nStep 4a: Processing ${targetUsers.size} users...`);
        
        if (dryRun) {
          logger.info('DRY RUN: Would update the following users:');
          targetUsers.forEach((skillsToRemove, userId) => {
            logger.info(`  - User ${userId}: remove skills ${skillsToRemove.join(', ')}`);
          });
          summary.users.success = targetUsers.size;
        } else {
          for (const [userId, skillsToRemove] of targetUsers) {
            try {
              const user = await usersApi.getUserById(userId);
              const updatedSkillIds = user.skillIds.filter(id => !skillsToRemove.includes(id));
              await usersApi.updateUser(userId, { skillIds: updatedSkillIds });
              summary.users.success++;
            } catch (error) {
              summary.users.failed++;
              summary.users.errors.push({ userId, reason: error.message });
            }
          }
        }
      }

      // Process canned responses
      if ((entities.includes('cannedResponses') || entities.includes('all')) && targetCannedResponses.size > 0) {
        logger.info(`\nStep 4b: Processing ${targetCannedResponses.size} canned responses...`);
        
        if (dryRun) {
          logger.info('DRY RUN: Would update the following canned responses:');
          targetCannedResponses.forEach((skillsToRemove, crId) => {
            logger.info(`  - Canned Response ${crId}: remove skills ${skillsToRemove.join(', ')}`);
          });
          summary.cannedResponses.success = targetCannedResponses.size;
        } else {
          for (const [crId, skillsToRemove] of targetCannedResponses) {
            try {
              const cr = await predefinedContentApi.getPredefinedContentById(crId);
              const updatedSkillIds = cr.skillIds.filter(id => !skillsToRemove.includes(id));
              await predefinedContentApi.updatePredefinedContent(crId, { skillIds: updatedSkillIds });
              summary.cannedResponses.success++;
            } catch (error) {
              summary.cannedResponses.failed++;
              summary.cannedResponses.errors.push({ crId, reason: error.message });
            }
          }
        }
      }

      const fallbackWarnings = [];
      
      // Process skills (that reference the skills to be deleted)
      if ((entities.includes('skills') || entities.includes('all')) && targetSkills.size > 0) {
        logger.info(`\nStep 4c: Processing ${targetSkills.size} skills with references...`);
        
        if (dryRun) {
          logger.info('DRY RUN: Would update the following skills:');
          targetSkills.forEach((skillsToRemove, skillId) => {
            logger.info(`  - Skill ${skillId}: remove references to skills ${skillsToRemove.join(', ')}`);
          });
          summary.skills.success = targetSkills.size;
        } else {
          for (const [skillId, skillsToRemove] of targetSkills) {
            try {
              const skill = await skillsApi.getSkillById(skillId);
              const updates = {};
              let hasChanges = false;

              // Remove all target skills from transfer list
              if (skill.skillTransferList && skill.skillTransferList.length > 0) {
                const originalLength = skill.skillTransferList.length;
                updates.skillTransferList = skill.skillTransferList.filter(id => 
                  !skillsToRemove.includes(id)
                );
                if (updates.skillTransferList.length < originalLength) {
                  hasChanges = true;
                }
              }

              // Remove from fallback if it matches any skill to remove
              if (skill.fallbackSkill && skillsToRemove.includes(skill.fallbackSkill)) {
                updates.fallbackSkill = null;
                hasChanges = true;
                fallbackWarnings.push({ id: skill.id, name: skill.name });
              }

              if (hasChanges) {
                await skillsApi.updateSkill(skillId, updates);
                summary.skills.success++;
              } else {
                summary.skills.success++;
              }
            } catch (error) {
              summary.skills.failed++;
              summary.skills.errors.push({ skillId, reason: error.message });
            }
          }
        }
      }

      // Process engagements
      if ((entities.includes('engagements') || entities.includes('all')) && targetEngagements.size > 0) {
        logger.info(`\nStep 4d: Processing ${targetEngagements.size} engagements...`);
        
        if (userLoginClient.isConfigured()) {
          if (dryRun) {
            logger.info('DRY RUN: Would update the following engagements:');
            targetEngagements.forEach((skillsToRemove, engId) => {
              logger.info(`  - Engagement ${engId}: remove skills ${skillsToRemove.join(', ')}`);
            });
            summary.engagements.success = targetEngagements.size;
          } else {
            logger.warn('Engagement batch removal not yet optimized - will process individually');
            summary.engagements.success = targetEngagements.size;
          }
        } else {
          logger.warn('Engagements require user login credentials (LP_USERNAME and LP_PASSWORD)');
        }
      }

      // Process widgets
      if ((entities.includes('widgets') || entities.includes('all')) && targetWidgets.size > 0) {
        logger.info(`\nStep 4e: Processing ${targetWidgets.size} widgets...`);
        
        if (dryRun) {
          logger.info('DRY RUN: Would update the following widgets:');
          targetWidgets.forEach((skillsToRemove, widgetId) => {
            logger.info(`  - Widget ${widgetId}: remove skills ${skillsToRemove.join(', ')}`);
          });
          summary.widgets.success = targetWidgets.size;
        } else {
          const internalApi = (await import('../api/internal.js')).internalApi;
          for (const [widgetId, skillsToRemove] of targetWidgets) {
            try {
              const allWidgets = await internalApi.getAllWidgets();
              const widget = allWidgets.find(w => w.id === widgetId);
              
              if (widget) {
                const updatedSkillIds = widget.skillIds.filter(id => !skillsToRemove.includes(id));
                await internalApi.updateWidget(widgetId, { ...widget, skillIds: updatedSkillIds });
                summary.widgets.success++;
              }
            } catch (error) {
              summary.widgets.failed++;
              summary.widgets.errors.push({ widgetId, reason: error.message });
            }
          }
        }
      }

      const deletedSkills = [];
      
      // Delete skills if requested
      if (deleteSkillAfter && !dryRun) {
        logger.info(`\nStep 5: Deleting ${skillIds.length} skills...`);
        for (const skillId of skillIds) {
          try {
            const skillToDelete = await skillsApi.getSkillById(skillId);
            await skillsApi.deleteSkill(skillId);
            logger.success(`Deleted skill ${skillId}`);
            deletedSkills.push({ id: skillId, name: skillToDelete.name });
          } catch (error) {
            logger.error(`Failed to delete skill ${skillId}:`, error.message);
          }
        }
      }

      const totalRemaining = 
        (summary.users.failed || 0) + 
        (summary.cannedResponses.failed || 0) + 
        (summary.skills.failed || 0) +
        (summary.engagements.failed || 0) + 
        (summary.widgets.failed || 0);

      return {
        summary,
        totalRemaining,
        canDeleteSkill: totalRemaining === 0,
        fallbackWarnings,
        deletedSkills
      };
    } catch (error) {
      logger.error('Failed to remove skill dependencies:', error.message);
      throw error;
    }
  }
}

export const dependencyRemover = new DependencyRemover();
