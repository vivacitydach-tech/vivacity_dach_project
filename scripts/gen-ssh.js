const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const sshDir = path.join(process.env.USERPROFILE, '.ssh');
if (!fs.existsSync(sshDir)) {
  fs.mkdirSync(sshDir, { recursive: true });
}

const keyPath = path.join(sshDir, 'id_ed25519');
if (!fs.existsSync(keyPath)) {
  cp.execSync(`ssh-keygen -t ed25519 -C "developer@target.local" -f "${keyPath}" -N ""`, { stdio: 'inherit' });
}

if (fs.existsSync(keyPath + '.pub')) {
  const pub = fs.readFileSync(keyPath + '.pub', 'utf8');
  console.log('=== YOUR SSH PUBLIC KEY ===');
  console.log(pub.trim());
  console.log('===========================');
}
