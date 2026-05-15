const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const platform = os.platform();
const arch = os.arch();

const downloadUrl = {
  win32: {
    x64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe',
    arm64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-arm64.exe',
  },
  linux: {
    x64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64',
    arm64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64',
  },
  darwin: {
    x64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz',
    arm64: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz',
  }
};

const getDownloadUrl = () => {
  if (downloadUrl[platform] && downloadUrl[platform][arch]) {
    return downloadUrl[platform][arch];
  }
  return null;
};

const installCloudflared = () => {
  return new Promise((resolve, reject) => {
    const url = getDownloadUrl();
    if (!url) {
      return reject(new Error(`Unsupported platform or architecture: ${platform}/${arch}`));
    }

    const cloudflareDir = path.join(__dirname, '..', 'cloudflare');
    if (!fs.existsSync(cloudflareDir)) {
      fs.mkdirSync(cloudflareDir, { recursive: true });
    }

    const filename = platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
    const dest = path.join(cloudflareDir, filename);

    if (fs.existsSync(dest)) {
      console.log('Cloudflared is already installed.');
      return resolve(dest);
    }

    console.log(`Downloading Cloudflared from ${url}...`);
    const downloadCommand = platform === 'win32'
      ? `powershell -Command "Invoke-WebRequest -Uri ${url} -OutFile ${dest}"`
      : `curl -L ${url} -o ${dest}`;

    exec(downloadCommand, (error, stdout, stderr) => {
      if (error) {
        return reject(`Download failed: ${error.message}`);
      }
      if (stderr) {
        console.error(`Download stderr: ${stderr}`);
      }
      console.log('Download complete.');

      if (platform !== 'win32') {
        fs.chmodSync(dest, '755');
      }
      
      resolve(dest);
    });
  });
};

const checkAndInstall = async () => {
    try {
        const cloudflaredPath = path.join(__dirname, '..', 'cloudflare', os.platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared');
        if (!fs.existsSync(cloudflaredPath)) {
            console.log('Cloudflared not found. Installing...');
            await installCloudflared();
            console.log('Cloudflared installed successfully.');
        } else {
            console.log('Cloudflared is already installed.');
        }
    } catch (error) {
        console.error('Failed to install Cloudflared:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    checkAndInstall();
}

module.exports = { checkAndInstall, installCloudflared };
