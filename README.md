# pensave

Backup and restore tool for Penumbra mods to move from one machine to another.


# Current Usage

- Restore system is not available at this point in time so it is just making backups currently.

1. Upon clicking "BACKUP" you will be presented with a directory prompt, locate and select your current FFXIV Mods Folder.

2. The next directory prompt will be for you to choose a destination path for the .zip to be made in.  !!!MAKE SURE YOU HAVE ENOUGH SPACE TO BACK UP ALL FILES!!!

3. Upon completion, in the are that you chose, you will find a pensave.zip file.

### Note, the files can sometimes be larger then what the native Windows .zip tool can open, you will need to use 7-Zip or another utility to open and extract the files.

Once you have the data safely on another computer and the base mods installed, it's just a matter of moving things back into place! (until I can actually get the restore functionality working).

The file paths are as follows for where you need to place everything:

### %appdata%/XIVLauncher/backups/Penumbra
### %appdata%/XIVLauncher/pluginConfigs/Penumbra.json
### %appdata%/XIVLauncher/pluginConfigs/Penumbra