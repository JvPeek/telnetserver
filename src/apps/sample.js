// your app id goes here.
// remember to add your app to the appList in apps.js
const appName = "sample";

// your app can store per-user data inside the client.appData.appName object.
function createUserData(client) {
  // If our object doesn't exist, we create it.
  client.appData[appName] = client.appData[appName] || {};
}

// gets called every time the screen is refreshed while the app is open.
function renderScreen(client) {
}

// gets called on user input inside the app.
function processInput(client, data, meta) {

}

// gets called every time the user enters the app.
function startUp(client) {
  createUserData(client);

}

module.exports = {renderScreen: renderScreen, processInput: processInput, startUp: startUp};
