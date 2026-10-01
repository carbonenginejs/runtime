import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("Blue and global imports provide inert facilities without evaluating optional domains", () =>
{
  // Reject loading the implementation module, even if its constructor is lazy.
  const guard = String.raw`
    export async function load(url, context, nextLoad)
    {
      if (/\/(?:src|dist)\/(?:audio|character|trinity|sof)\//.test(url))
      {
        throw new Error("Shared import reached a domain implementation: " + url);
      }
      return nextLoad(url, context);
    }
  `;
  const probe = spawnSync(process.execPath, [
    "--experimental-loader", `data:text/javascript,${encodeURIComponent(guard)}`,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      for (const name of ["document", "window", "navigator", "screen", "AudioContext", "webkitAudioContext", "Worker"])
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error("Shared import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("Shared import started " + name); };
      }
      const shared = await import("@carbonenginejs/runtime/blue");
      const globals = await import("@carbonenginejs/runtime/global");
      const holder = await import("./dist/global/blue/blue.js");
      assert.equal(globals.blue, shared.blue);
      assert.equal(holder.blue, shared.blue);
      assert.equal(typeof holder.installBlueServices, "function");
      assert.equal("installBlueServices" in shared, false);
      assert.equal("installBlueServices" in globals, false);
      assert.equal(shared.blue.classes.GetClassRegistration("CjsBlueOS").type, shared.CjsBlueOS);
      assert.equal(shared.blue.os.GetInfo().pumpTicksTotal, 0);
      assert.equal(shared.blue.resMan.GetPendingLoads(), 0);
      assert.equal(shared.blue.resMan.GetPendingPrepares(), 0);
      assert.equal(shared.blue.resMan.workerLoader.worker, null);
      assert.equal(shared.blue.os.IsRegisteredForTicks(shared.blue.resMan), true);
    `
  ], {
    cwd: path.join(packageRoot, "npm"),
    encoding: "utf8"
  });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
