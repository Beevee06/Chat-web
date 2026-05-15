const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { checkAndInstall } = require('./install-cloudflared');

const startTunnel = async () => {
    await checkAndInstall();

    const cloudflaredPath = path.join(__dirname, '..', 'cloudflare', os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared');
    const tunnelCommand = `${cloudflaredPath} tunnel --url http://localhost:3001`;

    console.log('Starting Cloudflare Tunnel...');
    const tunnelProcess = exec(tunnelCommand);

    let publicUrl = '';

    tunnelProcess.stdout.on('data', (data) => {
        console.log(`[Cloudflare Tunnel]: ${data}`);
    });

    tunnelProcess.stderr.on('data', (data) => {
        const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;
        const match = data.match(urlRegex);
        if (match) {
            publicUrl = match[0];
            console.log('=================================');
            console.log('SERVER STATUS: ONLINE');
            console.log(`LOCAL: http://localhost:3001`);
            console.log(`PUBLIC: ${publicUrl}`);
            console.log('=================================');
            console.log('QR CODE:');
            qrcode.generate(publicUrl, { small: true });

            // Update frontend config
            const feConfigPath = path.join(__dirname, '..', 'client', 'src', 'config.js');
            const configContent = `export const API_URL = '${publicUrl}';\n`;
            fs.writeFileSync(feConfigPath, configContent);
            console.log('Frontend config updated.');
        }
        console.error(`[Cloudflare Tunnel ERR]: ${data}`);
    });

    tunnelProcess.on('close', (code) => {
        console.log(`Cloudflare Tunnel process exited with code ${code}`);
    });
};

startTunnel();
