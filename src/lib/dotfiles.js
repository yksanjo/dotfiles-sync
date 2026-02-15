const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { getTimestamp } = require('../utils/helpers');
const logger = require('../utils/logger');

class DotfilesSync {
  constructor() {
    this.homeDir = os.homedir();
    this.dotfilesDir = path.join(this.homeDir, '.dotfiles-sync');
    this.defaultDotfiles = [
      '.bashrc', '.bash_profile', '.zshrc', '.zprofile', '.profile',
      '.vimrc', '.gitconfig', '.tmux.conf', '.inputrc',
      '.config/nvim', '.config/fish', '.config/alacritty',
      '.ssh/config', '.npmrc', '.yarnrc', '.curlrc', '.wgetrc'
    ];
  }

  async init() {
    await fs.ensureDir(this.dotfilesDir);
  }

  async findDotfiles() {
    const dotfiles = [];
    for (const dotfile of this.defaultDotfiles) {
      const fullPath = path.join(this.homeDir, dotfile);
      if (await fs.pathExists(fullPath)) {
        dotfiles.push({
          name: dotfile,
          path: fullPath,
          type: (await fs.stat(fullPath)).isDirectory() ? 'dir' : 'file'
        });
      }
    }
    return dotfiles;
  }

  async backupDotfiles() {
    await this.init();
    const dotfiles = await this.findDotfiles();
    const timestamp = getTimestamp();
    const backupDir = path.join(this.dotfilesDir, timestamp);
    await fs.ensureDir(backupDir);
    
    logger.progress('Backing up dotfiles...');
    for (const dotfile of dotfiles) {
      const destPath = path.join(backupDir, dotfile.name);
      await fs.copy(dotfile.path, destPath);
      logger.success(`Backed up: ${dotfile.name}`);
    }
    
    // Save manifest
    await fs.writeJson(path.join(backupDir, 'manifest.json'), {
      dotfiles: dotfiles.map(d => d.name),
      createdAt: new Date().toISOString()
    }, { spaces: 2 });
    
    return { backupDir, dotfiles: dotfiles.length };
  }

  async restoreDotfiles(backupName) {
    const backupDir = path.join(this.dotfilesDir, backupName);
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup "${backupName}" not found`);
    }
    
    const manifest = await fs.readJson(path.join(backupDir, 'manifest.json'));
    
    logger.progress('Restoring dotfiles...');
    for (const dotfile of manifest.dotfiles) {
      const srcPath = path.join(backupDir, dotfile);
      const destPath = path.join(this.homeDir, dotfile);
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
        logger.success(`Restored: ${dotfile}`);
      }
    }
  }

  async listBackups() {
    await this.init();
    const entries = await fs.readdir(this.dotfilesDir, { withFileTypes: true });
    const backups = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(this.dotfilesDir, entry.name, 'manifest.json');
        if (await fs.pathExists(manifestPath)) {
          const manifest = await fs.readJson(manifestPath);
          const stats = await fs.stat(path.join(this.dotfilesDir, entry.name));
          backups.push({
            name: entry.name,
            createdAt: manifest.createdAt,
            files: manifest.dotfiles.length,
            size: stats.size
          });
        }
      }
    }
    
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return backups;
  }

  async deleteBackup(backupName) {
    const backupDir = path.join(this.dotfilesDir, backupName);
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup "${backupName}" not found`);
    }
    await fs.remove(backupDir);
    logger.success(`Deleted backup: ${backupName}`);
  }
}

module.exports = DotfilesSync;
