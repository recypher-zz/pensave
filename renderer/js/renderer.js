const backup = document.querySelector('#backup-form');
const restore = document.querySelector('#restore-form');

function backupStart(e) {
    e.preventDefault();
    console.log('Starting backup...');
    ipcRenderer.send('backup:start');
}

function restoreStart(e) {
    e.preventDefault();
    console.log('Starting restore...');
    ipcRenderer.send('restore:start');
}

function alertSuccess(message) {
    Toastify.toast({
        text:message,
        duration: 5000,
        close: false,
        style: {
            background: 'green',
            color: 'white',
            textAlign: 'center'
        }
    });
}

function alertError(message) {
    Toastify.toast({
        text:message,
        duration: 5000,
        close: false,
        style: {
            background: 'red',
            color: 'white',
            textAlign: 'center'
        }
    })
}

function alertMissing(message) {
    Toastify.toast({
        text:message,
        duration: 5000,
        close: false,
        style: {
            background: 'yellow',
            color: 'black',
            textAlign: 'center'
        }
    });
}

ipcRenderer.on('backup:done', () => {
    alertSuccess(`Backup Created Successfully!`);
})

ipcRenderer.on('nofiles', () => {
    alertMissing(`Files are missing!`);
})

ipcRenderer.on('backup:failed', () => {
    alertError('Backup Failed!');
})

backup.addEventListener('submit', backupStart);
restore.addEventListener('submit', restoreStart);