const DEBUG=false;

chatLog = [];

const fs = require('fs');
const splashScreen = String(fs.readFileSync('../artwork/motd.utf8ans')).split('\n');


for (let i = 0; i<splashScreen.length; i++) {
  let newObject = {
    "colorString": "\u001b[0m",
    "displayName": ":",
    "message": splashScreen[i],
    "time": new Date()
  }
  chatLog[i] = newObject;
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
    chatLog.push(chatObject);
    chatLog = chatLog.slice(-150);
    const size = clients.length;
    console.table(chatLog);

    for(i=0;i<size;i++) {

        if (clients[i].loggedIn) {
          createUserData(clients[i]);
          clients[i].appData.chat.nofitifications.push({"type": "chat", "headline", "Neue Chatnachricht"});
          if (clients[i].app=="chat") {
            renderScreen(clients[i]);
          }
        }
    }
    client.appData.chat.buffer = "";
    global.mqttclient.publish("telnet/chat", JSON.stringify(chatObject));
}

function createUserData(client) {
  client.appData.chat = client.appData.chat || {};
  client.appData.chat.buffer = client.appData.chat.buffer || "";
  client.appData.chat.nofitifications = client.appData.chat.nofitifications || [];

}
function renderScreen(client) {
  createUserData(client);
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
        client.write("\033[" + x + ";0H► " + client.appData.chat.buffer.substring(0,client.windowSize[0]-5) + "\033[5m_\033[0m");
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H◄");
        break;

      default:
        client.write("\033[" + x + ";0H█");
        client.write("\033[" + x + ";" + String(client.windowSize[0]) + "H█");
    }
  }
}
function processInput(client, data, meta) {
  switch (meta.type) {
    case "alpha":
      client.appData.chat.buffer += data;
      break;
    case "backspace":
      client.appData.chat.buffer = client.appData.chat.buffer.slice(0,-1)
      break;
    case "enter":
      sendToAll(client, client.appData.chat.buffer);
      break;
  }
}
module.exports = {renderScreen: renderScreen, processInput: processInput};
