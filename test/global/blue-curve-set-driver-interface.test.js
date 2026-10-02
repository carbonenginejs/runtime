import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ICurveSetDriver, blue } from "@carbonenginejs/runtime/blue";
import { CjsSchema, meta } from "@carbonenginejs/runtime/schema";
import { ICurveSetDriver as DirectDriver } from "../../src/global/blue/ICurveSetDriver.js";
import { mappedInterfaces } from "../../src/global/compose/interface.js";

test("ICurveSetDriver has one registered identity and an abstract native method", () =>
{
  assert.equal(ICurveSetDriver, DirectDriver);
  assert.equal(CjsSchema.getClassName(ICurveSetDriver), "ICurveSetDriver");
  assert.equal(CjsSchema.GetConstructor("ICurveSetDriver"), ICurveSetDriver);
  assert.equal(blue.classes.GetClassRegistration("ICurveSetDriver").type, ICurveSetDriver);
  assert.equal(CjsSchema.getMethod(ICurveSetDriver, "GetCurveSetTime").impl.status, "abstract");
  assert.deepEqual(CjsSchema.getSchema(ICurveSetDriver).members, []);
  assert.deepEqual(CjsSchema.getSchema(ICurveSetDriver).properties, []);
  assert.deepEqual(Object.getOwnPropertyNames(ICurveSetDriver.prototype), [ "constructor", "GetCurveSetTime" ]);
});

test("ICurveSetDriver requires a concrete GetCurveSetTime implementation", () =>
{
  assert.throws(() => new ICurveSetDriver().GetCurveSetTime(1.25), /ICurveSetDriver\.GetCurveSetTime must be implemented/u);
  class UnimplementedDriver extends ICurveSetDriver {}
  assert.throws(() => new UnimplementedDriver().GetCurveSetTime(1.25), /ICurveSetDriver\.GetCurveSetTime/u);
});

test("ICurveSetDriver composes without replacing the driver's numeric operation or mapping interfaces", () =>
{
  class Driver
  {
    GetCurveSetTime(time)
    {
      return time + 0.25;
    }
  }
  const implementation = Driver.prototype.GetCurveSetTime;
  meta.blue.inherit(ICurveSetDriver)(Driver, { kind: "class" });
  CjsSchema.define(Driver, { className: "TestBlueCurveSetDriver" });

  const driver = new Driver();
  assert.equal(Driver.prototype.GetCurveSetTime, implementation);
  assert.equal(CjsSchema.cast(driver, ICurveSetDriver), driver);
  assert.equal(driver.GetCurveSetTime(2 ** 32 + 0.5), 2 ** 32 + 0.75);
  assert.equal(mappedInterfaces(Driver).has(ICurveSetDriver), false);
  assert.equal("Initialize" in driver, false);
  assert.equal("SetValues" in driver, false);
});

test("ICurveSetDriver imports and registers without domain evaluation or operational startup", () =>
{
  const guard = String.raw`
    export async function load(url, context, nextLoad)
    {
      if (/\/(?:src|dist)\/(?:audio|character|trinity|sof)\//.test(url)
        || /\/(?:src|dist)\/global\/model\//.test(url))
      {
        throw new Error("Blue interface import reached a domain or model: " + url);
      }
      return nextLoad(url, context);
    }
  `;
  const probe = spawnSync(process.execPath, [
    ...process.execArgv,
    "--experimental-loader", `data:text/javascript,${encodeURIComponent(guard)}`,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      for (const name of ["document", "window", "navigator", "AudioContext", "webkitAudioContext", "Worker"])
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error("Blue interface import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("Blue interface import started " + name); };
      }
      const shared = await import("@carbonenginejs/runtime/blue");
      const { CjsSchema } = await import("@carbonenginejs/runtime/schema");
      assert.equal(CjsSchema.GetConstructor("ICurveSetDriver"), shared.ICurveSetDriver);
      assert.equal(shared.blue.classes.GetClassRegistration("ICurveSetDriver").type, shared.ICurveSetDriver);
      assert.equal(shared.blue.os.GetInfo().pumpTicksTotal, 0);
      assert.equal(shared.blue.resMan.GetPendingLoads(), 0);
      assert.equal(shared.blue.resMan.GetPendingPrepares(), 0);
      assert.equal(shared.blue.resMan.workerLoader.worker, null);
    `
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8"
  });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
