const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ProgressBar = require('electron-progressbar');
const JSzip = require('jszip');

let win;
let progressBar;

const createWindow = () => {
    win = new BrowserWindow({
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

// Function to open file explorer dialog and return selected file path

function openFFModsExplorer() {
    return dialog.showOpenDialogSync(win, {
        title: 'Select FFXIV Mod folder',
        properties: ['openDirectory']
    });
}

// Function to open directory picker dialog and return selected directory path
function openDirectoryPicker() {
    return dialog.showOpenDialogSync(win, {
        title: 'Select Backup Destination',
        properties: ['openDirectory']
    });
}

//Function to create a zip file with progress bar

async function zipProgressBar(filePaths, zipPath) {
    const zip = new JSzip();
    const totalFiles = filePaths.length;
  
    // Create a progress bar with total number of files
    progressBar = new ProgressBar({
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
        height: 200,
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
        const fileStream = fs.createReadStream(filePath);
        const relativePath = path.relative(basePath, filePath);
        zip.file(relativePath, fileStream);
      }
  
      updateProgressBar(filePaths.indexOf(filePath));
    }
  
    for (let i = 0; i < totalFiles; i++) {
      const filePath = filePaths[i];
      await addFileToZip(filePath, appDataPath);
    }
  
    // Create the destination directory if it doesn't exist
    const destinationDir = path.dirname(zipPath);
    if (!(await fs.promises.stat(destinationDir).catch(() => null))) {
      await fs.promises.mkdir(destinationDir, { recursive: true });
    }
  
    // Cleanup previous zip file
    try {
      await fs.promises.unlink(zipPath);
    } catch (error) {
      // Ignore error if the file doesn't exist
    }
  
    // Write the zip file
    return new Promise((resolve, reject) => {
      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(zipPath))
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  

  //check to see if files exist before zipping
  async function checkFilesExist(filePaths) {
    for (const filePath of filePaths) {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch (error) {
            // File does not exist
            return false;
        }
    }
    return true;
}

// Example usage - Writing a test to function off of. 
const filesToBackup = [
    `${appDataPath}/XIVLauncher/backups/Penumbra`,
    `${appDataPath}/XIVLauncher/pluginConfigs/Penumbra.json`,
    `${appDataPath}/XIVLauncher/pluginConfigs/Penumbra`
]

//Listen for backup:start and run the zipping process, send an alert on success or failure.
ipcMain.on('backup:start', async (event) => {
    const filesExist = await checkFilesExist(filesToBackup)

    if (!filesExist) {
        //Display a warning to Electron
        win.webContents.send('nofiles')
    }else {
        const selectedModsFile = openFFModsExplorer();
        const selectedDirectory = openDirectoryPicker();

    if (selectedModsFile && selectedModsFile.length > 0) {
        // Add the selected file to the filesToBackup array
        filesToBackup.push(selectedModsFile[0]);
        
        if (selectedDirectory && selectedDirectory.length > 0) {
            const backupDiretory = selectedDirectory[0];

            const backupZipPath = path.join(backupDiretory, 'pensave.zip');
            
            zipProgressBar(filesToBackup, backupZipPath)
            .then(() => {
                console.log('Backup Completed')
                win.webContents.send('backup:done');
                progressBar.close();
            })
            .catch((error) => {
                console.error(error);
                win.webContents.send('backup:failed');
                progressBar.close();
            })
        }
        }
    }
})


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
})