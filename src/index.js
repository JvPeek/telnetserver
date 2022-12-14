require('dotenv').config({ path: "../config.env"});
const events = require('events');
const net = require('net');
const mqtt = require('mqtt');
const {IAC_CODES, IAC_OPT_CODES, parseIAC, telnet_command, str_to_ascii} = require('./iac.js');

const wm = require("./windowmanager.js");
const apps = require("./apps.js");
global.apps = apps;

const options = {
  // Clean session
  clean: true,
  connectTimeout: 4000,
  // Auth
  clientId: 'telnetserver' + generateId(4),
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
}

const DATATYPES = {
  ALPHA: 'alpha',
  BACKSPACE: 'backspace',
  ENTER: 'enter',
  DIRECTION: 'direction'
};

const mqttclient  = mqtt.connect('mqtt://' + process.env.MQTT_SERVER + ':1883', options)
mqttclient.on('connect', function () {
    console.log('Connected');
    mqttclient.subscribe('telnet/otp', function (err) {
        console.log("mqtt subscription worked");
    });
});
global.mqttclient = mqttclient;
mqttclient.on('message', function (topic, message) {
    // message is Buffer

    let otpInfo = JSON.parse(message.toString());
    tryLogin(otpInfo);

});

function updateAutoLogout(client) {
  if (client.timeOut) {
    clearTimeout(client.timeOut);
  }

  client.timeOut = setTimeout(() => {
    apps.launchApp(client, "logout");
  }, "600000")


}
clients = [];
function listClients() {
    let clientList = [];
    clientList.push(["username", "displayname", "Twitch ID", "unique id", "seed", "logged in?", "x", "y", "ENV"]);
    for (let i=0; i<clients.length;i++) {
        clientList.push([clients[i].username, clients[i].displayname, clients[i].twitchid, clients[i].unique_id, clients[i].seed, clients[i].loggedIn, clients[i].windowSize[0], clients[i].windowSize[1], clients[i].env]);
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
    newClient.color=[otpInfo.color[0], otpInfo.color[1], otpInfo.color[2]] ;
    newClient.displayname = otpInfo.displayname;
    newClient.loggedIn = true;
    newClient.seed = undefined;
    newClient.write(Buffer.from([255, 251, 31, 255, 250, 31, 255, 240]));
    newClient.level = otpInfo.level || 0;
    // newClient.write(Buffer.from([255,250, 31]))
    // newClient.write(Buffer.from([255, 240]))
    renderScreen(newClient);
    console.log(newClient);
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
    if (data.startsWith("!app")) {
        console.table(wm.getApp(sender));
        return true;
    }
    if (data.startsWith("!debugme")) {
        sender.debug = true;
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
    if (data.startsWith("!chat")) {
        sender.app = "chat";
        return true;
    }
    if (data.startsWith("!dex")) {
        sender.app = "sample";
        return true;
    }
    if (data.startsWith("!")) {
      return true;
    }
    return false;
}

function systemMessage(message) {
    //sendToAll("SYSTEM: " + message);
}

function telnetCommand (dodontwill, command, client) {
  var bytes = [IAC_CODES.IAC, dodontwill];
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
    telnetCommand(IAC_CODES.WILL, IAC_CODES.OPT_ECHO, client);
    telnetCommand(IAC_CODES.WILL, IAC_CODES.OPT_SUPPRESS_GO_AHEAD, client);
    telnetCommand(IAC_CODES.WONT, IAC_CODES.OPT_LINE_MODE, client);
    telnetCommand(IAC_CODES.DO, IAC_CODES.OPT_WINDOW_SIZE, client);
    telnetCommand(IAC_CODES.DO, IAC_CODES.OPT_NEW_ENVIRON, client);

    client.writeln = function (text) {client.write(text + "\r\n");}
    client.loggedIn = false;
    client.username = "anonymous";
    client.displayname = "Anonymous";
    client.colors = [255,255,255];
    client.windowSize = [40,25];
    client.buffer = "";
    client.defaultApp = process.env.DEFAULT_APP;
    client.app = client.defaultApp;
    client.appData = {};

    console.log(JSON.stringify(apps.appList.sample));
}
function processInput(client, data) {

  updateAutoLogout(client);
  let iacCommands = parseIAC(data)
  if (client.debug || true) {
    console.log(JSON.stringify(iacCommands))
  }
  if (iacCommands.containsData) {
    if (iacCommands["WILL"].includes(39)) { //wenn der client bereit ist, sein env schicken, nach dem env fragen
        client.write(Buffer.from(telnet_command(IAC_CODES.SB, IAC_CODES.OPT_NEW_ENVIRON, IAC_OPT_CODES.NEW_ENV.SEND,
        IAC_OPT_CODES.NEW_ENV.VAR, str_to_ascii("SYSTEMTYPE"),
        IAC_OPT_CODES.NEW_ENV.USERVAR, str_to_ascii("TERM"),
        IAC_OPT_CODES.NEW_ENV.USERVAR, str_to_ascii("SHELL"),
        telnet_command(IAC_CODES.SE)
        )))
        //client.write(Buffer.from([255, 250, 39, 1, 3, 84, 69, 82, 77, 0, 83, 89, 83, 84, 69, 77, 84, 89, 80, 69, 3, 83, 72, 69, 76, 76 , 255, 240]))
    }
    if (iacCommands["window_size"]) {
      client.windowSize = [iacCommands["window_size"].width, iacCommands["window_size"].height];
    }
    if (iacCommands["ENV"]) {
      client.env = iacCommands["ENV"];
    }
  }

  let bytes = [];
  data = data.toString();
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

  if (!client.loggedIn) {
    return;
  }
  if (/^([a-zA-Z0-9\u0600-\u06FF\u0660-\u0669\u06F0-\u06F9 üöäßÜÖÄẞ\!\?:=,-.\\\/]+)$/.test(data)) {
    apps.appList[client.app].processInput(client, data, {"type": DATATYPES.ALPHA});
    return;
  }
  if (data.charCodeAt(0) == 127 || bytes[0][2] == 8) {
    apps.appList[client.app].processInput(client, data, {"type": DATATYPES.BACKSPACE});


    return;
  }
  if (bytes[0][2] == 13)  {
    apps.appList[client.app].processInput(client, data, {"type": DATATYPES.ENTER});

    // if (commands(client.buffer, client)) {
    //   client.buffer = "";
    //   return;
    // }
    // sendToAll(client, client.buffer);
    // client.buffer = "";
    return;
  }
  if (bytes.length == 1 && bytes[0][2] == 27) {
    client.app = client.defaultApp;
    return;
  }
  if (bytes.length > 1 && bytes[0][2] == 27 && bytes[1][2] == 91) {
    let direction = bytes[2][2] - 65;
    if (direction < 0 || direction > 3 ) { return };
    let meta = {"type": DATATYPES.DIRECTION, "direction": direction}

    apps.appList[client.app].processInput(client, data, meta);
    return
  }
}
global.getAppList = function () {
  return apps.getAppList();
}
global.getUserList = function () {
  let userList = clients.filter(function( obj ) {
      return obj.loggedIn === true;
  });
  return userList;
}
function renderScreen(client) {
  apps.appList[client.app].renderScreen(client);
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
