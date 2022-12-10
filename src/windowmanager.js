const DEBUG=false;
let autostart = {
  "app":"home"
}
function getApp(client) {
  if (!client.app) {
    client.app = autostart;
  }
  return client.app;
}

module.exports = {getApp: getApp}
