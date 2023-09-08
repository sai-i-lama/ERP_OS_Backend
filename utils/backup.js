const { Client } = require("pg");
const fs = require("fs");
const CronJob = require("node-cron");
require("dotenv").config();

// Backup directory path
const backupDir = "./database_backups";

// Create a PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect to the database
client.connect();

// Backup function
const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/:/g, "-"); // Generate a timestamp for the backup file
  const backupFilePath = `${backupDir}/backup_${timestamp}.sql`;

  try {
    // Perform backup using pg_dump
    const pgDumpCommand = `pg_dump ${process.env.DATABASE_URL} -F p -f ${backupFilePath}`;
    await client.query(pgDumpCommand);

    console.log(`Backup created: ${backupFilePath}`);
  } catch (error) {
    console.error("Backup failed:", error);
  }
};

// Schedule the backup job every 12 hours (at 00:00 and 12:00)
CronJob.schedule("0 */12 * * *", backupDatabase);

// Uncomment the following line if you want to test the backup immediately
backupDatabase();

// Restore function
const restoreDatabase = async (backupFileName) => {
  try {
    const backupFilePath = `${backupDir}/${backupFileName}`;
    // Perform restore using pg_restore
    const pgRestoreCommand = `pg_restore ${process.env.DATABASE_URL} -c ${backupFilePath}`;
    await client.query(pgRestoreCommand);

    console.log(`Database restored from: ${backupFilePath}`);
  } catch (error) {
    console.error("Restore failed:", error);
  }
};

// Uncomment the following line if you want to test the restore functionality
// restoreDatabase('backup_timestamp.sql');

/* 0-  Run `node backup.js` to lunch the backup in the case of server 
   1-  `pm2 start backup.js --name backup-script`
        This command starts the backup script (`backup.js`) using PM2 and assigns the process the name `backup-script`.
        PM2 will automatically manage the script as a background process.
*/
