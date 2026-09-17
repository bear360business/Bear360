const ngrok = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

// Read PORT from apps/api/.env if available
let port = 3001;
const envPath = path.join(__dirname, 'apps', 'api', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^PORT\s*=\s*(\d+)/m);
  if (match) {
    port = parseInt(match[1], 10);
  }
}

const authtoken =
  process.env.NGROK_AUTHTOKEN ||
  '3ImXRFTQL7B6xH2K5LaMVW61rkK_7Wa17wJDPD84U6MmWbnYs';

async function start() {
  try {
    console.log(`🔌 Starting ngrok tunnel to http://localhost:${port}...`);
    const listener = await ngrok.forward({
      addr: port,
      authtoken: authtoken,
    });

    const url = listener.url();
    const webhookUrl = `${url}/api/v1/billing/webhooks/razorpay`;

    console.log('\n======================================================');
    console.log(`🎉 ngrok Tunnel Active!`);
    console.log(`🔗 Public URL:         ${url}`);
    console.log(`⚡ Razorpay Webhook URL: ${webhookUrl}`);
    console.log('======================================================');
    console.log('\n📋 Next Steps:');
    console.log('1. Copy the Razorpay Webhook URL above.');
    console.log('2. Paste it in Razorpay Dashboard -> Settings -> Webhooks -> Add New Webhook.');
    console.log('3. Ensure your API is running (`npm run dev` or `pnpm dev`).');
    console.log('\nPress Ctrl + C to stop the tunnel.\n');

    // Keep process alive
    process.stdin.resume();
  } catch (err) {
    console.error('❌ Failed to start ngrok tunnel:', err.message || err);
    process.exit(1);
  }
}

start();
