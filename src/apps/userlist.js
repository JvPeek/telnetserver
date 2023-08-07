const DEBUG = false;
const appName = "userList";
require('dotenv').config();
const {printTable, defaultStyle, ansiiStyle} = require("../utils/print.js");

const styles = ["plain", "fancy", "ascii"];
function centerAlign(text, width)
{
  let leftOvers = width - text.length;
  if (leftOvers < 0)
  {
    return text;
  }
  paddingBlocks = "".padEnd(Math.floor(leftOvers / 2));
  return (paddingBlocks + text + paddingBlocks).padEnd(width);
}
function createUserData(client)
{
  client.appData[appName] = client.appData[appName] || {};
  client.appData[appName].style = client.appData[appName].style || 2;
  client.appData.home = client.appData.home || {};
  client.appData.home.menu = client.appData.home.menu || 0;

}
function renderScreen(client)
{
  client.write("\u001B[2J");
  client.write("\033[0;0H");
  let style = client.appData[appName].style
  let userList = global.getUserList();
  if (style == 1)
  {
    for (var i = 0; i < userList.length; i++)
    {
      let colorString = "\u001b[38;2;" + String(userList[i].color[0]) + ";" + String(userList[i].color[1]) + ";" + String(userList[i].color[2]) + "m";
      client.writeln(colorString + "" + userList[i].displayname + "\u001b[0m: " + userList[i].app);

    }
  }else {
    let printStyle = defaultStyle()
    if (style == 3){
      printStyle = ansiiStyle()
    }
    let data = userList.map(user => [{style: {color: {r: user.color[0], g: user.color[1], b: user.color[2]}}, text: user.displayname}, {style: {color: 'white'}, text: user.app}])
    table = printTable(data, [{header: "User Name"}, {header: "Location"}], printStyle)
    for (line of table) {
      client.writeln(line)
    }
  }
}
function scroll(client, direction)
{

}
function processInput(client, data, meta)
{

  switch (meta.type)
  {
    case "direction":
      scroll(client, meta.direction);
      break;
    case "alpha":
      if (data == 1){
        client.appData[appName].style = 1
      }
      if (data == 2){
        client.appData[appName].style = 2
      }
      if (data == 3){
        client.appData[appName].style = 3
      }
      break;
  }
}

// gets called every time the user enters the app.
function startUp(client)
{
  createUserData(client);

}

module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
