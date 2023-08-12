const DEBUG = false;
const appName = "debug";
require('dotenv').config();
const {printTable, defaultStyle, ansiiStyle} = require("../utils/print.js");

function createUserData(client)
{
    client.appData[appName] = client.appData[appName] || {};
    client.appData[appName].row = client.appData[appName].row || 0;
    client.appData[appName].column = client.appData[appName].column || 0;
}

function renderScreen(client)
{
    client.write("\u001B[2J");
    client.write("\u001B[0;0H");


    let printStyle = defaultStyle();
    let data = global.getUserList().map(user =>
    {
        let {unique_id ,seed, ...new_user} = user.getUserInfo();
        //console.log(user)
        console.log("new_user", new_user)
        return [{style: {color: {r: new_user.color[0], g: new_user.color[1], b: new_user.color[2]}}, text: new_user.displayname}, {style: {color: 'white'}, text: JSON.stringify(new_user)}];
    }
    );
    //TODO TEMP DEBUG REMOVE!!
    //data = Array(100).fill(data[0])
    let table = printTable(data, [{header: "User Name"}, {header: "User Info"}], printStyle, client.getConstraints(appName));
    client.appData[appName].width = table.width;
    client.appData[appName].height = table.height;
    /*
    for (line of table.text) {
      client.writeln(line)
    }
    */
    client.write(table.text.join("\r\n"))
}
function scroll(client, direction)
{
    if (direction == 0) //up
    {
        client.appData[appName].row--;
    }
    if (direction == 1) //down
    {
        client.appData[appName].row++;
    }
    if (direction == 2) //right
    {
        client.appData[appName].column++;
    }
    if (direction == 3) //left
    {
        client.appData[appName].column--;
    }
    let width = client.appData[appName].width || 0
    let height = client.appData[appName].height || 0
    client.appData[appName].row = Math.max(0, Math.min(client.appData[appName].row, height - client.windowSize[1]))
    client.appData[appName].column = Math.max(0, Math.min(client.appData[appName].column, width - client.windowSize[0]))
}
function processInput(client, data, meta)
{

    switch (meta.type)
    {
        case "direction":
            scroll(client, meta.direction);
            break;
        case "alpha":
            break;
    }
}

// gets called every time the user enters the app.
function startUp(client)
{
    createUserData(client);

}

module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
