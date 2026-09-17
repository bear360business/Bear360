const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Starting Bear 360 API ===');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT || 3001);

// Find schema.prisma
let schemaPath = 'prisma/schema.prisma';
if (fs.existsSync('apps/api/prisma/schema.prisma')) {
  schemaPath = 'apps/api/prisma/schema.prisma';
}

if (process.env.DATABASE_URL) {
  console.log(`DATABASE_URL detected. Synchronizing database schema with ${schemaPath}...`);
  try {
    execSync(`npx prisma db push --schema=${schemaPath}`, {
      stdio: 'inherit',
      timeout: 30000,
    });
    console.log('Database schema push completed successfully.');
  } catch (err) {
    console.warn('Database schema push warning (non-fatal, continuing to boot server):', err.message);
  }
} else {
  console.warn('WARNING: DATABASE_URL is not set in environment variables!');
}

// Find main.js
let mainPath = './dist/main.js';
if (fs.existsSync('./apps/api/dist/main.js')) {
  mainPath = './apps/api/dist/main.js';
}

console.log(`Booting NestJS application from ${mainPath}...`);
require(path.resolve(process.cwd(), mainPath));
