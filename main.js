const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle Squirrel install/uninstall events (shortcuts + Add/Remove Programs)
if (require('electron-squirrel-startup')) app.quit();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 700,
    minHeight: 500,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, 'src', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFiles', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF files',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile', 'multiSelections'],
  });
  return canceled ? [] : filePaths;
});

ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select folder containing PDFs',
    properties: ['openDirectory'],
  });
  if (canceled) return null;
  const dir = filePaths[0];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
    .map((e) => path.join(dir, e.name));
});

ipcMain.handle('dialog:saveFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select output folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('convert:pdfs', async (_event, { files, outputDir }) => {
  const { default: pdf2md } = await import('@opendocsg/pdf2md');
  const results = [];

  for (const filePath of files) {
    const name = path.basename(filePath, path.extname(filePath));
    const outPath = path.join(outputDir, `${name}.md`);
    try {
      const buffer = fs.readFileSync(filePath);
      const markdown = await pdf2md(buffer);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outPath, markdown, 'utf8');
      results.push({ file: filePath, outPath, ok: true });
    } catch (err) {
      results.push({ file: filePath, outPath: null, ok: false, error: err.message });
    }
    mainWindow.webContents.send('convert:progress', {
      file: path.basename(filePath),
      done: results.length,
      total: files.length,
      ok: results[results.length - 1].ok,
    });
  }

  return results;
});

ipcMain.handle('shell:openFolder', async (_event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('app:getDefaultOutput', () => {
  return path.join(os.homedir(), 'Documents', 'pdf2md-output');
});
