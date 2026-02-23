#!/usr/bin/env node

import { Command } from 'commander';
import { validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { Formatter } from './utils/formatter.js';
import { skillsApi } from './api/skills.js';
import { dependencyFinder } from './services/dependencyFinder.js';
import { dependencyRemover } from './services/dependencyRemover.js';
import { join } from 'path';
import chalk from 'chalk';

const program = new Command();

program
  .name('liveperson-skill-cleaner')
  .description('CLI tool to identify and remove skill dependencies in LivePerson')
  .version('1.0.0');

program
  .command('find')
  .description('Find all dependencies for a skill')
  .requiredOption('-s, --skill-id <skillId>', 'Skill ID to search for')
  .option('-o, --output <path>', 'Export results to file (supports .json or .csv)')
  .option('-f, --format <format>', 'Output format: table, json, csv', 'table')
  .action(async (options) => {
    try {
      validateConfig();
      
      const dependencies = await dependencyFinder.findSkillDependencies(options.skillId);
      
      if (options.output) {
        const ext = options.output.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
        if (ext === 'csv') {
          await Formatter.exportToCsv(dependencies, options.output);
        } else {
          Formatter.exportToJson(dependencies, options.output);
        }
      } else if (options.format === 'json') {
        console.log(JSON.stringify(dependencies, null, 2));
      } else if (options.format === 'csv') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const csvPath = join('reports', `skill-${options.skillId}-deps-${timestamp}.csv`);
        await Formatter.exportToCsv(dependencies, csvPath);
      } else {
        Formatter.displayDependenciesTable(dependencies);
      }
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('find-multiple')
  .description('Find dependencies for multiple skills')
  .requiredOption('-s, --skill-ids <skillIds>', 'Comma-separated skill IDs')
  .option('-o, --output <path>', 'Export results to JSON file')
  .action(async (options) => {
    try {
      validateConfig();
      
      const skillIds = options.skillIds.split(',').map(id => id.trim());
      const results = await dependencyFinder.findMultipleSkillsDependencies(skillIds);
      
      if (options.output) {
        Formatter.exportToJson(results, options.output);
      } else {
        results.forEach(deps => {
          if (!deps.error) {
            Formatter.displayDependenciesTable(deps);
            console.log('\n');
          } else {
            logger.error(`Skill ${deps.skillId}: ${deps.error}`);
          }
        });
      }
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-skills')
  .description('List all skills in the account')
  .option('-o, --output <path>', 'Export results to JSON file')
  .action(async (options) => {
    try {
      validateConfig();
      
      const skills = await skillsApi.getAllSkills();
      
      if (options.output) {
        Formatter.exportToJson(skills, options.output);
      } else {
        Formatter.displaySkillsList(skills);
      }
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('remove')
  .description('Remove skill from dependencies')
  .requiredOption('-s, --skill-id <skillId>', 'Skill ID to remove')
  .option('--dry-run', 'Show what would be changed without making changes', false)
  .option('-e, --entities <entities>', 'Entity types to process: users, cannedResponses, skills, engagements, widgets, all', 'all')
  .option('--delete-skill', 'Delete the skill after removing all dependencies', false)
  .option('--no-backup', 'Skip creating a backup before removal')
  .action(async (options) => {
    try {
      validateConfig();
      
      const entities = options.entities === 'all' 
        ? ['users', 'cannedResponses', 'skills', 'engagements', 'widgets']
        : options.entities.split(',').map(e => e.trim());

      if (!options.dryRun) {
        console.log(chalk.yellow('\n⚠️  WARNING: This will modify your LivePerson configuration!'));
        console.log(chalk.yellow('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const result = await dependencyRemover.removeSkillDependencies(options.skillId, {
        dryRun: options.dryRun,
        entities,
        createBackup: options.backup,
        deleteSkillAfter: options.deleteSkill
      });

      console.log('\n');
      Formatter.displayRemovalSummary(result.summary);
      
      if (options.dryRun) {
        console.log(chalk.cyan('\nThis was a dry run. No changes were made.'));
        console.log(chalk.cyan('Run without --dry-run to apply changes.'));
      }
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('backup')
  .description('Create a backup of skill dependencies')
  .requiredOption('-s, --skill-id <skillId>', 'Skill ID to backup')
  .option('-o, --output <path>', 'Output path for backup file')
  .action(async (options) => {
    try {
      validateConfig();
      
      const dependencies = await dependencyFinder.findSkillDependencies(options.skillId);
      
      let backupPath;
      if (options.output) {
        const backup = {
          timestamp: new Date().toISOString(),
          skillId: options.skillId,
          dependencies,
          metadata: {
            totalUsers: dependencies.users.length,
            totalCannedResponses: dependencies.cannedResponses.length,
            totalEngagements: dependencies.engagements.length,
            totalWidgets: dependencies.widgets.length
          }
        };
        writeFileSync(options.output, JSON.stringify(backup, null, 2), 'utf-8');
        backupPath = options.output;
      } else {
        backupPath = await dependencyRemover.createBackup(options.skillId, dependencies);
      }
      
      logger.success(`Backup created: ${backupPath}`);
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('rollback')
  .description('Rollback changes from a backup file')
  .requiredOption('-b, --backup <path>', 'Path to backup file')
  .action(async (options) => {
    try {
      validateConfig();
      
      await dependencyRemover.rollback(options.backup);
      
    } catch (error) {
      logger.error('Command failed:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
