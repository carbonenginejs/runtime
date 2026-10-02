import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ICustomPersist, blue } from "@carbonenginejs/runtime/blue";
import { CjsSchema, meta } from "@carbonenginejs/runtime/schema";
import { ICustomPersist as DirectPersist } from "../../src/global/blue/ICustomPersist.js";
import { mappedInterfaces } from "../../src/global/compose/interface.js";

const methods = [ "GetWriteBufferAndSize", "ReleaseWriteBuffer", "AllocateReadBuffer", "SetBufferAndSize" ];

test("ICustomPersist registers one identity with exactly its four native abstract methods", () =>
{
  assert.equal(ICustomPersist, DirectPersist);
  assert.equal(CjsSchema.getClassName(ICustomPersist), "ICustomPersist");
  assert.equal(CjsSchema.GetConstructor("ICustomPersist"), ICustomPersist);
  assert.equal(blue.classes.GetClassRegistration("ICustomPersist").type, ICustomPersist);
  assert.deepEqual(Object.getOwnPropertyNames(ICustomPersist.prototype), [ "constructor", ...methods ]);
  assert.equal(Object.getPrototypeOf(ICustomPersist.prototype), Object.prototype);
  assert.deepEqual(CjsSchema.getSchema(ICustomPersist).members, []);
  assert.deepEqual(CjsSchema.getSchema(ICustomPersist).properties, []);
  assert.deepEqual(Array.from(mappedInterfaces(ICustomPersist)), []);
  for (const method of methods)
  {
    assert.equal(CjsSchema.getMethod(ICustomPersist, method).impl.status, "abstract");
  }
});

test("all ICustomPersist operations remain required, including release", () =>
{
  class MissingPersist extends ICustomPersist {}
  for (const instance of [ new ICustomPersist(), new MissingPersist() ])
  {
    for (const method of methods)
    {
      assert.throws(() => instance[method](), {
        message: `ICustomPersist.${method} must be implemented.`
      });
    }
  }
});

test("ICustomPersist composition installs missing obligations without inventing lifecycle methods", () =>
{
  class MissingPersist {}
  meta.blue.inherit(ICustomPersist)(MissingPersist);
  CjsSchema.define(MissingPersist, { className: "TestBlueCustomPersistMissing" });
  const instance = new MissingPersist();
  assert.equal(CjsSchema.cast(instance, ICustomPersist), instance);
  assert.equal(mappedInterfaces(MissingPersist).has(ICustomPersist), false);
  for (const method of methods)
  {
    assert.equal(CjsSchema.getMethod(MissingPersist, method).impl.status, "abstract");
    assert.throws(() => instance[method](), /must be implemented|does not implement/u);
  }
  for (const method of [ "Initialize", "OnModified", "AssignTo", "SetValues" ])
  {
    assert.equal(method in instance, false);
  }
});

test("ICustomPersist preserves concrete methods and keeps nominal composition separate from query exposure", () =>
{
  const calls = [];
  const result = {};
  class Persist
  {
    GetWriteBufferAndSize(memberName, buffer, bufferSize)
    {
      calls.push([ "write", memberName, buffer, bufferSize ]);
      return result;
    }

    ReleaseWriteBuffer(buffer)
    {
      calls.push([ "release", buffer ]);
    }

    AllocateReadBuffer(memberName, bufferSize)
    {
      calls.push([ "allocate", memberName, bufferSize ]);
      return result;
    }

    SetBufferAndSize(memberName, buffer, bufferSize)
    {
      calls.push([ "set", memberName, buffer, bufferSize ]);
    }
  }
  const originals = methods.map(method => Persist.prototype[method]);
  meta.blue.inherit(ICustomPersist)(Persist);
  CjsSchema.define(Persist, { className: "TestBlueCustomPersistProvider" });
  const instance = new Persist();
  assert.deepEqual(methods.map(method => Persist.prototype[method]), originals);
  assert.equal(CjsSchema.cast(instance, ICustomPersist), instance);
  assert.equal(mappedInterfaces(Persist).has(ICustomPersist), false);
  meta.blue.interfaceTable({ interfaces: [ Persist, ICustomPersist ], chainTo: null })(Persist);
  assert.deepEqual(Array.from(mappedInterfaces(Persist)), [ Persist, ICustomPersist ]);
  assert.equal(CjsSchema.cast(instance, ICustomPersist), instance);
  assert.deepEqual(calls, [], "nominal/query declarations must not invoke persistence callbacks");

  // Opaque arguments exercise preservation, without defining a shared output adapter.
  const buffer = {};
  const sizeOutput = {};
  assert.equal(instance.GetWriteBufferAndSize("state", buffer, sizeOutput), result);
  assert.equal(instance.ReleaseWriteBuffer(buffer), undefined);
  assert.equal(instance.AllocateReadBuffer("state", 17), result);
  assert.equal(instance.SetBufferAndSize("state", buffer, 11), undefined);
  assert.deepEqual(calls, [
    [ "write", "state", buffer, sizeOutput ],
    [ "release", buffer ],
    [ "allocate", "state", 17 ],
    [ "set", "state", buffer, 11 ]
  ]);
  assert.deepEqual(buffer, {});
  assert.deepEqual(sizeOutput, {});
});

test("matching persistence method names alone grant neither nominal nor query identity", () =>
{
  let calls = 0;
  class Decoy
  {
    GetWriteBufferAndSize() { calls++; }
    ReleaseWriteBuffer() { calls++; }
    AllocateReadBuffer() { calls++; }
    SetBufferAndSize() { calls++; }
  }
  CjsSchema.define(Decoy, { className: "TestBlueCustomPersistDecoy" });
  const instance = new Decoy();
  assert.equal(CjsSchema.cast(instance, ICustomPersist), null);
  assert.equal(mappedInterfaces(Decoy).has(ICustomPersist), false);
  assert.equal(calls, 0);
});

test("ICustomPersist import registers without domain evaluation or operational startup", () =>
{
  const probe = spawnSync(process.execPath, [
    ...process.execArgv,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { registerHooks } from "node:module";
      registerHooks({
        load(url, context, nextLoad)
        {
          if (/\\/(?:src|dist)\\/(?:audio|character|trinity|trinityal|sof)\\//.test(url)
            || /\\/(?:src|dist)\\/global\\/model\\//.test(url))
          {
            throw new Error("ICustomPersist import reached a domain or model: " + url);
          }
          return nextLoad(url, context);
        }
      });
      for (const name of ["document", "window", "navigator", "AudioContext", "webkitAudioContext", "Worker"])
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error("ICustomPersist import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("ICustomPersist import started " + name); };
      }
      const shared = await import("@carbonenginejs/runtime/blue");
      const { CjsSchema } = await import("@carbonenginejs/runtime/schema");
      assert.equal(CjsSchema.GetConstructor("ICustomPersist"), shared.ICustomPersist);
      assert.equal(shared.blue.classes.GetClassRegistration("ICustomPersist").type, shared.ICustomPersist);
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
