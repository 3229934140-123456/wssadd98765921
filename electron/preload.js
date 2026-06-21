const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveReport: (data) => ipcRenderer.invoke('save-report', data),
  readFile: (data) => ipcRenderer.invoke('read-file', data),
});
