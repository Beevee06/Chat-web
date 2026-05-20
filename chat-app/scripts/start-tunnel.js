const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');
const os = require('os');
const path = require('path');
const { checkAndInstall } = require('./install-cloudflared');

const startTunnel = async () => {
  await checkAndInstall();

  const cloudflaredPath = path.join(
    __dirname,
    '..',
    'cloudflare',
    os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared'
  );
  const targetUrl = process.env.TUNNEL_TARGET_URL || 'http://localhost:5173';

  console.log(`Starting Cloudflare Tunnel for ${targetUrl}...`);
  const tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', targetUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
  let publicUrl = '';

  const handleOutput = (data) => {
    const text = data.toString();
    const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;
    const match = text.match(urlRegex);

    if (match && !publicUrl) {
      publicUrl = match[0];
      console.log('=================================');
      console.log('SERVER STATUS: ONLINE');
      console.log(`LOCAL: ${targetUrl}`);
      console.log(`PUBLIC: ${publicUrl}`);
      console.log('=================================');
      console.log('QR CODE:');
      qrcode.generate(publicUrl, { small: true });
    }

    process.stdout.write(`[Cloudflare Tunnel] ${text}`);
  };

  tunnelProcess.stdout.on('data', handleOutput);
  tunnelProcess.stderr.on('data', handleOutput);

  tunnelProcess.on('close', (code) => {
    console.log(`Cloudflare Tunnel process exited with code ${code}`);
  });
};

startTunnel();
