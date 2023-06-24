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
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile(path.join(__dirname, 'renderer/index.html'));
}

//Function to create a zip file with progress bar

async function zipProgressBar(filePaths, zipPath) {
    const zip = new JSzip();
    const totalFiles = filePaths.length;

    // Create a progress bar with total number of files
    const progressBar = new ProgressBar({
        text: 'Creating backup...',
        detail: 'Processing files',
        browserWindow:{
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
        const progress = (currentFile / totalFiles) * 100;
        progressBar.value = progress;
        progressBar.detail = `Processing ${currentFile + 1} of ${totalFiles}`
    }

    //Read each file and add it to the zip
    for (let i = 0; i < totalFiles; i++) {
        const filePath = filePaths[i];
        const fileData = await fs.promises.readFile(filePath);
        zip.file(filePath, fileData);
        updateProgressBar(i);
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    // Write the zip file to disk
    await fs.promises.writeFile(zipPath, content);

    // Close the progress bar window

    progressBar.close();
}

// Example usage
const filesToBackup = [
    ''
]


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