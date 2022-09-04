var events = require('events');
var net = require('net');
const mqtt = require('mqtt');

require('dotenv').config()
console.log(process.env.MQTT_USER) 

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

    for (let i=0; i<clients.length;i++) {
        clientList.push([clients[i].username, clients[i].displayname, clients[i].unique_id, clients[i].seed, clients[i].loggedIn]);
    }
    console.table(clientList);
}

function tryLogin(otpInfo) {
    let newClient = getClientBySeed(otpInfo.otp);
    if (newClient === undefined) {
        return;
    }
    systemMessage("Willkommen, " + otpInfo.displayname + "!");
    newClient.username = otpInfo.username;
    newClient.displayname = otpInfo.displayname;
    newClient.loggedIn = true;
    newClient.seed = undefined;
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

function sendToAll(data,sender) {
    console.log(clients.length);
    var size = clients.length;
    for(i=0;i<size;i++) {
        clients[i].write(data + "\r\n");
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

var server = net.createServer(function(client) {
    console.log("New client");

    client.unique_id = generateId(10);
    client.seed = (Math.random() + 1).toString(36).substring(2);
    client.loggedIn = false;
    client.username = "anonymous";
    client.displayname = "Anonymous";
    client.write("Guten Tag! Sie sind verbunden mit der Mailbox von: \u001b[35mHallo\u001b[0m\r\nBitte schreibe die folgende Zeile in den Twitch Chat, um dich zu authentifizieren.\r\n\r\n\u001b[35m/w JanOfThings !otp " + client.seed +  "\u001b[0m\r\n");
    clients.push(client);
    
    client.on('data', function(data) {
        let thisClient = getClientByID(client["unique_id"]);

        let origdata = data;
        data = data.toString().replace(/ {4}|[\t\n\r]/gm,'');
        if (data.length <=0) {
            console.log(origdata);
            return;
        }
        if (thisClient.loggedIn == true) {
            if (!commands(data, client)) {
                if (/^[\x00-\x7F]+$/g.test(data) && !/^(\[|\])$/g.test(data)) {
                    sendToAll(thisClient.displayname + ": " + data,client);
                } else {
                    client.write("Sie haben eine Straftat begangen! Keine bösen Steuerzeichen!");
                }
            }
        } else {
            client.write("Du bist nicht einloggt. Opfer.\r\n");
        }
    });
    client.on('close', function() {
        removeClientByID(client.unique_id);
        systemMessage(client.displayname + " hat uns verlassen.");
    });
    client.on('error', function(error) {
        console.log("Auweia", error);
    });
});

server.listen(8001);
