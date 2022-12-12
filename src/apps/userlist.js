const DEBUG=false;
require('dotenv').config()
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
function renderScreen(client) {
  client.write("\u001B[2J");
  client.write("\033[0;0H");
  let userList = global.getUserList();
  for (var i = 0; i < userList.length; i++) {
    let colorString = "\u001b[38;2;" + String(userList[i].color[0]) + ";" + String(userList[i].color[1]) + ";" + String(userList[i].color[2]) + "m";
    client.writeln(colorString + "OOO" + userList[i].displayname + "\u001b[0m: " + userList[i].app);

  }
}
function scroll(client, direction) {

}
function processInput(client, data, meta) {

  switch (meta.type) {
    case "direction":
      scroll(client, meta.direction);
      break;
  }
}

// gets called every time the user enters the app.
function startUp(client) {
  createUserData(client);

}

module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
