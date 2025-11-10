# arch-copier

A cross-platform command-line tool to copy a file with a timestamped name and automatically manage archive storage by size or count limits. Supports optional Telegram notifications with disk usage statistics.

---

## 🇬🇧 English

### Features
- Copies a file to a target directory with a name like: 2025-11-07-14-30-45-filename.ext.
- Supports three cleanup policies:
  - -L=N: Keep at most N files (delete oldest if exceeded).
  - -P=N: Ensure at least N% free disk space (default: -P=10).
  - -S=N: Ensure free space = N × file size.
- Skips copy if destination file exists (unless -O is used to overwrite).
- Optional Telegram notifications with success/failure status and disk stats.
- Works on Windows and Linux.
- Builds into a standalone executable (no Node.js required on target machine).

### Prerequisites
- Node.js ≥16.2 (only needed for building)
- Internet access (for Telegram notifications)

### Installation (for building)

```
npm install
```

> This installs diskusage and node-fetch@2 (CommonJS-compatible).

### Telegram Setup (optional)

1. Create a bot via @BotFather → get a token like 123456:ABCdef....
2. Send /start to your new bot (required to allow messages).
3. Get your chat ID by messaging @userinfobot → it will reply with your numeric ID (e.g. 987654321).

### Usage

# Show help
```
arch-copier
```

# Basic copy (default: -P=10)
```
arch-copier ./report.zip ./archive
```

# Keep only 30 latest files
```
arch-copier C:\data\log.zip D:\backup -L=30
```

# Copy with Telegram notification and disk stats
```
arch-copier /home/user/app.log /mnt/archive -P=15 -T=123456:ABCdef -C=987654321 -M="Nightly logs"
```

### Build standalone executable

# For Windows
```
npm run build:win    # → arch-copier.exe
```

# For Linux
```
npm run build:linux  # → arch-copier
```

# Build both
```
npm run build
```

The resulting binary can be copied to any machine (even without Node.js) and run directly.

### Dependencies
- diskusage — accurate disk space detection.
- node-fetch@2 — HTTP client for Telegram API (CommonJS compatible).

---

## 🇷🇺 Русский

### Возможности
- Копирует файл в целевую папку с именем вида: 2025-11-07-14-30-45-имяфайла.расширение.
- Поддерживает три режима очистки архива:
  - -L=N: хранить не более N файлов (лишние — удаляются, начиная со старых).
  - -P=N: поддерживать не менее N% свободного места на диске (по умолчанию -P=10).
  - -S=N: оставлять свободное место = N × размер копируемого файла.
- Пропускает копирование, если файл с таким именем уже существует (если не указан флаг -O для перезаписи).
- Опциональные уведомления в Telegram с результатом операции и статистикой по диску.
- Работает на Windows и Linux.
- Собирается в standalone-исполняемый файл (не требует Node.js на целевой машине).

### Требования
- Node.js ≥16.2 (требуется только для сборки)
- Доступ в интернет (для отправки уведомлений в Telegram)

### Установка (для сборки)

```
npm install
```

> Устанавливает diskusage и node-fetch@2 (совместимый с CommonJS).

### Настройка Telegram (опционально)

1. Создайте бота через @BotFather → получите токен вида 123456:ABCdef....
2. Напишите боту /start (обязательно, иначе он не сможет писать вам).
3. Узнайте свой ID, написав @userinfobot → он пришлёт ваш числовой ID (например, 987654321).

### Использование

# Показать справку
```
arch-copier
```

# Простое копирование (по умолчанию -P=10)
```
arch-copier ./report.zip ./archive
```

# Хранить только 30 последних файлов
```
arch-copier C:\data\log.zip D:\backup -L=30
```
# Копирование с уведомлением в Telegram и статистикой по диску
```
arch-copier /home/user/app.log /mnt/archive -P=15 -T=123456:ABCdef -C=987654321  -M="Nightly logs"
```
### Сборка standalone-файла

# Для Windows
```
npm run build:win    # → arch-copier.exe
```

# Для Linux
```
npm run build:linux  # → arch-copier
```

# Собрать обе версии
```
npm run build
```

Полученный исполняемый файл можно копировать на любую машину (даже без Node.js) и запускать напрямую.

### Зависимости
- diskusage — для точного определения свободного места.
- node-fetch@2 — HTTP-клиент для Telegram API (совместим с CommonJS).