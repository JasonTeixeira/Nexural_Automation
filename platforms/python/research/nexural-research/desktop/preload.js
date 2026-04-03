const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("nexural", {
  platform: process.platform,
  version: "1.0.0",
});
