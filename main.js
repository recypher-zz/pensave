const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ProgressBar = require('electron-progressbar');
const JSzip = require('jszip');

const createWindow = () => {
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        width: 800,
        height: 500,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        resizable: false
    })

    win.loadFile(path.join(__dirname, 'renderer/index.html'));
}

// %appdata% file path
const appDataPath = app.getPath('appData');
console.log(appDataPath);

//Function to create a zip file with progress bar

async function zipProgressBar(filePaths, zipPath) {
    const zip = new JSzip();
    const totalFiles = filePaths.length;
  
    // Create a progress bar with total number of files
    const progressBar = new ProgressBar({
      text: 'Creating backup...',
      detail: 'Processing files',
      browserWindow: {
        webPreferences: {
          nodeIntegration: true
        },
        title: 'Backup Progress',
        closable: false,
        minimizable: false,
        maximizable: false,
        width: 400,
        height: 150,
        autoHideMenuBar: true
      }
    });
  
    function updateProgressBar(currentFile) {
      progressBar.detail = `Processing file ${currentFile + 1} of ${totalFiles}`;
    }
  
    async function addFileToZip(filePath, basePath) {
      const stats = await fs.promises.stat(filePath);
  
      if (stats.isDirectory()) {
        // Add directory to the zip
        const folderPath = path.relative(basePath, filePath);
  
        // Read the directory and add its contents recursively
        const files = await fs.promises.readdir(filePath);
        for (const file of files) {
          const subFilePath = path.join(filePath, file);
          await addFileToZip(subFilePath, basePath);
        }
      } else {
        // Add file to the zip with relative directory structure
        const fileData = await fs.promises.readFile(filePath);
        const relativePath = path.relative(basePath, filePath);
        zip.file(relativePath, fileData);
      }
  
      updateProgressBar(filePaths.indexOf(filePath));
    }
  
    for (let i = 0; i < totalFiles; i++) {
      const filePath = filePaths[i];
      await addFileToZip(filePath, appDataPath);
    }
  
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.promises.writeFile(zipPath, content);
  
    progressBar.close();
  }

// Example usage - Writing a test to function off of. 
const filesToBackup = [
    `${appDataPath}/XIVLauncher/backups/Penumbra`,
    `${appDataPath}/XIVLauncher/pluginConfigs/Penumbra.json`,
    `${appDataPath}/XIVLauncher/pluginConfigs/Penumbra`
]

const backupZipPath = 'C:/Users/kniem/Desktop/pensave.zip';


// Check Operating System being ran currently
function isMacOS() {
    return os.platform() === 'darwin';
}

app.whenReady().then(() => {
    //Check OS on app startup
    if (isMacOS()) {
        console.log('Is Mac, killing process');
        //Display an error dialog if running on macOS
        dialog.showErrorBox(
            'Unsupported Operating System',
            'This application is currently not support on macOS'
        );
        app.quit();
    }
    console.log('Not a mac, starting.');
    createWindow();
    // zipProgressBar(filesToBackup, backupZipPath)
    //     .then(() => {
    //         console.log('Backup created successfully!');
    //     })
    //     .catch((error) => {
    //         console.error('Failed to create backup:', error);
    //     })
})