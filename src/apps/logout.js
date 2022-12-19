const appName = "logout";
const fs = require('fs');
const background = String(fs.readFileSync('../artwork/moon.utf8ans')).replaceAll("\r", "").split('\n');

function createUserData(client) {
  client.appData[appName] = client.appData[appName] || {};
}
function checkLogoff(client, firstLaunch=false) {

  // console.log("Checking logoffTime: " + client.appData[appName].logoffTime + " - " + Date.now());
  if (client.app != appName && !firstLaunch) {
    client.appData[appName].logoffTime = undefined;
    return;
  }
  renderScreen(client);
  if (client.appData[appName].logoffTime < Date.now()) {
    client.end();
  }
  else {

    setTimeout(checkLogoff, 1000, client);
  }
}
function renderScreen(client) {
  drawMessage(client, "Du wirst in 10\nSekunden ausgeloggt.\n\nESC drücken\nzum Abbrechen.");
}

function processInput(client, data, meta) {
  if (meta.type = "enter") {

      client.end();
  }
}
function startUp(client) {
  createUserData(client);
  client.appData[appName].logoffTime = Date.now() + 10000;
  checkLogoff(client, true);
}


function drawMessage(client, message) {

  client.write("\u001B[2J");
  client.write("\033[0;0H");
  let messageLine = 0;
  for (var i = 0; i < background.length; i++) {
    if (background[i].includes("X")) {
      background[i] = background[i].replace("X",message.split("\n")[messageLine++]||"");
    }
    client.writeln(background[i]);
  }
}


module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
