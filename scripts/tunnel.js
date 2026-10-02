const { spawn } = require('child_process');

function runTunnel() {
  console.log('🚀 Starting persistent Localtunnel connection to Gateway Port 8088...');
  const child = spawn('cmd.exe', ['/c', 'npx -y localtunnel --port 8088'], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    console.log(`Tunnel closed with code ${code}. Reconnecting in 3 seconds...`);
    setTimeout(runTunnel, 3000);
  });
}

runTunnel();
