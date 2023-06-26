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

  //Function to open the zip file that we created

  function openZipFile() {
    return dialog.showOpenDialogSync(win, {
        title: 'Select Backup Zip File',
        filters: [{name: 'Zip Files', extensions: ['zip'] }],
        properties: ['openFile']
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

ipcMain.on('restore:start', async (event) => {
    const selectedZipFile = openZipFile();

    if (selectedZipFile && selectedZipFile.length > 0) {
        const zipFilePath = selectedZipFile[0];

        //Create a progress bar
        progressBar = new ProgressBar({
            text: 'Extracting backup...',
            detail: 'Extracting files',
            browserWindow: {
                webPreferences: {
                    nodeIntegration: true
                },
                title: 'Extraction Progress',
                closable: false,
                minimizable: false,
                maximizable: false,
                width: 400,
                height: 150,
                autoHideMenuBar: true
            }
        });

        try {
            const zip = new JSzip();
            const extractedFiles = [];
          
            // Create a readable stream to read the zip file
            const readStream = fs.createReadStream(zipFilePath);
            let fileData = Buffer.alloc(0);
          
            // Load the zip data by reading the stream in chunks
            await new Promise((resolve, reject) => {
              readStream.on('data', (chunk) => {
                fileData = Buffer.concat([fileData, chunk]);
              });
          
              readStream.on('end', () => {
                resolve();
              });
          
              readStream.on('error', (error) => {
                reject(error);
              });
            });
          
            // Load the zip data
            await zip.loadAsync(fileData);
          
            // Extract each file to the specified location
            for (const filePath of filesToBackup) {
              const fileName = path.basename(filePath);
              const fileData = await zip.file(fileName).async('nodebuffer');
              await fs.promises.writeFile(filePath, fileData);
              extractedFiles.push(filePath);
              progressBar.detail = `Extracted ${extractedFiles.length} of ${filesToBackup.length} files`;
            }
          
            progressBar.close();
            win.webContents.send('restore:done');
          } catch (error) {
            console.error(error);
            progressBar.close();
            win.webContents.send('restore:failed');
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