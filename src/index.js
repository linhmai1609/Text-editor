const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const fs = require('fs');
const showdown = require('showdown');

const converter = new showdown.Converter({tables: true, ghCodeBlocks: true, smoothLivePreview: true, simpleLineBreaks: true, ghCodeBlocks: true});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let currfilePath = undefined;
let currValue = '';
let currSessionID = 0;

let filePaths = [];
let values = [];


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },
    width: 800,
    height: 600,
  });

  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  
  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on('input:sent', (event, value) => {
  currValue = value;
  mainWindow.webContents.send('output:received', converter.makeHtml(currValue));
});

ipcMain.on('filePathSave:sent', (event, value) => {
  fs.writeFileSync(value+'.md', currValue);
  if(currfilePath === undefined) {    
    currfilePath = value+".md";
    console.log(currfilePath);
  }
});

ipcMain.on('filePathOpen:sent', (event, value) => {
  currfilePath = value;
  fs.readFile(value,"utf-8", (err, buff)=> {
    console.log(buff);
    currValue = buff;
    mainWindow.webContents.send('setupCodeMirror:sent', currValue);
    //mainWindow.webContents.send('output:received', converter.makeHtml(currValue));
  })
});

ipcMain.on('docListElement:sent', (event, value) => {
  currSessionID = value;
  currValue = values[currSessionID];
  mainWindow.webContents.send('docListElementDetail:sent', currfilePath, currValue);
});

const menuTemplate = [
  {
    label: 'File', 
    submenu: [
      {
        label: 'Open...',
        accelerator: 'Ctrl + O',
        click() {
          mainWindow.webContents.send('openDialog:show');
        }
      },

      {
        label: 'Save As...',
        accelerator: 'Ctrl + Alt + S',
        click(){
          mainWindow.webContents.send('saveDialog:show');
        }
      },

      {
        label: 'Save',
        accelerator:'Ctrl + S',
        click() {
          if(currfilePath === undefined)
            mainWindow.webContents.send('saveDialog:show');
          else{
            fs.writeFile(currfilePath, currValue, (err) => {
              if(err) throw err;
              console.log('Saved!');
            });
          }
        }
      },

      { 
        label: 'Quit',
        accelerator: 'Ctrl + Q',
        click() {
          app.quit();
        }
      }

    ]
  }
];

if(process.env.NODE_ENV !== 'production'){
  menuTemplate.push({
    label: 'View',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        accelerator: 'Ctrl + Shift + I',
        click(item, focusedWindow){
          focusedWindow.openDevTools();
        }
      }
    ]
  })
}

