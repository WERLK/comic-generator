const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 保持窗口对象的全局引用，防止被垃圾回收
let mainWindow;
let backendProcess;

// 检查是否在开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: '漫剧生成器 - AI Comic Generator',
    show: false // 先不显示，等加载完成后再显示
  });

  // 加载应用
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 启动后端服务
    startBackend();
  });

  // 窗口关闭时的处理
  mainWindow.on('closed', () => {
    mainWindow = null;
    // 关闭后端服务
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
    }
  });
}

// 启动后端服务
function startBackend() {
  if (!isDev) {
    const backendPath = path.join(process.resourcesPath, 'backend');
    backendProcess = spawn('node', ['server.js'], {
      cwd: backendPath,
      stdio: 'pipe'
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  }
}

// Electron 初始化完成
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且该应用没有打开的窗口时，
  // 通常在应用程序中重新创建一个窗口
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});
