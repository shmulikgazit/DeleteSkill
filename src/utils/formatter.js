import Table from 'cli-table3';
import chalk from 'chalk';
import { Parser } from 'json2csv';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';

export class Formatter {
  static displayDependenciesTable(dependencies) {
    const { skillId, skillName, users, cannedResponses, skills, engagements, widgets } = dependencies;

    console.log('\n' + chalk.bold.cyan(`Skill to Delete: ${skillName} (ID: ${skillId})`));
    console.log(chalk.gray('='.repeat(80)) + '\n');

    const removalSummary = [];
    if (users.length > 0) {
      removalSummary.push(`${users.length} user(s): ${users.map(u => u.loginName).join(', ')}`);
    }
    if (cannedResponses.length > 0) {
      const items = cannedResponses.map(c => `${c.title || 'Untitled'} (${c.id})`).join(', ');
      removalSummary.push(`${cannedResponses.length} canned response(s): ${items}`);
    }
    if (skills && skills.length > 0) {
      removalSummary.push(`${skills.length} skill(s): ${skills.map(s => s.name).join(', ')}`);
    }
    if (engagements.length > 0) {
      const items = engagements.map(e => `${e.name} (${e.id}) in campaign ${e.campaignName} (${e.campaignId})`).join(', ');
      removalSummary.push(`${engagements.length} engagement(s): ${items}`);
    }
    if (widgets.length > 0) {
      const items = widgets.map(w => `${w.name} (${w.id})`).join(', ');
      removalSummary.push(`${widgets.length} widget(s): ${items}`);
    }

    const actionTable = new Table({
      head: [chalk.bold.white('Skill ID'), chalk.bold.white('Actions Required - Remove from:')],
      style: { 
        head: ['cyan'], 
        border: ['gray'],
        compact: false
      },
      colWidths: [15, 85],
      wordWrap: true
    });

    const formattedActions = removalSummary.length > 0 
      ? removalSummary.join('\n\n')
      : chalk.green('✓ No dependencies - can be deleted directly');

    actionTable.push([
      chalk.yellow(skillId),
      formattedActions
    ]);

    console.log(actionTable.toString());

    const totalDeps = users.length + cannedResponses.length + (skills?.length || 0) + engagements.length + widgets.length;
    console.log('\n' + chalk.bold(`Total Dependencies: ${totalDeps}`));
    
    if (totalDeps === 0) {
      console.log(chalk.green('\nThis skill has no dependencies and can be safely deleted!'));
    } else {
      console.log(chalk.red(`\nThis skill cannot be deleted until ${totalDeps} dependencies are removed.`));
    }
  }

  static exportToJson(dependencies, outputPath) {
    const data = JSON.stringify(dependencies, null, 2);
    writeFileSync(outputPath, data, 'utf-8');
    console.log(chalk.green(`\nExported to JSON: ${outputPath}`));
  }

  static async exportToCsv(dependencies, outputPath) {
    const { skillId, skillName, users, cannedResponses, skills, engagements, widgets } = dependencies;

    const domainApi = (await import('../api/domain.js')).domainApi;
    const leDomain = await domainApi.getLiveEngageDomain();
    const accountId = config.liveperson.accountId;

    const usersText = users.length > 0 
      ? users.map(u => `${u.loginName} (${u.id})`).join('; ')
      : '';
    
    const usersUrls = users.length > 0
      ? users.map(u => `https://${leDomain}/a/v2/${accountId}/#/um/user/${u.id}`).join('; ')
      : '';
    
    const cannedText = cannedResponses.length > 0
      ? cannedResponses.map(c => `${c.title || 'Untitled'} (${c.id})`).join('; ')
      : '';
    
    const cannedUrls = cannedResponses.length > 0
      ? cannedResponses.map(c => `https://${leDomain}/a/v2/${accountId}/#/ac/predefined/${c.id}`).join('; ')
      : '';
    
    const skillsText = (skills && skills.length > 0)
      ? skills.map(s => `${s.name} (${s.id})`).join('; ')
      : '';
    
    const skillsUrls = (skills && skills.length > 0)
      ? skills.map(s => `https://${leDomain}/a/v2/${accountId}/#/um/skill/${s.id}`).join('; ')
      : '';
    
    const engagementsText = engagements.length > 0
      ? engagements.map(e => `${e.name} (${e.id}) in campaign ${e.campaignName} (${e.campaignId})`).join('; ')
      : '';
    
    const engagementsUrls = engagements.length > 0
      ? engagements.map(e => `https://${leDomain}/a/v2/${accountId}/#/camp/campaigns/web/${e.campaignId}/engagement/web/${e.id}/settings`).join('; ')
      : '';
    
    const widgetsText = widgets.length > 0
      ? widgets.map(w => `${w.name} (${w.id})`).join('; ')
      : '';
    
    const widgetsUrls = widgets.length > 0
      ? widgets.map(w => `https://${leDomain}/a/v2/${accountId}/#/aw/my-connections`).join('; ')
      : '';

    const csvData = [{
      'Skill ID': skillId,
      'Remove from User(s)': usersText,
      'User URL(s)': usersUrls,
      'Remove from Canned Response(s)': cannedText,
      'Canned Response URL(s)': cannedUrls,
      'Remove from Skill(s)': skillsText,
      'Skill URL(s)': skillsUrls,
      'Remove from Engagement(s)': engagementsText,
      'Engagement URL(s)': engagementsUrls,
      'Remove from Widget(s)': widgetsText,
      'Widget URL(s)': widgetsUrls
    }];

    const parser = new Parser({
      fields: [
        'Skill ID',
        'Remove from User(s)',
        'User URL(s)',
        'Remove from Canned Response(s)',
        'Canned Response URL(s)',
        'Remove from Skill(s)',
        'Skill URL(s)',
        'Remove from Engagement(s)',
        'Engagement URL(s)',
        'Remove from Widget(s)',
        'Widget URL(s)'
      ]
    });
    const csv = parser.parse(csvData);
    
    mkdirSync(join(process.cwd(), 'reports'), { recursive: true });
    writeFileSync(outputPath, csv, 'utf-8');
    console.log(chalk.green(`\nExported to CSV: ${outputPath}`));
  }

  static displaySkillsList(skills) {
    console.log('\n' + chalk.bold.cyan(`Total Skills: ${skills.length}`));
    console.log(chalk.gray('='.repeat(80)) + '\n');

    const table = new Table({
      head: [chalk.bold('Skill ID'), chalk.bold('Skill Name'), chalk.bold('Description')],
      style: { head: [], border: [] },
      colWidths: [15, 30, 50]
    });

    skills.forEach(skill => {
      table.push([
        skill.id,
        skill.name || 'N/A',
        (skill.description || 'N/A').substring(0, 45) + (skill.description?.length > 45 ? '...' : '')
      ]);
    });

    console.log(table.toString());
  }

  static displayRemovalSummary(summary) {
    console.log('\n' + chalk.bold.cyan('Removal Summary'));
    console.log(chalk.gray('='.repeat(80)) + '\n');

    const table = new Table({
      head: [chalk.bold('Entity Type'), chalk.bold('Updated'), chalk.bold('Failed')],
      style: { head: [], border: [] }
    });

    Object.entries(summary).forEach(([type, stats]) => {
      table.push([type, chalk.green(stats.success), stats.failed > 0 ? chalk.red(stats.failed) : '0']);
    });

    console.log(table.toString());
  }
}
