// The reporter plugin of `pnpm start-test`. Once Zotero's main window is ready, it installs
// the plugin under test from its XPI, as a user's "Install Plugin From File" does, waits for
// it to start, and writes whether Zotero lists the plugin, whether the plugin is active, and
// whether its startup threw. It then quits Zotero. The command passes the report path, the
// plugin id, and the XPI path in START_TEST_REPORT, START_TEST_SUBJECT, and START_TEST_XPI.

var { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");

const SETTLE_MS = 3000;

async function startup() {
  const reportPath = Services.env.get("START_TEST_REPORT");
  const subject = Services.env.get("START_TEST_SUBJECT");
  const xpiPath = Services.env.get("START_TEST_XPI");
  // Zotero keeps a plugin active when its startup throws, and logs this message instead.
  const startupMessage = `Error running bootstrap method 'startup' on ${subject}`;
  let startupError = false;
  const listener = {
    observe(message) {
      if (`${message.message ?? ""} ${message.errorMessage ?? ""}`.includes(startupMessage)) startupError = true;
    },
  };
  await Zotero.uiReadyPromise;
  Services.console.registerListener(listener);
  try {
    const file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(xpiPath);
    const install = await AddonManager.getInstallForFile(file);
    await install.install();
  } catch {
    // Zotero refused the plugin; the add-on read below finds it missing or inactive.
  }
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  Services.console.unregisterListener(listener);
  const addon = await AddonManager.getAddonByID(subject);
  const report = { found: addon !== null, active: addon?.isActive === true, startupError };
  // Through a temp file, so the command never reads half a report.
  await IOUtils.writeUTF8(reportPath, JSON.stringify(report), { tmpPath: `${reportPath}.tmp` });
  Services.startup.quit(Ci.nsIAppStartup.eForceQuit);
}

function shutdown() {}
function install() {}
function uninstall() {}
