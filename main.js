const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');

class BrowserApp {
  constructor() {
    this.windows = new Set();
    this.downloads = new Map();
    
    // Bind the context if needed, or use arrow functions in place
    this.init();
  }

  init() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();

      app.on('activate', () => {
        if (this.windows.size === 0) {
          this.createWindow();
        }
      });

      this.registerShortcuts();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('browser-window-created', (_, window) => {
      this.setupWindow(window);
    });
  }

  createWindow() {
    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false // Note: Adjust this based on your security needs
      }
    });

    mainWindow.loadFile('index.html'); // Point to your HTML file

    mainWindow.on('closed', () => {
      this.windows.delete(mainWindow);
    });

    this.windows.add(mainWindow);
  }

  registerShortcuts() {
    globalShortcut.register('CommandOrControl+N', () => {
      this.createWindow();
    });

    globalShortcut.register('CommandOrControl+Shift+N', () => {
      this.createIncognitoWindow(); // Ensure this function is defined or remove it if not needed
    });
  }

  setupIPC() {
    ipcMain.handle('load-url', async (event, input) => {
      try {
        const cleanInput = input.trim().replace(/\s+/g, ' ');

        const isUrl = (string) => {
          try {
            new URL(string);
            return true;
          } catch {
            return false;
          }
        };

        const isDomain = (string) => {
          return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(string);
        };

        if (isUrl(cleanInput)) {
          return { success: true, url: cleanInput };
        } else if (isDomain(cleanInput)) {
          return { success: true, url: `https://${cleanInput}` };
        } else {
          const searchTerm = encodeURIComponent(cleanInput);
          return {
            success: true,
            url: `https://www.google.com/search?q=${searchTerm}`,
            isSearch: true
          };
        }
      } catch (error) {
        console.error('Error processing URL:', error);
        return {
          success: false,
          url: 'https://www.google.com',
          error: error.message
        };
      }
    });
  }

  setupWindow(window) {
    // You can customize the setup for each window here
    window.on('closed', () => {
      this.windows.delete(window);
    });
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName());
}

new BrowserApp();

app.on('browser-window-created', (_, window) => {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      window.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
});
