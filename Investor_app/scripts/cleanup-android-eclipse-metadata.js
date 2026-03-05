const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const nodeModulesRoot = path.join(appRoot, 'node_modules');

const removableNames = new Set(['.project', '.classpath']);
let removedFiles = 0;
let removedDirs = 0;

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    removedDirs += 1;
    return;
  }

  fs.rmSync(targetPath, { force: true });
  removedFiles += 1;
}

function isAndroidNodeModulePath(fullPath) {
  const normalized = fullPath.replaceAll('\\', '/');
  return normalized.includes('/node_modules/') && normalized.includes('/android/');
}

function tryRemoveAndroidMetadata(fullPath, fileName) {
  if (!removableNames.has(fileName)) {
    return false;
  }

  if (!isAndroidNodeModulePath(fullPath)) {
    return false;
  }

  removePath(fullPath);
  return true;
}

function walk(currentPath) {
  if (!fs.existsSync(currentPath)) {
    return;
  }

  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.settings' && isAndroidNodeModulePath(fullPath)) {
        removePath(fullPath);
        continue;
      }

      walk(fullPath);
      continue;
    }

    tryRemoveAndroidMetadata(fullPath, entry.name);
  }
}

if (!fs.existsSync(nodeModulesRoot)) {
  console.log('[cleanup-android-eclipse-metadata] node_modules not found, skipping.');
  process.exit(0);
}

walk(nodeModulesRoot);

console.log(
  `[cleanup-android-eclipse-metadata] removed ${removedFiles} file(s) and ${removedDirs} director${removedDirs === 1 ? 'y' : 'ies'}.`,
);
