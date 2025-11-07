#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const diskusage = require('diskusage');
const fetch = require('node-fetch');

// ========== Help ==========

function showHelp() {
  console.log(`
arch-copier — copy a file with timestamped name and manage archive by limits

Usage:
  arch-copier <source_file> <target_dir> [options]

Options:
  -L=N     — limit number of files in target directory (keep N files)
  -P=N     — ensure at least N% free disk space (default policy)
  -S=N     — ensure free space = N × size of the file being copied
  -O       — overwrite if a file with the same name already exists
  -T=TOKEN — Telegram bot token (e.g. 123456:ABCdef)
  -C=ID    — Telegram chat ID (your user ID or group ID)

Examples:
  arch-copier report.zip ./archive -P=10 -T=123456:ABC -C=987654321
  arch-copier C:\\log.zip D:\\backup -L=20 -O

Note:
  If no policy (-L, -P, -S) is specified, -P=10 is used by default.
  To get your chat ID: message @userinfobot in Telegram.
  Always send /start to your bot before using it!
`);
}

// ========== Telegram ==========

async function sendTelegramMessage(token, chatId, text) {
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const params = new URLSearchParams();
  params.append('chat_id', String(chatId));
  params.append('text', text);
  params.append('parse_mode', 'Markdown');

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  } catch (err) {
    console.error('⚠️ Telegram notification failed (ignored)');
  }
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
  return files.length; // count before cleanup
}

async function applyLimitByFreeSpace(targetDir, requiredFreeBytes) {
  const usageBefore = await diskusage.check(path.resolve(targetDir));
  let currentFree = usageBefore.free;

  if (currentFree >= requiredFreeBytes) {
    return { before: usageBefore, after: usageBefore };
  }

  const files = await getTargetFiles(targetDir);

  while (currentFree < requiredFreeBytes && files.length > 0) {
    const oldest = files.shift();
    await fs.unlink(oldest.path);
    currentFree += oldest.size;
    console.log(`Deleted file due to low disk space: ${oldest.name}`);
  }

  const usageAfter = await diskusage.check(path.resolve(targetDir));
  return { before: usageBefore, after: usageAfter };
}

// ========== Main ==========

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  let source = null;
  let target = null;
  let policy = 'P';
  let limit = 10;
  let overwrite = false;
  let telegramToken = null;
  let telegramChatId = null;

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
    } else if (arg.startsWith('-T=')) {
      telegramToken = arg.split('=')[1];
    } else if (arg.startsWith('-C=')) {
      const id = arg.split('=')[1];
      telegramChatId = isNaN(id) ? id : parseInt(id, 10);
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

  // Validate source
  try {
    await fs.access(source);
  } catch {
    console.error(`Error: source file not found — ${source}`);
    await sendTelegramMessage(telegramToken, telegramChatId, `❌ *arch-copier failed*\nSource not found: \`${source}\``);
    process.exit(1);
  }

  await fs.mkdir(target, { recursive: true });

  const ext = path.extname(source);
  const basename = path.basename(source, ext);
  const newFilename = `${getCurrentDatePrefix()}-${basename}${ext}`;
  const newFilePath = path.join(target, newFilename);

  // Check existence
  let destExists = false;
  try {
    await fs.access(newFilePath);
    destExists = true;
  } catch {}

  if (destExists && !overwrite) {
    console.log(`File ${newFilename} already exists. Skipping.`);
    await sendTelegramMessage(telegramToken, telegramChatId, `ℹ️ *arch-copier*\nFile already exists, skipped:\n\`${newFilename}\``);
    return;
  }

  const sourceStat = await fs.stat(source);
  const fileSize = sourceStat.size;

  let diskStats = null;
  let fileCountBefore = 0;

  // Apply policy
  if (policy === 'L') {
    const files = await getTargetFiles(target);
    fileCountBefore = files.length;
    await applyLimitByCount(target, limit);
  } else {
    let requiredFree = 0;
    if (policy === 'P') {
      const usage = await diskusage.check(path.resolve(target));
      requiredFree = Math.floor((limit / 100) * usage.total);
    } else if (policy === 'S') {
      requiredFree = fileSize * limit;
    }
    diskStats = await applyLimitByFreeSpace(target, requiredFree);
  }

  // Copy
  try {
    await fs.copyFile(source, newFilePath);
    console.log(`✅ Copied as: ${newFilename}`);

    // Build Telegram message
    let msg = `✅ *arch-copier succeeded*\n`;
    msg += `File: \`${newFilename}\`\n`;

    if (policy !== 'L' && diskStats) {
      const { before, after } = diskStats;
      const formatBytes = (b) => {
        if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB';
        if (b > 1e6) return (b / 1e6).toFixed(2) + ' MB';
        if (b > 1e3) return (b / 1e3).toFixed(2) + ' KB';
        return b + ' B';
      };
      msg += `\n*Disk space (before → after)*:\n`;
      msg += `Free: ${formatBytes(before.free)} → ${formatBytes(after.free)}\n`;
      msg += `Total: ${formatBytes(before.total)}`;
    } else if (policy === 'L') {
      const files = await getTargetFiles(target);
      msg += `\n*Archive size*: ${files.length} files`;
    }

    await sendTelegramMessage(telegramToken, telegramChatId, msg);

  } catch (err) {
    console.error('Copy failed:', err.message);
    await sendTelegramMessage(telegramToken, telegramChatId, `❌ *arch-copier failed*\nCopy error:\n\`${err.message}\``);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});