const DEBUG = false;
const appName = "userList";
require('dotenv').config();
import {printTable, defaultStyle, ansiiStyle} from "../utils/print";

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
  client.appData[appName].style = 0;
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
    let style = defaultStyle()
    if (style == 3){
      style = ansiiStyle()
    }
    let data = userList.map(user => [{style: {color: {r: user.color[0], g: user.color[0], b: user.color[0]}}, text: user.displayname}, {style: {color: 'white'}, text: user.app}])
    table = printTable(data)
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
