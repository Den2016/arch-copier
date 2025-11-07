# arch-copier

A cross-platform command-line tool to copy a file with a timestamped name and automatically manage archive storage by size or count limits.

---

## 🇬🇧 English

### Features
- Copies a file to a target directory with a name like: 2025-11-07-14-30-45-filename.ext.
- Supports three cleanup policies:
  - -L=N: Keep at most N files (delete oldest if exceeded).
  - -P=N: Ensure at least N% free disk space (default: -P=10).
  - -S=N: Ensure free space = N × file size.
- Skips copy if destination file exists (unless -O is used to overwrite).
- Works on Windows and Linux.
- Standalone executable (no Node.js required on target machine).

### Installation (for building)

You need Node.js ≥16.2:

npm install

### Usage

# Show help
arch-copier

# Basic copy (uses default -P=10)
arch-copier ./report.zip ./archive

# Keep only 30 latest files
arch-copier C:\data\log.zip D:\backup -L=30

# Ensure free space = 20 × file size
arch-copier /home/user/data.tar.gz /mnt/archive -S=20 -O

### Build standalone executable

# Build for Windows
npm run build:win    # → arch-copier.exe

# Build for Linux
npm run build:linux  # → arch-copier

# Build both
npm run build

The resulting binary can be copied to any machine (even without Node.js) and run directly.

### Dependencies
- diskusage — for accurate free space detection.
- pkg — for packaging into executable.

---

## 🇷🇺 Русский

### Возможности
- Копирует файл в целевую папку с именем вида: 2025-11-07-14-30-45-имяфайла.расширение.
- Поддерживает три режима очистки архива:
  - -L=N: хранить не более N файлов (лишние — удаляются, начиная со старых).
  - -P=N: поддерживать не менее N% свободного места на диске (по умолчанию -P=10).
  - -S=N: оставлять свободное место = N × размер копируемого файла.
- Пропускает копирование, если файл с таким именем уже существует (если не указан флаг -O для перезаписи).
- Работает на Windows и Linux.
- Собирается в standalone-исполняемый файл (не требует Node.js на целевой машине).

### Установка (для сборки)

Требуется Node.js ≥16.2:

npm install

### Использование

# Показать справку
arch-copier

# Простое копирование (по умолчанию -P=10)
arch-copier ./report.zip ./archive

# Хранить только 30 последних файлов
arch-copier C:\data\log.zip D:\backup -L=30

# Оставить место = 20 × размер файла
arch-copier /home/user/data.tar.gz /mnt/archive -S=20 -O

### Сборка standalone-файла

# Для Windows
npm run build:win    # → arch-copier.exe

# Для Linux
npm run build:linux  # → arch-copier

# Собрать обе версии
npm run build

Полученный исполняемый файл можно копировать на любую машину (даже без Node.js) и запускать напрямую.

### Зависимости
- diskusage — для точного определения свободного места.
- pkg — для упаковки в исполняемый файл.