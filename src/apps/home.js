const DEBUG=false;
require('dotenv').config()

const fs = require('fs');
const background = String(fs.readFileSync('../artwork/house.utf8ans')).replaceAll("\r", "").split('\n');
function isVisible(value) {
  return !value.hidden;
}
function centerAlign(text, width) {
  let leftOvers = width - text.length;
  if (leftOvers < 0) {
    return text;
  }
  paddingBlocks = "".padEnd(Math.floor(leftOvers/2));
  return (paddingBlocks + text + paddingBlocks).padEnd(width);
}
function createUserData(client) {
  client.appData.home = client.appData.home || {};
  client.appData.home.menu = client.appData.home.menu || 0;

}
function drawBackground(client) {
  client.write("\u001B[2J");
  client.write("\033[0;0H");
  for (var i = 0; i < background.length; i++) {
    client.writeln(background[i]);
  }
}
function drawMenu(client) {
  // place and size of the menu system. [x,y]
  const menuStart = [2,32];
  const menuWidth = [22,11];
  const subtitlePosition = 16;
  const menuDotActive = "\u001b[1;33m■\u001b[37m ";
  const menuDot = "\u001b[1;30m■\u001b[0m ";

  let appList = global.getAppList().filter(isVisible);


  for (var i = 0; i < appList.length; i++) {
    client.write("\033[" + (menuStart[0]+i) + ";" + menuStart[1] + "H");
    let colorCode = (client.appData.home.menu == i) ? menuDotActive : menuDot;
    client.writeln(colorCode + appList[i].label);
  }

  client.write("\033[" + subtitlePosition + ";0H\u001b[37m" + centerAlign(appList[client.appData.home.menu].info, client.windowSize[0]));

}
function renderScreen(client) {
  createUserData(client);
  drawBackground(client);
  drawMenu(client);
  return;
  console.log(JSON.stringify(client.appData.home));

  let welcomeString = centerAlign("Where do you want to go today?", client.windowSize[0]);

  client.writeln("\n" + welcomeString + "\n");

}
function launchApp(client, app) {
  client.app = app;
}
function moveCursor(client, direction) {

  let appList = global.getAppList().filter(isVisible);

  switch (direction) {
    case 0:
      client.appData.home.menu--;
      break;
    case 1:
      client.appData.home.menu++;
      break;
  }
  if (client.appData.home.menu < 0) {
    client.appData.home.menu = 0;
  }
  if (client.appData.home.menu >= appList.length-1) {
    client.appData.home.menu = appList.length-1;
  }
}
function processInput(client, data, meta) {
  let appList = global.getAppList().filter(isVisible);

  switch (meta.type) {
    case "direction":
      moveCursor(client, meta.direction);
      break;
    case "enter":
      launchApp(client, appList[client.appData.home.menu].id);
  }
}
module.exports = {renderScreen: renderScreen, processInput: processInput};
