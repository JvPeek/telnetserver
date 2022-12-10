const DEBUG=false;
appList = [];
apps={};
function getAppList() {
  return appList;
}
function addApp(appInfo) {
  appList.push(appInfo);
  loadApps();
  return true;
}
addApp({"id":"home", "label": "Startseite", "hidden": true});
addApp({"id":"chat", "label": "Chat", "info": "Unterhalte dich mit anderen Nutzern, die auch alle keine Freunde haben"});
addApp({"id":"peekdex", "label": "Dr. Greens PC", "info": "Sieh im Peekdex nach, welche Peekmon dir noch fehlen"});
addApp({"id":"userlist", "label": "Userliste", "info": "Eingeloggte User und wo man sie finden kann"});
function loadApps() {
  for (var i = 0; i < appList.length; i++) {
    if (!apps[appList[i].id]) {
      apps[appList[i].id] = require("./apps/" + appList[i].id + ".js");
    }
  }
}
module.exports = {getAppList: getAppList, addApp: addApp, appList: apps};
