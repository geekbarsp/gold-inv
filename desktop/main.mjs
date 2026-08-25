import { app, BrowserWindow, dialog, session } from "electron";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

let mainWindow;
let serverProcess;

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => (port ? resolve(port) : reject(new Error("No free port found."))));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverProcess?.exitCode !== null)
      throw new Error("The inventory service stopped during startup.");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The inventory service did not start in time.");
}

async function startApplication() {
  const resources = process.resourcesPath;
  const appServer = path.join(resources, "app-server");
  const config = JSON.parse(
    readFileSync(path.join(resources, "bootstrap-config.json"), "utf8"),
  );
  const port = await findFreePort();
  const appUrl = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, [path.join(appServer, "server.js")], {
    cwd: appServer,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      ...config,
      DESKTOP_APP: "1",
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PORT: String(port),
    },
  });

  await waitForServer(appUrl);

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowedOrigin = webContents.getURL().startsWith(`${appUrl}/`);
      callback(permission === "media" && allowedOrigin);
    },
  );

  mainWindow = new BrowserWindow({
    title: "NG Inventory",
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#081711",
    icon: path.join(resources, "NG Inventory.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${appUrl}/`) && url !== appUrl) event.preventDefault();
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  await mainWindow.loadURL(appUrl);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startApplication).catch((error) => {
    dialog.showErrorBox(
      "NG Inventory could not start",
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  });
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
});
