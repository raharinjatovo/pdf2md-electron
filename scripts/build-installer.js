const { createWindowsInstaller } = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'dist', 'PDF-to-Markdown-win32-x64');
const outDir = path.join(root, 'installer');

if (!fs.existsSync(appDir)) {
  console.error('App not built yet. Run: npm run build');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

createWindowsInstaller({
  // ── Source & output ───────────────────────────────────────────────────────
  appDirectory: appDir,
  outputDirectory: outDir,

  // ── App identity ──────────────────────────────────────────────────────────
  exe: 'PDF-to-Markdown.exe',
  title: 'PDF to Markdown',
  description: 'Convert PDF files to Markdown — Desktop App',
  version: '1.0.0',
  authors: 'Axion Family Business',
  owners: 'Axion Family Business',

  // ── Installer output name ─────────────────────────────────────────────────
  setupExe: 'PDF-to-Markdown-Setup.exe',

  // ── Shortcuts (Desktop + Start Menu) ─────────────────────────────────────
  // Squirrel creates these automatically via electron-squirrel-startup
  // shortcutLocations defaults to ['Desktop', 'StartMenu']

  // ── Registry (Add/Remove Programs) ───────────────────────────────────────
  // Squirrel writes to HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall
  // automatically. No extra config needed.

  // ── Packaging ─────────────────────────────────────────────────────────────
  noMsi: true,   // no .msi, only .exe installer
  noDelta: true, // no delta update package (smaller output)

  // ── Install location ──────────────────────────────────────────────────────
  // Squirrel installs to %LocalAppData%\PDF-to-Markdown by default
  // (per-user install, no admin required)
})
  .then(() => {
    const size = (fs.statSync(path.join(outDir, 'PDF-to-Markdown-Setup.exe')).size / 1024 / 1024).toFixed(1);
    console.log(`\n✓ Installer ready`);
    console.log(`  File : installer\\PDF-to-Markdown-Setup.exe`);
    console.log(`  Size : ${size} MB`);
    console.log(`\nInstalls to : %LocalAppData%\\PDF-to-Markdown`);
    console.log(`Creates     : Desktop shortcut + Start Menu entry`);
    console.log(`Registers   : Add/Remove Programs (per-user, no admin needed)\n`);
  })
  .catch((err) => {
    console.error('Installer build failed:', err.message);
    process.exit(1);
  });
