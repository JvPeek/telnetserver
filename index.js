var events = require('events');
var net = require('net');
const mqtt = require('mqtt');

require('dotenv').config()
console.log(process.env.MQTT_USER)
let chatLog = [""];
const options = {
  // Clean session
  clean: true,
  connectTimeout: 4000,
  // Auth
  clientId: 'telnetserver' + generateId(4),
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
}

const mqttclient  = mqtt.connect('mqtt://' + process.env.MQTT_SERVER + ':1883', options)
mqttclient.on('connect', function () {
    console.log('Connected');
    mqttclient.subscribe('telnet/otp', function (err) {
        console.log("mqtt subscription worked");
    });
});

mqttclient.on('message', function (topic, message) {
    // message is Buffer

    let otpInfo = JSON.parse(message.toString());
    tryLogin(otpInfo);

});


clients = [];
function listClients() {
    let clientList = [];
    clientList.push(["username", "displayname", "Twitch ID", "unique id", "seed", "logged in?", "x", "y"]);
    for (let i=0; i<clients.length;i++) {
        clientList.push([clients[i].username, clients[i].displayname, clients[i].twitchid, clients[i].unique_id, clients[i].seed, clients[i].loggedIn, clients[i].windowSize[0], clients[i].windowSize[1]]);
    }
    console.table(clientList);
}

function tryLogin(otpInfo) {
    let newClient = getClientBySeed(otpInfo.otp);
    if (newClient === undefined) {
        return;
    }
    newClient.username = otpInfo.username;
    newClient.twitchid = otpInfo.userid;
    newClient.displayname = otpInfo.displayname;
    newClient.loggedIn = true;
    newClient.seed = undefined;
    systemMessage("Willkommen, " + otpInfo.displayname + "!");
    listClients();
}

function removeClientByID(id) {
    console.log("removing user with id " + id);
    clients = clients.filter(function( obj ) {
        return obj["unique_id"] !== id;
    });

    listClients();
}

function getClientByID(id) {
    let result = clients.find(obj => {
        return obj["unique_id"] === id
    });
    return result;

}

function getClientBySeed(seed) {
    let result = clients.find(obj => {
        return obj.seed === seed
    });
    return result;
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function generateId(length) {
    var output = "";
    for(var i = 0;i<length;i++) {
        output += randomInt(0,9);
    }
    return output;
}

function sendToAll(client, data) {
    let message = client.username + ": " + data;
    if (data === undefined) {
      return;
    }
    chatLog.push(message);
    chatLog = chatLog.slice(-150);
    const size = clients.length;
    console.table(chatLog);
    for(i=0;i<size;i++) {
        if (clients[i].loggedIn) {
          renderScreen(clients[i]);
        }
    }
}

function userList(sender) {
    let userList = clients.filter(function( obj ) {
        return obj.loggedIn === true;
    });

    let userListReadable = "";
    userList.forEach(function(user, index) {
        userListReadable += user.displayname + " ";
    });


    userListReadable += "\r\n";
    sender.write(userListReadable);
}

function commands(data, sender) {
    if (data.startsWith("!clients")) {
        listClients();
        return true;
    }
    if (data.startsWith("!exit")) {
        sender.end("Ausgeloggt");
        removeClientByID(sender["unique_id"]);
        return true;
    }
    if (data.startsWith("!who")) {
        userList(sender);
        return true;
    }
    return false;

}

function systemMessage(message) {
    sendToAll("SYSTEM: " + message);
}
var IAC     = 255; // interpret as command
var DONT    = 254; // you are not to use option
var DO      = 253; // please use option
var WONT    = 252; // I won't use option
var WILL    = 251; // I will use option
var SB      = 250; // sub-negotiation
var GA      = 249; // Go-ahead
var EL      = 248; // Erase line
var EC      = 247; // Erase character
var AYT     = 246; // Are you there?
var AO      = 245; // Abort output (but let prog finish)
var IP      = 244; // Interrupt (permanently)
var BREAK   = 243;
var DM      = 242; // Data mark
var NOP     = 241;
var SE      = 240; // End sub-negotiation
var EOR     = 239; // End of record (transparent mode)
var ABORT   = 238; // Abort process
var SUSP    = 237; // Suspend process
var EOF     = 236; // End of file
var SYNCH   = 242;

var OPT_BINARY            = 0; // RFC 856
var OPT_ECHO              = 1; // RFC 857
var OPT_SUPPRESS_GO_AHEAD = 3; // RFC 858
var OPT_STATUS            = 5; // RFC 859
var OPT_TIMING_MARK       = 6; // RFC 860
var OPT_TTYPE             = 24; // RFC 930, 1091
var OPT_WINDOW_SIZE       = 31; // RFC 1073
var OPT_LINE_MODE         = 34; // RFC 1184
var OPT_NEW_ENVIRON       = 39; // RFC 1572

function telnetCommand (dodontwill, command, client) {
  var bytes = [IAC, dodontwill];
  if (command instanceof Array) {
    bytes.push.apply(bytes, command);
  } else {
    bytes.push(command);
  }
  var b = new Buffer(bytes);
  client.write(b);
}

function welcomeSequence(client) {

    client.unique_id = generateId(10);
    client.seed = (Math.random() + 1).toString(36).substring(2);
    telnetCommand(WILL, OPT_ECHO, client);
    telnetCommand(WILL, OPT_SUPPRESS_GO_AHEAD, client);
    telnetCommand(WONT, OPT_LINE_MODE, client);
    telnetCommand(DO, OPT_WINDOW_SIZE, client);
    telnetCommand(DO, OPT_NEW_ENVIRON, client);

    client.writeln = function (text) {client.write(text + "\r\n");}
    client.loggedIn = false;
    client.username = "anonymous";
    client.displayname = "Anonymous";
    client.windowSize = [40,25];
    client.buffer = "";


}
function processInput(client, data) {
  const encoder = new TextEncoder();
  let bytes = [];

  if (data.charCodeAt(0) == 0x03 && data.length == 1) {
    client.end();
  }
  for (let i =0 ; i<data.length; i++) {
    let newByteSet = [];
    newByteSet[0] = Math.floor(data.charCodeAt(i).toString(10)/256);
    newByteSet[1] = data.charCodeAt(i).toString(10)%255;
    newByteSet[2] = data.charCodeAt(i);
    bytes.push(newByteSet);
  }

  if (bytes[0][0] == IAC) {

    // IAC
    // console.log("oho, ein befehl");
    try {
      if (bytes[2][2] == OPT_WINDOW_SIZE) {
        let x=(bytes[4][2]<128) ? bytes[4][2] : 127;
        let y=(bytes[6][2]<128) ? bytes[6][2] : 127;
        client.windowSize = [x, y];
        listClients();
      }
    } catch (e) {
      console.table(e, bytes);
    }
  }
  if (!client.loggedIn) {
    return;
  }
  if (/^([a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\u06F0-\u06F9 üöäßÜÖÄẞ\!\?=,-.\\\/]+)$/.test(data)) {
    client.buffer += data;
    return;
  }
  if (data.charCodeAt(0) == 127 || bytes[0][2] == 8) {
    client.buffer = client.buffer.slice(0,-1);
    return;
  }
  if (bytes[0][2] == 13)  {
    if (client.buffer.length == 0) {
      return;
    }
    sendToAll(client, client.buffer);
    client.buffer = "";
    return;
  }
}
function clearScreen(client) {

}
function renderPrompt(client) {
  client.write("\033[" + client.windowSize[1] + ";0H");
  client.write(client.buffer.padEnd(parseInt(client.windowSize[0], 10)-2, "."));
}
function renderScreen(client) {
  // BORDER
  // clear screen
  client.write("\u001B[2J");

  for (let x=0; x<client.windowSize[0];x++) {
    switch (x) {
      case 0:
        for (let y=0; y<=client.windowSize[0];y++) {
          client.write("\033[" + x + ";" + y + "H█");
        }
        break;
      case client.windowSize[1]-1:
        for (let y=0; y<=client.windowSize[0];y++) {
          client.write("\033[" + x + ";" + y + "H█");
        }
        break;
      case client.windowSize[1]:
        client.write("\033[" + x + ";0H► " + client.buffer.substring(0,client.windowSize[0]-4));
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H◄");


      default:
        client.write("\033[" + x + ";0H█");
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H█");


    }
  }
  let thisLine = 2;
  for (let chatLine=chatLog.length-client.windowSize[1]+4; chatLine<chatLog.length;chatLine++) {
    thisLine++;

    if (chatLog[chatLine]) {
      client.write("\033[" + thisLine + ";3H");
      client.write(chatLog[chatLine].substring(0,client.windowSize[0]-4));
    }
  }
}
function loginScreen(client) {
  // clear screen
  client.write("\u001B[2J");

  // go to 0,0
  client.write("\033[0;0H");
  client.writeln("Guten Tag! Sie sind verbunden mit der Mailbox von: \u001b[35mHallo\u001b[0m");
  client.writeln("Bitte schreibe die folgende Zeile in den Twitch Chat, um dich zu authentifizieren.")
  client.writeln("\r\n\u001b[35m/w JanOfThings !otp " + client.seed +  "\u001b[0m");

  client.write("\033[" + (parseInt(client.windowSize[1], 10)-1) + ";0H");
  client.writeln("Du bist nicht einloggt. Opfer.".padEnd(parseInt(client.windowSize[0],10)-2, " "));
}
var server = net.createServer(function(client) {
    console.log("New client");
    welcomeSequence(client);
    clients.push(client);
    client.on('data', function(data) {
        let thisClient = getClientByID(client["unique_id"]);

        let origdata = data;
        //data = data.toString().replace(/ {4}|[\t\n\r]/gm,'');
        data = data.toString();
        if (data.length <=0) {
            console.log("Gefiltertes Zeug:", origdata);
            return;
        }
        processInput(thisClient, data);
        if (thisClient.loggedIn == true) {
          renderScreen(client);
        } else {
          loginScreen(client);
        }
    });

    client.on('close', function() {
        removeClientByID(client.unique_id);
        if (!client.loggedIn) {
          return;
        }
        systemMessage(client.displayname + " hat uns verlassen.");
    });

    client.on('error', function(error) {
        console.log("Auweia", error);
    });
});

server.listen(parseInt(process.env.TELNET_PORT,10));
