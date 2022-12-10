const DEBUG=false;
var mysql      = require('mysql');
require('dotenv').config()
const sqlConnectionParameters = {
  host     : process.env.SQL_HOST,
  database : process.env.SQL_DB,
  port	   : process.env.SQL_PORT,
  user     : process.env.SQL_USER,
  password : process.env.SQL_PASSWORD
};
Number.prototype.constrain = function(min, max) {
  return this.valueOf() < min ? min : (this.valueOf() > max ? max : this.valueOf());
}
function createUserData(client) {
  client.appData.peekdex = client.appData.peekdex || {};

  client.appData.peekdex.peekmon = client.appData.peekdex.peekmon || [];
  client.appData.peekdex.lastListRefresh = client.appData.peekdex.lastListRefresh || 0;
  client.appData.peekdex.cursorPosition = client.appData.peekdex.cursorPosition || 0;
}

let peekdex = false;
function loadPeekmons(client) {
  var connection = mysql.createConnection(sqlConnectionParameters);
  connection.connect();
  if (!peekdex) {
    loadPeekdex();
    return;
  }
  let thisQuery = 'SELECT * FROM peekmons WHERE trainer=' + client.twitchid + ';'
  connection.query(thisQuery, function(err, rows, fields) {
    if (err) {
      console.log('Error executing query: ', err.stack);
      return;
    }
    client.appData.peekdex.peekmons = rows;
    renderScreen(client);
  });
  connection.end();
}
function getAllPeekmonsByType(client) {
  let output = [];
  if (!client.appData.peekdex.peekmons) {
    return;
  }
  for (var i = 0; i < client.appData.peekdex.peekmons.length; i++) {
    if (!output[client.appData.peekdex.peekmons[i].raidmon.toLowerCase()]) {
      output[client.appData.peekdex.peekmons[i].raidmon.toLowerCase()] = []
    }
    output[client.appData.peekdex.peekmons[i].raidmon.toLowerCase()].push(client.appData.peekdex.peekmons[i].rowDataPacket);
  }
  return output;
}
const loadPeekdex = () => {
  var connection = mysql.createConnection(sqlConnectionParameters);
  connection.connect();
  connection.query('SELECT * FROM peekdex;', function(err, rows, fields) {
    if (err) {
      console.log('Error executing query: ', err.stack);
      return;
    }
    peekdex = rows;
  });
  connection.end();
}
loadPeekdex();
const getPeekdex = () => {
  return peekdex;
}
function renderScreen(client) {

  createUserData(client);
  client.write("\u001B[2J");
  let peekdex = getPeekdex();
  if (client.appData.peekdex.lastListRefresh + 1000 < Date.now()) {
    loadPeekmons(client);
    client.appData.peekdex.lastListRefresh = Date.now()
  }

  let peekmonList = getAllPeekmonsByType(client) || [];
  let overview = "";


  let thisLine = 2;
  for (var i = client.appData.peekdex.cursorPosition; i < peekdex.length; i++) {
    if (!peekdex[i]) {
      continue;
    }
    if (thisLine > client.windowSize[1]-3) {
      break;
    }

    let colorCode = "\u001b[1;30m";
    if (peekmonList[peekdex[i].username.toLowerCase()] && peekmonList[peekdex[i].username.toLowerCase()].length > 0) {
      colorCode  = "\u001b[1;32m";
    }
    let cursor = (client.appData.peekdex.cursorPosition == i) ? ">" : " ";
    overview += "\033[" + thisLine + ";2H";
    overview += cursor;
    overview += ("[" + peekdex[i].id + "] ").padStart(2+3+1);
    overview += colorCode;
    overview += peekdex[i].username.padEnd(26) + "\u001b[0m";

    thisLine++;

  }
  overview += buildFrame(client);
  overview.split("\n").forEach((item, i) => {
    client.write(item);
  });


}
function buildFrame(client) {
  let peekdex = getPeekdex();

  let output = "";
  for (var i = 0; i <= client.windowSize[1]-1; i++) {
    switch (i) {
      case 0:
        output += ("\033[" + (i+1) + ";0H") + '/'.padEnd(client.windowSize[0]-1, "=") + "\\";
        break;
      case client.windowSize[1]-3:
        output += ("\033[" + (i+1) + ";0H") + '\\'.padEnd(client.windowSize[0]-1, "=") + "/";
        break;
      case client.windowSize[1]-2:
        output += ("\033[" + (i+1) + ";0H") + ('\\  ' + ((peekdex[client.appData.peekdex.cursorPosition].description !== null) ? peekdex[client.appData.peekdex.cursorPosition].description : "")).substring(0,client.windowSize[0]-10).padEnd(client.windowSize[0]-3, " ") + " /";
        break;
      case client.windowSize[1]-1:
        output += ("\033[" + (i+1) + ";0H") + ' \\___' + (" Sp.Att: " + (peekdex[client.appData.peekdex.cursorPosition].specialAttack || "--") + " _").padStart(client.windowSize[0]-8, "_") + "/";
        break;
      default:
        output += "\033[" + (i+1) + ";0H|";
        output += "\033[" + (i+1) + ";" + client.windowSize[0] + "H|";

    }
  }
  return output;
}

function processInput(client, data, meta) {
  let peekdex = getPeekdex();

  if (meta.type == "direction") {
    if (meta.direction == 0) {
      client.appData.peekdex.cursorPosition--;
    }
    if (meta.direction == 1) {
      client.appData.peekdex.cursorPosition++;
    }
    client.appData.peekdex.cursorPosition= client.appData.peekdex.cursorPosition.constrain(0,peekdex.length-1)
  }
  if (meta.type == "alpha") {
    if (data == "r") {
      loadPeekdex();
    }
  }


}
module.exports = {renderScreen: renderScreen, processInput: processInput};
