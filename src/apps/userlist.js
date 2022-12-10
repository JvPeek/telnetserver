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
    let colorString = "\u001b[38;2;" + client.color[0] + ";" + client.color[1] + ";" + client.color[2] + "m";

    client.writeln(colorString + userList[i].displayname + "\u001b[0m: " + userList[i].app);

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
module.exports = {renderScreen: renderScreen, processInput: processInput};
