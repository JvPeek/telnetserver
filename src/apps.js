const DEBUG=false;
appList = [];
localApps={};
function getAppList() {
  return appList;
}
function addApp(appInfo) {
  appList.push(appInfo);
  loadApps();
  return true;
}

addApp({"id":"home", "label": "Startseite", "hidden": true});
addApp({"id":"chat", "label": "Chat", "info": "Unterhalte dich mit anderen Nutzern, die auch alle keine Freunde haben", "notifications": true});
addApp({"id":"peekdex", "label": "Dr. Greens PC", "info": "Sieh im Peekdex nach, welche Peekmon dir noch fehlen"});
addApp({"id":"userlist", "label": "Userliste", "info": "Eingeloggte User und wo man sie finden kann"});
addApp({"id":"reloadapps", "label": "reload apps", "info": "Debugfunktion: reloadApps", "level": 11});
addApp({"id":"logout", "label": "Abmelden", "info": "Session beenden"});

function reloadApps() {
  loadApps(true);
}
function loadApps(reload=false) {
  function nocache(module) {require("fs").watchFile(require("path").resolve(module), () => {delete require.cache[require.resolve(module)]})}

  for (var i = 0; i < appList.length; i++) {
    if (!localApps[appList[i].id] || reload) {
      let fileName = "./apps/" + appList[i].id + ".js";
      nocache(fileName);
      localApps[appList[i].id] = require(fileName);
    }
  }
}
function launchApp(client, app) {
  console.log("starte app " + app + " für " + client.displayname);
  if (localApps[app]?.startUp !== undefined) {
    localApps[app].startUp(client);
  }

  client.app = app;
  //console.log(localApps);
}
module.exports = {getAppList: getAppList, addApp: addApp, appList: localApps, launchApp: launchApp, reloadApps: reloadApps};
