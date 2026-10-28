async function startup() {
  await Promise.resolve();
  throw new Error("start-error-async fixture");
}
function shutdown() {}
function install() {}
function uninstall() {}
