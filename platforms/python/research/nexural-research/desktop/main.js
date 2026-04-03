const { app, BrowserWindow, Tray, Menu, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PORT = 8000;
const URL = `http://localhost:${PORT}`;

let mainWindow = null;
let tray = null;
let pythonProcess = null;
let isQuitting = false;

// ---------------------------------------------------------------------------
// Python backend management
// ---------------------------------------------------------------------------

function findPython() {
  // Try common Python paths
  const candidates = [
    "python",
    "python3",
    path.join(app.getAppPath(), "..", "app", ".venv", "Scripts", "python.exe"),
    path.join(app.getAppPath(), "..", "app", ".venv", "bin", "python"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python311", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python313", "python.exe"),
  ];
  return candidates[0]; // Will try system python first
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const python = findPython();
    const args = ["-m", "uvicorn", "nexural_research.api.app:app", "--host", "127.0.0.1", "--port", String(PORT)];

    console.log(`Starting backend: ${python} ${args.join(" ")}`);

    pythonProcess = spawn(python, args, {
      cwd: path.join(app.getAppPath(), ".."),
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    pythonProcess.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log(`[backend] ${msg.trim()}`);
      if (msg.includes("Application startup complete")) {
        resolve();
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error(`[backend] ${msg.trim()}`);
      if (msg.includes("Application startup complete")) {
        resolve();
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start backend:", err);
      reject(err);
    });

    pythonProcess.on("close", (code) => {
      console.log(`Backend exited with code ${code}`);
      pythonProcess = null;
    });

    // Timeout: if backend doesn't start in 15s, resolve anyway and let health check handle it
    setTimeout(resolve, 15000);
  });
}

function stopBackend() {
  if (pythonProcess) {
    console.log("Stopping backend...");
    pythonProcess.kill("SIGTERM");
    setTimeout(() => {
      if (pythonProcess) pythonProcess.kill("SIGKILL");
    }, 3000);
  }
}

function waitForHealth(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      http.get(`${URL}/api/health`, (res) => {
        if (res.statusCode === 200) resolve();
        else if (n > 0) setTimeout(() => check(n - 1), 500);
        else reject(new Error("Backend health check failed"));
      }).on("error", () => {
        if (n > 0) setTimeout(() => check(n - 1), 500);
        else reject(new Error("Backend not reachable"));
      });
    };
    check(retries);
  });
}

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Nexural Research",
    backgroundColor: "#060a13",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless with custom title bar feel
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
  });

  // Show splash while loading
  mainWindow.loadFile(path.join(__dirname, "splash.html"));
  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function createTray() {
  // Use a simple tray (icon will be set by installer)
  tray = new Tray(path.join(__dirname, "icon.png"));

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Nexural Research", click: () => mainWindow?.show() },
    { type: "separator" },
    { label: "API Docs", click: () => shell.openExternal(`${URL}/api/docs`) },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        stopBackend();
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Nexural Research — Strategy Analysis Engine");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow?.show());
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  createWindow();
  createTray();

  try {
    await startBackend();
    await waitForHealth();
    mainWindow.loadURL(URL);
  } catch (err) {
    console.error("Failed to start:", err);
    dialog.showErrorBox(
      "Nexural Research — Startup Error",
      `Could not start the analysis engine.\n\nMake sure Python 3.11+ is installed and the nexural-research package is set up.\n\nError: ${err.message}\n\nRun 'install.bat' first if you haven't already.`
    );
    // Still try to load — maybe backend is already running externally
    mainWindow.loadURL(URL);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    stopBackend();
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow) mainWindow.show();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});
