/**
 * Persistent localtunnel wrapper — auto-restarts on disconnect.
 * Usage: node tunnel-lt.js
 */
const { spawn } = require('child_process')

const PORT = 3001
let currentUrl = null

function start() {
  console.log(`\n🔌 Starting localtunnel on port ${PORT}...`)

  const lt = spawn(
    'npx',
    ['localtunnel', '--port', String(PORT)],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: true },
  )

  lt.stdout.on('data', (data) => {
    const line = data.toString().trim()
    if (line) {
      console.log(line)
      const match = line.match(/your url is:\s*(https?:\/\/\S+)/i)
      if (match) {
        currentUrl = match[1]
        console.log('\n======================================================')
        console.log(`🎉 Tunnel Active!`)
        console.log(`🔗 Public URL:  ${currentUrl}`)
        console.log(`⚡ Webhook URL: ${currentUrl}/api/v1/billing/webhooks/razorpay`)
        console.log('======================================================')
        console.log('Tunnel will auto-restart if it drops.\n')
      }
    }
  })

  lt.stderr.on('data', (data) => {
    const line = data.toString().trim()
    if (line) console.error('[lt]', line)
  })

  lt.on('close', (code) => {
    console.log(`\n⚠️  Tunnel exited (code ${code}). Restarting in 3s...`)
    setTimeout(start, 3000)
  })

  lt.on('error', (err) => {
    console.error('❌ Failed to start localtunnel:', err.message)
    console.log('Retrying in 5s...')
    setTimeout(start, 5000)
  })
}

start()

// Keep process alive
process.stdin.resume()
process.on('SIGINT', () => {
  console.log('\n👋 Tunnel stopped.')
  process.exit(0)
})
