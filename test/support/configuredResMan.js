import { after, beforeEach, afterEach } from "node:test";
import { CjsLibrary } from "../../npm/dist/core/index.js";
import { blue, BlueOS, BluePaths } from "../../npm/dist/blue/blue/index.js";
import { BeCallbackMan } from "../../npm/dist/blue/blue/BlueCallbackMan.js";

// Node has no host frame loop. Pump the same background callback queue while
// these resource tests await loads; real worker tests retain their worker path.
const pump = setInterval(() =>
{
  if (!BeCallbackMan.IsRunningOwnThreads()) BeCallbackMan.Update();
}, 5);
after(() => clearInterval(pump));

/** Configure a borrowed test manager through the public application startup. */
export async function configureResourceManager(resMan, configuration = {})
{
  const library = new CjsLibrary(configuration);
  try
  {
    await library.Initialize({ resMan, paths: new BluePaths(), os: new BlueOS(), sof: null });
  }
  finally
  {
    await library.Shutdown();
  }
  blue.resMan = resMan;
  return resMan;
}

let previousResMan;
beforeEach(() => { previousResMan = blue.resMan; });
afterEach(() => {
  try { if (blue.resMan !== previousResMan) blue.resMan.Clear(); }
  finally { blue.resMan = previousResMan; }
});
