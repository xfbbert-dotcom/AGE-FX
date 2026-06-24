const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ageFxDesktop", {
  onServiceExit(callback) {
    ipcRenderer.on("age-fx-service-exit", (_event, message) => callback(message));
  }
});
