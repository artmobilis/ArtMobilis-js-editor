var app = require('app');
var BrowserWindow = require('browser-window');
var client = require('electron-connect').client;

app.on('ready', function() {
  var mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    'web-preferences': {
      'web-security': false,
      'webgl': true
    },
    center: true,
    icon: 'app/img/logo.png'
  });
  mainWindow.loadUrl('file://' + __dirname + '/app/index.html');
  // mainWindow.loadUrl('http://html5test.com/'); // to see what is available
  // mainWindow.openDevTools(); // to show the dev tools by default
  client.create(mainWindow);
})