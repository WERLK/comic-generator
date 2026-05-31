const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 选择目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 显示保存对话框
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // 平台信息
  platform: process.platform,
  
  // 是否是 Electron 环境
  isElectron: true
});
