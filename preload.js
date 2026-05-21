const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFiles: () => ipcRenderer.invoke('dialog:openFiles'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFolder: () => ipcRenderer.invoke('dialog:saveFolder'),
  convertPdfs: (opts) => ipcRenderer.invoke('convert:pdfs', opts),
  openOutputFolder: (p) => ipcRenderer.invoke('shell:openFolder', p),
  getDefaultOutput: () => ipcRenderer.invoke('app:getDefaultOutput'),
  onProgress: (cb) => ipcRenderer.on('convert:progress', (_e, data) => cb(data)),
  removeProgressListener: () => ipcRenderer.removeAllListeners('convert:progress'),
});
