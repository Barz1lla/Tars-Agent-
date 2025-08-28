const { app, BrowserWindow } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 600,
    resizable: true, // Allow resizing; set to false for fixed size
    webPreferences: {
      nodeIntegration: false, // More secure; set to true only if needed
      contextIsolation: true, // Recommended for security
      preload: path.join(__dirname, 'preload.js'), // Use a preload script if needed
    },
    frame: false,
    alwaysOnTop: true,
    x: 1580,
    y: 100,
  });

  win.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    win = null;
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Re-create window on macOS when dock icon is clicked
app.on('activate', () => {
  if (win === null) createWindow();
});

app.whenReady().then(createWindow);