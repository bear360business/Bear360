const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Starting Bear 360 API ===');
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT || 3001);

if (fs.existsSync('./posqrcode')) {
  process.chdir('./posqrcode');
}

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL detected. Running database migrations...');
  try {
    execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma', {
      stdio: 'inherit',
      timeout: 30000,
    });
    console.log('Database migrations completed successfully.');
  } catch (err) {
    console.warn('Database migration warning (non-fatal, continuing to boot server):', err.message);
  }
} else {
  console.warn('WARNING: DATABASE_URL is not set in environment variables!');
}

console.log('Booting NestJS application...');
require('./apps/api/dist/main.js');
