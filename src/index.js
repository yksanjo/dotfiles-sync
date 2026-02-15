#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const DotfilesSync = require('./lib/dotfiles');
const logger = require('./utils/logger');
const { formatSize } = require('./utils/helpers');

const program = new Command();
const dotfiles = new DotfilesSync();

async function main() {
  program
    .name('dotfiles-sync')
    .description('Backup and sync dotfiles configuration')
    .version('1.0.0');

  program
    .command('backup')
    .description('Backup dotfiles')
    .action(async () => {
      try {
        logger.header('Backing Up Dotfiles');
        const result = await dotfiles.backupDotfiles();
        logger.success(`Backed up ${result.dotfiles} dotfiles`);
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('restore')
    .description('Restore dotfiles from backup')
    .argument('<backup>', 'Backup name')
    .action(async (backup) => {
      try {
        logger.header('Restoring Dotfiles');
        await dotfiles.restoreDotfiles(backup);
        logger.success('Dotfiles restored!');
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List dotfile backups')
    .action(async () => {
      try {
        const backups = await dotfiles.listBackups();
        if (backups.length === 0) {
          logger.info('No backups found');
          return;
        }
        logger.header('Dotfiles Backups');
        console.log(chalk.bold('  Name') + ' '.repeat(30) + chalk.bold('Files') + ' '.repeat(10) + chalk.bold('Size'));
        console.log(chalk.gray('─'.repeat(60)));
        for (const b of backups) {
          console.log(`  ${b.name}${' '.repeat(40 - b.name.length)}${b.files}${' '.repeat(15)}${formatSize(b.size)}`);
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  program
    .command('delete')
    .description('Delete a backup')
    .argument('<backup>', 'Backup name')
    .action(async (backup) => {
      try {
        await dotfiles.deleteBackup(backup);
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  if (process.argv.length === 2) {
    program.parse(['node', 'dotfiles-sync', '--help']);
  } else {
    program.parse(process.argv);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error.message);
  process.exit(1);
});
