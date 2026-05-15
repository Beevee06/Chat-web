const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const qrcode = require('qrcode-terminal');
const os = require('os');

const DIRS = ['logs', 'backups', 'cloudflare', 'scripts', 'server/uploads'];
DIRS.forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

const CLOUDFLARED_PATH = path.join(__dirname, 'cloudflare', os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared');

async function downloadCloudflared() {
  if (fs.existsSync(CLOUDFLARED_PATH)) return true;
  
  console.log('Downloading cloudflared...');
  const url = os.platform() === 'win32' 
    ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
    : os.platform() === 'darwin'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64'
      : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
      
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(CLOUDFLARED_PATH);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            if (os.platform() !== 'win32') {
              fs.chmodSync(CLOUDFLARED_PATH, '755');
            }
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          if (os.platform() !== 'win32') {
            fs.chmodSync(CLOUDFLARED_PATH, '755');
          }
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(CLOUDFLARED_PATH, () => {});
      reject(err);
    });
  });
}

async function getStats() {
  const cpus = os.cpus();
  let idle = 0; let total = 0;
  for (let cpu in cpus) {
    for (let type in cpus[cpu].times) {
      total += cpus[cpu].times[type];
    }
    idle += cpus[cpu].times.idle;
  }
  const cpuUsage = 100 - ~~(100 * idle / total);
  const ramUsage = ~~((1 - os.freemem() / os.totalmem()) * 100);
  return { cpu: cpuUsage, ram: ramUsage };
}

async function startSystem() {
  await downloadCloudflared();
  
  console.log('Starting Backend & Frontend...');
  const backend = spawn('node', ['index.js'], { cwd: path.join(__dirname, 'server'), stdio: 'pipe' });
  const frontend = spawn('npm', ['run', 'dev', '--', '--host'], { cwd: path.join(__dirname, 'client'), shell: true, stdio: 'pipe' });

  // Save public url location
  const publicUrlFile = path.join(__dirname, 'server', 'public_url.json');
  fs.writeFileSync(publicUrlFile, JSON.stringify({ url: '' }));

  console.log('Starting Cloudflare Tunnel...');
  const tunnel = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', 'http://localhost:5173'], { stdio: 'pipe' });

  let publicUrl = '';
  let foundUrl = false;

  tunnel.stderr.on('data', async (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !foundUrl) {
      foundUrl = true;
      publicUrl = match[0];
      fs.writeFileSync(publicUrlFile, JSON.stringify({ url: publicUrl }));
      
      const stats = await getStats();
      console.clear();
      console.log('=================================');
      console.log('\x1b[32mSERVER STATUS: ONLINE\x1b[0m');
      console.log(`LOCAL: \x1b[36mhttp://localhost:5173\x1b[0m`);
      console.log(`PUBLIC: \x1b[36m${publicUrl}\x1b[0m`);
      console.log(`API URL: \x1b[36mhttp://localhost:3000\x1b[0m`);
      console.log(`CPU: \x1b[33m${stats.cpu}%\x1b[0m | RAM: \x1b[33m${stats.ram}%\x1b[0m`);
      console.log('=================================');
      console.log('\nSCAN TO CONNECT:\n');
      qrcode.generate(publicUrl, { small: true });

      // Try to open browser
      if (os.platform() === 'win32') {
        execSync(`start ${publicUrl}`);
      }
    }
  });

  process.on('SIGINT', () => {
    backend.kill();
    frontend.kill();
    tunnel.kill();
    process.exit(0);
  });
}

startSystem().catch(console.error);
