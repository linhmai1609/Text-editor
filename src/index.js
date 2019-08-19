const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const fs = require('fs');
const showdown = require('showdown');

const converter = new showdown.Converter({tables: true, ghCodeBlocks: true, smoothLivePreview: true, simpleLineBreaks: true});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let currSessionID = 0;
let filePaths = [];
let values = [];
values[currSessionID] = '';
let saved = [];


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

//change preview cycle
ipcMain.on('input:sent', (event, value) => {
  values[currSessionID] = value;
  mainWindow.webContents.send('output:received', converter.makeHtml(values[currSessionID]));
});

//save cycle
ipcMain.on('filePathSave:sent', (event, value) => {
  fs.writeFileSync(value+'.md', values[currSessionID]);
  saved[currSessionID] = values[currSessionID];
  if(filePaths[currSessionID] === undefined) {    
    filePaths[currSessionID] = value+".md";
    console.log(filePaths[currSessionID]);
  }
});

//open cycle
ipcMain.on('filePathOpen:sent', (event, value) => {
  filePaths[currSessionID] = value;
  fs.readFile(value,"utf-8", (err, buff)=> {
    values[currSessionID] = saved[currSessionID] = buff;
    mainWindow.webContents.send('setupCodeMirror:sent', values[currSessionID]);
    //mainWindow.webContents.send('output:received', converter.makeHtml(currValue));
  });
});

//change between docs cycle
ipcMain.on('docListElement:sent', (event, value) => {
  currSessionID = parseInt(value);
  console.log(currSessionID);
  mainWindow.webContents.send('docListElementDetail:sent', filePaths[currSessionID], values[currSessionID]);
});

//quitMess cycle
ipcMain.on('reactQuitMessage:sent', (event, response) => {
  switch(response){
    case 1:
      break;
    case 0:
      app.quit(); 
      break;
  }
})

//menu template
const menuTemplate = [
  {
    label: 'File', 
    submenu: [
      {
        label: 'New',
        accelerator: 'Ctrl+N',
        click(){
          values[++currSessionID] = '';
          mainWindow.webContents.send('newDocument:created', currSessionID, values[currSessionID]);
        }
      },

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
          if(filePaths[currSessionID] === undefined)
            mainWindow.webContents.send('saveDialog:show');
          else{
            fs.writeFile(filePaths[currSessionID], values[currSessionID], (err) => {
              if(err) throw err;
              saved[currSessionID] = values[currSessionID];
              console.log('Saved!');              
            });
          }
        }
      },

      { 
        label: 'Quit',
        accelerator: 'Ctrl + Q',
        click() {
          if(checkDocuments())
            app.quit();
          else{
            mainWindow.webContents.send('createQuitMessage:sent');
          }
            
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

//check Docs when quitting the app
function checkDocuments() {
  for(var i = 0; i< values.length; ++i){    
    if(filePaths[i] === undefined){
      console.log('case 1');
      return false;
    }
    if(saved[i] !== values[i]){
      console.log('case 2');
      return false;
    }
    return true;
  }
}

