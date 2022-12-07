const DEBUG=false;
let baseWindow = {
  "mode":"fullscreen",
  "module": "chat"
}
function getWindows(client) {
  return client.windows || [baseWindow];
}

module.exports = {getWindows: getWindows}
