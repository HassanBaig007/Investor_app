const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const isPrivateIpv4 = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;

  const parts = ip.split('.').map(Number);
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
};

const scoreInterface = (ifaceName) => {
  const name = String(ifaceName || '').toLowerCase();
  if (!name) return 0;
  if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wireless') || name.includes('wlan')) return 100;
  if (name.includes('ethernet') || name.includes('en0') || name.includes('eth')) return 80;
  if (name.includes('mobile') || name.includes('hotspot')) return 75;
  if (name.includes('virtual') || name.includes('vmware') || name.includes('vbox') || name.includes('docker') || name.includes('loopback')) return -10;
  return 40;
};

const getBestLocalIpv4 = () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [ifaceName, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      if (address.internal) continue;
      if (address.family !== 'IPv4') continue;
      if (!isPrivateIpv4(address.address)) continue;

      candidates.push({
        ip: address.address,
        score: scoreInterface(ifaceName),
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].ip;
};

const projectRoot = path.resolve(__dirname, '..');
const envLocalPath = path.join(projectRoot, '.env.local');
const ip = getBestLocalIpv4();

if (!ip) {
  console.log('[API URL] No private IPv4 found; keeping existing environment config.');
  process.exit(0);
}

const apiUrl = `http://${ip}:3000`;
const content = [
  `SPLITFLOW_API_URL=${apiUrl}`,
  `API_BASE_URL=${apiUrl}`,
  '',
].join('\n');

fs.writeFileSync(envLocalPath, content, 'utf8');
console.log(`[API URL] Using ${apiUrl}`);
