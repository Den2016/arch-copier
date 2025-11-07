#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const diskusage = require('diskusage');

// ========== Help ==========

function showHelp() {
  console.log(`
arch-copier — copy a file with timestamped name and manage archive by limits

Usage:
  arch-copier <source_file> <target_dir> [options]

Options:
  -L=N     — limit number of files in target directory (keep N files)
  -P=N     — ensure at least N% free disk space (default policy)
  -S=N     — ensure free space = N 
  × size of the file being copied
  -O       — overwrite if a file with the same name already exists

Examples:
  arch-copier C:\\data\\report.zip D:\\archive -S=20
  arch-copier /home/user/data.tar.gz /mnt/backup -L=50 -O

Note:
  If no policy (-L, -P, -S) is specified, -P=10 is used by default (10% free space).
`);
}

// ========== Utilities ==========

function getCurrentDatePrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

async function getTargetFiles(targetDir) {
  const files = await fs.readdir(targetDir);
  const fileStats = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(targetDir, file);
      const stat = await fs.stat(fullPath);
      return { name: file, path: fullPath, mtime: stat.mtime, size: stat.size };
    })
  );
  return fileStats.sort((a, b) => a.mtime - b.mtime); // oldest first
}

async function applyLimitByCount(targetDir, maxFiles) {
  const files = await getTargetFiles(targetDir);
  if (files.length >= maxFiles) {
    const toDelete = files.slice(0, files.length - (maxFiles - 1));
    for (const file of toDelete) {
      await fs.unlink(file.path);
      console.log(`Deleted oldest file: ${file.name}`);
    }
  }
}

async function applyLimitByFreeSpace(targetDir, requiredFreeBytes) {
  const usage = await diskusage.check(path.resolve(targetDir));
  let currentFree = usage.free;

  if (currentFree >= requiredFreeBytes) return;

  const files = await getTargetFiles(targetDir);

  while (currentFree < requiredFreeBytes && files.length > 0) {
    const oldest = files.shift();
    await fs.unlink(oldest.path);
    currentFree += oldest.size;
    console.log(`Deleted file due to low disk space: ${oldest.name}`);
  }
}

// ========== Main logic ==========

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  let source = null;
  let target = null;
  let policy = 'P'; // default
  let limit = 10;
  let overwrite = false;

  const positional = [];
  for (const arg of args) {
    if (arg === '-O') {
      overwrite = true;
    } else if (arg.startsWith('-L=')) {
      policy = 'L';
      limit = parseInt(arg.split('=')[1], 10);
      if (isNaN(limit) || limit < 1) {
        console.error('Error: -L value must be a positive integer');
        process.exit(1);
      }
    } else if (arg.startsWith('-P=')) {
      policy = 'P';
      limit = parseInt(arg.split('=')[1], 10);
      if (isNaN(limit) || limit < 0 || limit > 100) {
        console.error('Error: -P value must be between 0 and 100');
        process.exit(1);
      }
    } else if (arg.startsWith('-S=')) {
      policy = 'S';
      limit = parseInt(arg.split('=')[1], 10);
      if (isNaN(limit) || limit < 1) {
        console.error('Error: -S value must be a positive integer');
        process.exit(1);
      }
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    console.error('Error: source file and target directory are required.\n');
    showHelp();
    process.exit(1);
  }

  source = positional[0];
  target = positional[1];

  // Validate source file
  try {
    await fs.access(source);
  } catch {
    console.error(`Error: source file not found — ${source}`);
    process.exit(1);
  }

  await fs.mkdir(target, { recursive: true });

  const ext = path.extname(source);
  const basename = path.basename(source, ext);
  const newFilename = `${getCurrentDatePrefix()}-${basename}${ext}`;
  const newFilePath = path.join(target, newFilename);

  // Check if destination file exists
  let destExists = false;
  try {
    await fs.access(newFilePath);
    destExists = true;
  } catch {}

  if (destExists) {
    if (overwrite) {
      console.log(`File ${newFilename} exists. Overwrite enabled.`);
    } else {
      console.log(`File ${newFilename} already exists. Skipping.`);
      return;
    }
  }

  const sourceStat = await fs.stat(source);
  const fileSize = sourceStat.size;

  // Apply cleanup policy
  if (policy === 'L') {
    await applyLimitByCount(target, limit);
  } else {
    let requiredFree = 0;
    if (policy === 'P') {
      const usage = await diskusage.check(path.resolve(target));
      const totalSpace = usage.total;
      requiredFree = Math.floor((limit / 100) * totalSpace);
    } else if (policy === 'S') {
      requiredFree = fileSize * limit;
    }

    await applyLimitByFreeSpace(target, requiredFree);
  }

  // Copy file
  await fs.copyFile(source, newFilePath);
  console.log(`✅ Copied as: ${newFilename}`);
}

// ========== Run ==========

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});