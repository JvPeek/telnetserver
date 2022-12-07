require('dotenv').config({ path: "../config.env"});
var events = require('events');
var net = require('net');
const mqtt = require('mqtt');
const IAC = require("./iac.js");
const CODES = IAC.IAC_CODES
const parseIAC = IAC.parseIAC
const wm = require("./windowmanager.js");
const db = require("./database.js");



let chatLog = [];
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
    newClient.color=[otpInfo.color[0], otpInfo.color[1], otpInfo.color[2]] ;
    newClient.displayname = otpInfo.displayname;
    newClient.loggedIn = true;
    newClient.seed = undefined;
    newClient.write(Buffer.from([255, 251, 31, 255, 250, 31, 255, 240]));
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

function sendToAll(client, data) {
    if (data === undefined) {
      return;
    }
    let chatObject = {
      "colorString": "\u001b[38;2;" + client.color[0] + ";" + client.color[1] + ";" + client.color[2] + "m",
      "displayName": client.displayname,
      "message": data,
      "time": new Date()
    }
    chatObject = JSON.parse(JSON.stringify(chatObject));
    //let message = "\u001b[38;2;255;0;255m" + client.username + "\u001b[0m: " + data;
    chatLog.push(chatObject);
    chatLog = chatLog.slice(-150);
    const size = clients.length;
    console.table(chatLog);
    for(i=0;i<size;i++) {
        if (clients[i].loggedIn) {
          renderScreen(clients[i]);
        }
    }
    mqttclient.publish("telnet/chat", JSON.stringify(chatObject));
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
    if (data.startsWith("!windows")) {
        console.table(wm.getWindows(sender));
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
    if (data.startsWith("!dex")) {

        let dex = db.getPeekdex();
        dex.forEach((item, i) => {
          console.log(item.id + ": " + item.username);
        });


        //console.log(JSON.stringify( db.getPeekmons(sender.twitchid, {"shiny": false}) ));
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
  var bytes = [CODES.IAC, dodontwill];
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
    telnetCommand(CODES.WILL, CODES.OPT_ECHO, client);
    telnetCommand(CODES.WILL, CODES.OPT_SUPPRESS_GO_AHEAD, client);
    telnetCommand(CODES.WONT, CODES.OPT_LINE_MODE, client);
    telnetCommand(CODES.DO, CODES.OPT_WINDOW_SIZE, client);
    telnetCommand(CODES.DO, CODES.OPT_NEW_ENVIRON, client);

    client.writeln = function (text) {client.write(text + "\r\n");}
    client.loggedIn = false;
    client.username = "anonymous";
    client.displayname = "Anonymous";
    client.colors = [255,255,255];
    client.windowSize = [40,25];
    client.buffer = "";


}
function processInput(client, data) {
  let iacCommands = parseIAC(data)
  //console.log(JSON.stringify(ret))
  if (iacCommands) {
    if (iacCommands["window_size"]) {
      client.windowSize = [iacCommands["window_size"].width, iacCommands["window_size"].height];
    }
  }
  // if (data[0] === 255 && data[1] === 250 && data[2] === 31) {
  //   // Read the width and height from the command
  //   const width = (data[3] << 8) + data[4];
  //   const height = (data[5] << 8) + data[6];
  //   console.log(width, height);
  //   client.windowSize = [width, height];
  // }
  // console.log(JSON.stringify(data));
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
    if (commands(client.buffer, client)) {
      client.buffer = "";
      return;
    }
    sendToAll(client, client.buffer);
    client.buffer = "";
    return;
  }
}
function clearScreen(client) {

}
function renderScreen(client) {
  // BORDER
  // clear screen
  client.write("\u001B[2J");
  let thisLine = 2;
  for (let chatLine=chatLog.length-client.windowSize[1]+4; chatLine<chatLog.length;chatLine++) {
    thisLine++;

    if (chatLog[chatLine]) {
      client.write("\033[" + thisLine + ";3H");
      let message = chatLog[chatLine].colorString + chatLog[chatLine].displayName + "\u001b[0m: " + chatLog[chatLine].message.substring(0,client.windowSize[0]-chatLog[chatLine].displayName.length-2-4);

      client.write(message);
    }
  }
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
        client.write("\033[" + x + ";0H► " + client.buffer.substring(0,client.windowSize[0]-5) + "\033[5m_\033[0m");
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H◄");


      default:
        client.write("\033[" + x + ";0H█");
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H█");


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
