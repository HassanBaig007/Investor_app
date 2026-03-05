const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function parseEnvLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const idx = trimmed.indexOf('=');
  if (idx <= 0) return null;

  const key = trimmed.slice(0, idx).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  let value = trimmed.slice(idx + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) return;

    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  });
}

async function main() {
  const backendRoot = path.resolve(__dirname, '..');
  loadEnvFile(path.join(backendRoot, '.env'));
  loadEnvFile(path.join(backendRoot, '..', '.env'));

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const fcmServerKey = String(process.env.FCM_SERVER_KEY || '').trim();

  if (!mongoUri) {
    console.error('[push:health] Missing MONGODB_URI.');
    process.exitCode = 1;
    return;
  }

  const fcmConfigured = fcmServerKey.length > 0;

  try {
    await mongoose.connect(mongoUri);

    const users = mongoose.connection.db.collection('users');

    const totalUsers = await users.countDocuments({});
    const usersWithPushToken = await users.countDocuments({
      $and: [
        { 'settings.pushToken': { $type: 'string' } },
        { 'settings.pushToken': { $regex: /\S/ } },
      ],
    });

    const usersWithoutPushToken = Math.max(totalUsers - usersWithPushToken, 0);

    console.log('[push:health] Configuration');
    console.log(
      JSON.stringify(
        {
          mongoConnected: true,
          fcmConfigured,
          usersTotal: totalUsers,
          usersWithPushToken,
          usersWithoutPushToken,
        },
        null,
        2,
      ),
    );

    const ready = fcmConfigured && usersWithPushToken > 0;
    if (!ready) {
      console.log(
        '[push:health] Not ready for remote delivery. Set FCM_SERVER_KEY and ensure at least one user has a registered push token.',
      );
      process.exitCode = 2;
    } else {
      console.log('[push:health] Ready for remote push delivery checks.');
    }
  } catch (error) {
    console.error('[push:health] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

void main();
