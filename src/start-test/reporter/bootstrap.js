// The reporter plugin of `pnpm start-test`. It marks that it started, then, once Zotero's main
// window is ready, installs the plugin under test from its XPI, as a user's "Install Plugin
// From File" does, waits for it to start, and writes whether Zotero lists the plugin, whether
// the plugin is active, and whether its startup threw. It then quits Zotero. The
// command passes the paths and the plugin id in START_TEST_READY, START_TEST_REPORT,
// START_TEST_XPI, and START_TEST_SUBJECT. If the reporter itself fails, it writes the error.

var { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");

const SETTLE_MS = 3000;

async function startup() {
  const reportPath = Services.env.get("START_TEST_REPORT");
  const subject = Services.env.get("START_TEST_SUBJECT");
  const write = (report) => IOUtils.writeUTF8(reportPath, JSON.stringify(report), { tmpPath: `${reportPath}.tmp` });
  try {
    await IOUtils.writeUTF8(Services.env.get("START_TEST_READY"), "");
    // Zotero keeps a plugin active when its startup throws, or an async startup rejects, and
    // logs this message instead.
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
      file.initWithPath(Services.env.get("START_TEST_XPI"));
      const install = await AddonManager.getInstallForFile(file);
      await install.install();
    } catch {
      // Zotero refused the plugin; the add-on read below finds it missing or inactive.
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    Services.console.unregisterListener(listener);
    const addon = await AddonManager.getAddonByID(subject);
    // Through a temp file, so the command never reads half a report.
    await write({ found: addon !== null, active: addon?.isActive === true, startupError });
  } catch (error) {
    await write({ error: String(error) });
  }
  Services.startup.quit(Ci.nsIAppStartup.eForceQuit);
}

function shutdown() {}
function install() {}
function uninstall() {}
