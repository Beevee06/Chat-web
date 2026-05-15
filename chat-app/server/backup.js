const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const logger = require('./logger');

const BACKUP_DIR = path.join(__dirname, '../backups');

const backupDatabase = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const date = new Date().toISOString().replace(/:/g, '-').split('T')[0];
  const dbPath = path.join(__dirname, 'database.sqlite');
  const backupPath = path.join(BACKUP_DIR, `database_backup_${date}.sqlite`);

  fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
      logger.error('Database backup failed', { error: err.message });
    } else {
      logger.info(`Database backed up successfully to ${backupPath}`);
    }
  });
};

// Auto backup every 24 hours
setInterval(backupDatabase, 24 * 60 * 60 * 1000);

module.exports = { backupDatabase };
