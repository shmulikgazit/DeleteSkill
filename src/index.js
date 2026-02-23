#!/usr/bin/env node

import { Command } from 'commander';
import { validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { Formatter } from './utils/formatter.js';
import { skillsApi } from './api/skills.js';
import { dependencyFinder } from './services/dependencyFinder.js';
import { dependencyRemover } from './services/dependencyRemover.js';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';

const program = new Command();

program
  .name('liveperson-skill-cleaner')
  .description('CLI tool to identify and remove skill dependencies in LivePerson')
  .version('1.0.0');

program
  .command('find')
  .description('Find all dependencies for a skill')
  .option('-s, --skill-id <skillId>', 'Skill ID to search for')
  .option('-n, --skill-name <skillName>', 'Skill name to search for')
  .option('-o, --output <path>', 'Export results to file (supports .json or .csv)')
  .option('-f, --format <format>', 'Output format: table, json, csv', 'table')
  .action(async (options) => {
    try {
      validateConfig();
      
      let skillId = options.skillId;
      
      // If skill name provided, look up the ID
      if (options.skillName && !skillId) {
        logger.info(`Looking up skill ID for name: ${options.skillName}`);
        const allSkills = await skillsApi.getAllSkills();
        const skill = allSkills.find(s => s.name.toLowerCase() === options.skillName.toLowerCase());
        
        if (!skill) {
          logger.error(`Skill not found with name: ${options.skillName}`);
          logger.info('Available skills:');
          allSkills.forEach(s => logger.info(`  - ${s.name} (ID: ${s.id})`));
          process.exit(1);
        }
        
        skillId = skill.id;
        logger.success(`Found skill: ${skill.name} (ID: ${skillId})`);
      }
      
      if (!skillId) {
        logger.error('Either --skill-id or --skill-name must be provided');
        process.exit(1);
      }
      
      const dependencies = await dependencyFinder.findSkillDependencies(skillId);
      
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
        const csvPath = join('reports', `skill-${skillId}-deps-${timestamp}.csv`);
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
  .option('-s, --skill-ids <skillIds>', 'Comma-separated skill IDs')
  .option('-i, --input <path>', 'Path to file with skill IDs or names (one per line or JSON array)')
  .option('--by-name', 'Treat input as skill names instead of IDs')
  .option('-o, --output <path>', 'Export results to JSON file')
  .action(async (options) => {
    try {
      validateConfig();
      
      let skillIdentifiers = [];
      
      if (options.input) {
        const fileContent = readFileSync(options.input, 'utf-8');
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(fileContent);
          skillIdentifiers = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, treat as line-separated IDs/names
          skillIdentifiers = fileContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        }
      } else if (options.skillIds) {
        skillIdentifiers = options.skillIds.split(',').map(id => id.trim());
      } else {
        logger.error('Either --skill-ids or --input must be provided');
        process.exit(1);
      }
      
      let skillIds = skillIdentifiers;
      
      // If by-name flag is set, look up skill IDs
      if (options.byName) {
        logger.info('Looking up skill IDs from names...');
        const allSkills = await skillsApi.getAllSkills();
        const skillMap = new Map(allSkills.map(s => [s.name.toLowerCase(), s]));
        
        skillIds = [];
        for (const name of skillIdentifiers) {
          const skill = skillMap.get(name.toLowerCase());
          if (skill) {
            skillIds.push(skill.id);
            logger.success(`  ${name} → ${skill.id}`);
          } else {
            logger.error(`  ${name} → Not found`);
          }
        }
        
        if (skillIds.length === 0) {
          logger.error('No valid skills found');
          process.exit(1);
        }
      }
      
      logger.info(`Processing ${skillIds.length} skill(s)...`);
      const results = await dependencyFinder.findMultipleSkillsDependencies(skillIds);
      
      // Calculate totals
      const validResults = results.filter(r => !r.error);
      const totals = {
        skills: validResults.length,
        users: 0,
        cannedResponses: 0,
        referencingSkills: 0,
        engagements: 0,
        widgets: 0
      };
      
      validResults.forEach(deps => {
        totals.users += deps.users.length;
        totals.cannedResponses += deps.cannedResponses.length;
        totals.referencingSkills += (deps.skills?.length || 0);
        totals.engagements += deps.engagements.length;
        totals.widgets += deps.widgets.length;
      });
      
      const totalDependencies = totals.users + totals.cannedResponses + 
                                totals.referencingSkills + totals.engagements + totals.widgets;
      
      if (options.output) {
        const ext = options.output.toLowerCase();
        if (ext.endsWith('.csv')) {
          // For CSV, export all skills in one file (one row per skill)
          await Formatter.exportMultipleToCsv(validResults, options.output);
        } else {
          // For JSON, export all results in one file
          Formatter.exportToJson(results, options.output);
        }
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
      
      // Display summary
      console.log(chalk.cyan('\n' + '='.repeat(80)));
      console.log(chalk.bold.cyan('SUMMARY'));
      console.log(chalk.cyan('='.repeat(80)));
      console.log(chalk.white(`Total skills analyzed: ${chalk.bold(totals.skills)}`));
      console.log(chalk.white(`Total dependencies found: ${chalk.bold.yellow(totalDependencies)}`));
      console.log(chalk.white(`  - Users: ${totals.users}`));
      console.log(chalk.white(`  - Canned Responses: ${totals.cannedResponses}`));
      console.log(chalk.white(`  - Skills (referencing): ${totals.referencingSkills}`));
      console.log(chalk.white(`  - Engagements: ${totals.engagements}`));
      console.log(chalk.white(`  - Widgets: ${totals.widgets}`));
      console.log(chalk.cyan('='.repeat(80) + '\n'));
      
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
  .option('-s, --skill-id <skillId>', 'Skill ID to remove')
  .option('-n, --skill-name <skillName>', 'Skill name to remove')
  .option('-i, --input <path>', 'Path to file with skill IDs or names (one per line or JSON array)')
  .option('--by-name', 'Treat input as skill names instead of IDs')
  .option('--dry-run', 'Show what would be changed without making changes', false)
  .option('-e, --entities <entities>', 'Entity types to process: users, cannedResponses, skills, engagements, widgets, all', 'all')
  .option('--delete-skill', 'Delete the skill after removing all dependencies', false)
  .option('--no-backup', 'Skip creating a backup before removal')
  .action(async (options) => {
    try {
      validateConfig();
      
      let skillIds = [];
      
      if (options.input) {
        const fileContent = readFileSync(options.input, 'utf-8');
        let skillIdentifiers = [];
        try {
          // Try parsing as JSON first
          const parsed = JSON.parse(fileContent);
          skillIdentifiers = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          // If not JSON, treat as line-separated IDs/names
          skillIdentifiers = fileContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        }
        
        // If by-name flag is set, look up skill IDs
        if (options.byName) {
          logger.info('Looking up skill IDs from names...');
          const allSkills = await skillsApi.getAllSkills();
          const skillMap = new Map(allSkills.map(s => [s.name.toLowerCase(), s]));
          
          for (const name of skillIdentifiers) {
            const skill = skillMap.get(name.toLowerCase());
            if (skill) {
              skillIds.push(skill.id);
              logger.success(`  ${name} → ${skill.id}`);
            } else {
              logger.error(`  ${name} → Not found`);
            }
          }
        } else {
          skillIds = skillIdentifiers;
        }
      } else if (options.skillName) {
        logger.info(`Looking up skill ID for name: ${options.skillName}`);
        const allSkills = await skillsApi.getAllSkills();
        const skill = allSkills.find(s => s.name.toLowerCase() === options.skillName.toLowerCase());
        
        if (!skill) {
          logger.error(`Skill not found with name: ${options.skillName}`);
          process.exit(1);
        }
        
        skillIds = [skill.id];
        logger.success(`Found skill: ${skill.name} (ID: ${skill.id})`);
      } else if (options.skillId) {
        skillIds = [options.skillId];
      } else {
        logger.error('Either --skill-id, --skill-name, or --input must be provided');
        process.exit(1);
      }
      
      if (skillIds.length === 0) {
        logger.error('No valid skills found to process');
        process.exit(1);
      }
      
      const entities = options.entities === 'all' 
        ? ['users', 'cannedResponses', 'skills', 'engagements', 'widgets']
        : options.entities.split(',').map(e => e.trim());

      if (!options.dryRun) {
        console.log(chalk.yellow(`\n⚠️  WARNING: This will modify ${skillIds.length} skill(s) in your LivePerson configuration!`));
        console.log(chalk.yellow('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n'));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Use optimized batch processing for multiple skills
      if (skillIds.length > 1) {
        logger.info(chalk.cyan('\nUsing optimized batch processing (each entity updated only once)...\n'));
        
        const result = await dependencyRemover.removeMultipleSkillsDependencies(skillIds, {
          dryRun: options.dryRun,
          entities,
          createBackup: options.backup,
          deleteSkillAfter: options.deleteSkill
        });

        console.log('\n');
        Formatter.displayRemovalSummary(result.summary, {
          fallbackWarnings: result.fallbackWarnings || [],
          deletedSkills: result.deletedSkills || []
        });
      } else {
        // Single skill - use original method
        const result = await dependencyRemover.removeSkillDependencies(skillIds[0], {
          dryRun: options.dryRun,
          entities,
          createBackup: options.backup,
          deleteSkillAfter: options.deleteSkill
        });

        console.log('\n');
        Formatter.displayRemovalSummary(result.summary, {
          fallbackWarnings: result.fallbackWarnings || [],
          deletedSkills: result.deletedSkills || []
        });
      }
      
      if (options.dryRun) {
        console.log(chalk.cyan('\n' + '='.repeat(80)));
        console.log(chalk.cyan('All operations were dry runs. No changes were made.'));
        console.log(chalk.cyan('Run without --dry-run to apply changes.'));
        console.log(chalk.cyan('='.repeat(80)));
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
