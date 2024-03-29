var fs = require('fs');

// your app id goes here.
// remember to add your app to the appList in apps.js
const appName = "pixel";
const canvasSize = [32,32];
const dataFolder = './appData/' + appName + '/';
const colors = [];
const colorPalettes = [
  [
    [255,105,97],
    [255,180,128],
    [248, 243, 141],
    [66, 214, 164],
    [8, 202, 209],
    [89, 173, 246],
    [157, 148, 255],
    [199, 128, 232],
    [32,32,32]
  ],
  [
    [0,0,0],
    [85,255,255],
    [255,85,255],
    [255,255,255],
    [85,255,85],
    [255,85,85],
    [255,255,85]
  ]
]
let colorPalette = colorPalettes[0]
var canvas = [];
function generateCanvas(template="black") {
  for (var x = 0; x < canvasSize[0]; x++) {
    canvas[x] = [];
    for (var y = 0; y < canvasSize[1]; y++) {
      switch (template) {
        case "rainbow":
          canvas[x][y] = {"c": [Math.floor(255*(y/canvasSize[1])),Math.floor(255*(x/canvasSize[0])),255-Math.floor(255*(y/canvasSize[1]))]};

          break;
        default:
        canvas[x][y] = {"c": [127,127,127]};

      }
    }
  }
}
loadCanvas();
function saveCanvas() {
  fs.writeFile(dataFolder + "canvas.json", JSON.stringify(canvas), 'utf8', callback);
  global.mqttclient.publish("telnet/pixel/canvas", JSON.stringify(canvas));
}
function loadCanvas() {
  fs.readFile(dataFolder + "canvas.json", 'utf8', function readFileCallback(err, data){
    if (err){
      console.log(err);
      generateCanvas();
    } else {
      canvas = JSON.parse(data);
  }});
}

function callback(e) {
  console.log("saved data");
}
// your app can store per-user data inside the client.appData.appName object.
function createUserData(client) {
  // If our object doesn't exist, we create it.
  client.appData[appName] = client.appData[appName] || {};
  client.appData[appName].paintColor = client.appData[appName].paintColor || client.color;
  client.appData[appName].cursor = client.appData[appName].cursor || [canvasSize[0],canvasSize[1]];
}
function refreshClients() {

}
function setPixel(client, x, y, color = client.color) {
  if (x >= canvasSize[0] || y >= canvasSize[1]) {
    return null;
  }
  canvas[x][y] = {"c": color, "author": client.username};
  saveCanvas();
}
function getPixel(x, y, cursor="  ") {
  let colorString = "\u001b[38;2;" + String(canvas[x][y].c[0]) + ";" + String(canvas[x][y].c[1]) + ";" + String(canvas[x][y].c[2]) + "m";
  return colorString + cursor + "\033[0m";
}
function getScreenCoordString(x, y) {
  let output = [];
  output[0] = 3 + x;
  output[1] = 2 + y*2;
  let returnString = ("\033[" + output[0] + ";" + output[1] + "H");
  return returnString;
}
function drawColorPalette(client) {
  let colorPaletteString = "\033[0;3H";
  for (let i=0; i<colorPalette.length; i++) {
    let colorString = "\u001b[48;2;" + String(colorPalette[i][0]) + ";" + String(colorPalette[i][1]) + ";"  + + String(colorPalette[i][2]) + "m";
    let symbol = client.appData[appName].paintColor == colorPalette[i] ? "▒█▒" : (i+1)
    colorPaletteString += colorString + " " + symbol + " \u001b[0m " ;
  }

  let colorString = "   \u001b[48;2;" + String(client.color[0]) + ";" + String(client.color[1]) + ";"  + + String(client.color[2]) + "m";
  let symbol = client.appData[appName].paintColor == client.color ? "▒█▒" : "0"
  colorPaletteString += colorString + " " + symbol + " \u001b[0m " ;
  client.write(colorPaletteString);
}
function updateStatusBar(client) {

  let author = "";
  if (client.appData[appName].cursor[0] < canvasSize[0] && client.appData[appName].cursor[1] < canvasSize[1]) {
    author = canvas[client.appData[appName].cursor[0]][client.appData[appName].cursor[1]].author || "niemand";
  }
  const position = "\033[" + canvasSize[1]+2 + ";0H\033[37;1m";
  const helpText = " Pfeiltasten: Bewegen, Space: Pixel setzen"
  let statusBarText = position + helpText.padEnd((canvasSize[0]*2+2)-author.length-1) + author + " ";
  client.write(statusBarText);
}
function directionInput(client, data, meta) {

    if (meta.direction == 0) {
      client.appData[appName].cursor[0]--;
    }
    if (meta.direction == 1) {
      client.appData[appName].cursor[0]++;
    }
    if (meta.direction == 2) {
      client.appData[appName].cursor[1]++;
    }
    if (meta.direction == 3) {
      client.appData[appName].cursor[1]--;
    }
    if (client.appData[appName].cursor[0] < 0) { client.appData[appName].cursor[0] = 0;}
    if (client.appData[appName].cursor[1] < 0) { client.appData[appName].cursor[1] = 0;}

    if (client.appData[appName].cursor[0] > canvasSize[0]-1) { client.appData[appName].cursor[0] = canvasSize[0]-1}
    if (client.appData[appName].cursor[1] > canvasSize[1]-1) { client.appData[appName].cursor[1] = canvasSize[1]-1}

}
// gets called every time the screen is refreshed while the app is open.
function isTooSmall(client) {
    windowMinSize = [(canvasSize[0]+2)*2, (canvasSize[1]+4)];
    return (client.windowSize[0] < windowMinSize[0] || client.windowSize[1] < windowMinSize[1])

}
function renderScreen(client) {

  if (isTooSmall(client)) {
    windowMinSize = [(canvasSize[0]+2)*2, (canvasSize[1]+4)];

    client.write("\u001B[2J");
    client.write("\033[1;0H");
    client.write("Digga, dein Fenster muss");

    client.write("\033[2;0H");
    client.write("mindestens " + windowMinSize[0] + "x" + windowMinSize[1] + " Zeichen sein.");

    client.write("\033[4;0H");
    client.write("Verpiss dich mal.")
    return;
  }
  client.write("\u001B[2J");
  client.write("\033[0;0H");

  // pixel canvas
  for (let x = 0; x < canvasSize[0]; x++) {
    for (let y = 0; y < canvasSize[0]; y++) {
      client.write(getScreenCoordString(x, y))
      client.write(getPixel(x, y, (x==client.appData[appName].cursor[0] || y==client.appData[appName].cursor[1]) ? "▒▒" : "██"));
    }
  }
  drawColorPalette(client);
  updateStatusBar(client);
}

// gets called on user input inside the app.
function processInput(client, data, meta) {
  if (isTooSmall(client)) {
    return;
  }
  switch (meta.type) {
    case "enter":
      setPixel(client, client.appData[appName].cursor[0], client.appData[appName].cursor[1], client.appData[appName].paintColor)
      break;
    case "alpha":
      if (data == " ") {
        setPixel(client, client.appData[appName].cursor[0], client.appData[appName].cursor[1], client.appData[appName].paintColor)
      }

      for (let i = 1; i<=colorPalette.length; i++) {
        if (data == String(i)) { client.appData[appName].paintColor = colorPalette[i-1] }
      }
      if (data == "0") { client.appData[appName].paintColor = client.color }

      if (data == "N" && client.level >= 10) {
        generateCanvas();
      }
      if (data == "p" && client.level >= 10) {
        colorPalette = colorPalettes[0];
      }
      if (data == "P" && client.level >= 10) {
        colorPalette = colorPalettes[1];
      }
      if (data == "R" && client.level >= 10) {
        generateCanvas("rainbow");
      }
      if (data == "S" && client.level >= 10) {
        saveCanvas();
      }
      if (data == "L" && client.level >= 10) {
        loadCanvas();
      }
      break;
    case "direction":
      directionInput(client, data, meta);
      break;
  }

}

// gets called every time the user enters the app.
function startUp(client) {
  createUserData(client);

}

module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
