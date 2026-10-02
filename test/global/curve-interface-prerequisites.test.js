import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ITriFunction, ITriScalarFunction, ITriVectorFunction, ITriQuaternionFunction,
  ITriColorFunction, ITriCurveLength, blue
} from "@carbonenginejs/runtime/blue";
import { CjsSchema, meta } from "@carbonenginejs/runtime/schema";
import { ITriFunction as DirectFunction } from "../../src/global/blue/ITriFunction.js";
import { ITriScalarFunction as DirectScalar } from "../../src/global/blue/ITriScalarFunction.js";
import { ITriVectorFunction as DirectVector } from "../../src/global/blue/ITriVectorFunction.js";
import { ITriQuaternionFunction as DirectQuaternion } from "../../src/global/blue/ITriQuaternionFunction.js";
import { ITriColorFunction as DirectColor } from "../../src/global/blue/ITriColorFunction.js";
import { ITriCurveLength as DirectLength } from "../../src/global/blue/ITriCurveLength.js";
import { ITriDuration } from "../../src/trinity/curves/ITriDuration.js";
import { ITr2ValueBinding } from "../../src/trinity/curves/ITr2ValueBinding.js";
import { mappedInterfaces } from "../../src/global/compose/interface.js";

const contracts = [
  {
    name: "ITriFunction", Contract: ITriFunction, direct: DirectFunction,
    own: [ "UpdateValue", "Reset" ], abstract: [ "UpdateValue" ]
  },
  {
    name: "ITriScalarFunction", Contract: ITriScalarFunction, direct: DirectScalar, base: ITriFunction,
    own: [ "Update", "GetValueAt", "ScaleTime" ], abstract: [ "Update", "GetValueAt", "ScaleTime" ]
  },
  {
    name: "ITriVectorFunction", Contract: ITriVectorFunction, direct: DirectVector, base: ITriFunction,
    own: [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt", "InterpolatedPosition" ],
    abstract: [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt", "InterpolatedPosition" ]
  },
  {
    name: "ITriQuaternionFunction", Contract: ITriQuaternionFunction, direct: DirectQuaternion, base: ITriFunction,
    own: [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt" ],
    abstract: [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt" ]
  },
  {
    name: "ITriColorFunction", Contract: ITriColorFunction, direct: DirectColor, base: ITriFunction,
    own: [ "Update", "GetValueAt" ], abstract: [ "Update", "GetValueAt" ]
  },
  {
    name: "ITriCurveLength", Contract: ITriCurveLength, direct: DirectLength,
    own: [ "Length" ], abstract: [ "Length" ]
  },
  {
    name: "ITriDuration", Contract: ITriDuration,
    own: [ "Start", "SetStartTime", "Sort", "ScaleTime", "Reverse", "ScaleValue", "Length", "Extrapolation" ],
    abstract: [ "Start", "SetStartTime", "Sort", "ScaleTime", "Reverse", "ScaleValue", "Length", "Extrapolation" ]
  },
  {
    name: "ITr2ValueBinding", Contract: ITr2ValueBinding,
    own: [ "CopyValue" ], abstract: [ "CopyValue" ]
  }
];

for (const { name, Contract, direct, base, own, abstract } of contracts)
{
  const required = base ? [ "UpdateValue", ...abstract ] : abstract;
  const hasReset = Contract === ITriFunction || base === ITriFunction;

  test(`${name} registers its exact native method inventory and empty data schema`, () =>
  {
    if (direct) assert.equal(Contract, direct);
    assert.equal(CjsSchema.getClassName(Contract), name);
    assert.equal(CjsSchema.GetConstructor(name), Contract);
    assert.equal(blue.classes.GetClassRegistration(name).type, Contract);
    assert.deepEqual(Object.getOwnPropertyNames(Contract.prototype), [ "constructor", ...own ]);
    assert.equal(Object.getPrototypeOf(Contract.prototype), base ? base.prototype : Object.prototype);
    assert.deepEqual(CjsSchema.getSchema(Contract).members, []);
    assert.deepEqual(CjsSchema.getSchema(Contract).properties, []);
    assert.deepEqual(Array.from(mappedInterfaces(Contract)), []);
    for (const method of required)
    {
      assert.equal(CjsSchema.getMethod(Contract, method).impl.status, "abstract", `${name}.${method}`);
    }
    if (hasReset) assert.equal(CjsSchema.getMethod(Contract, "Reset").impl.status, "noop");
  });

  test(`${name} preserves required operations and the native Reset default when inherited or composed`, () =>
  {
    class Derived extends Contract {}
    class Composed {}
    meta.blue.inherit(Contract)(Composed);
    CjsSchema.define(Composed, { className: `TestCurvePrerequisiteMissing${name}` });
    const composed = new Composed();
    assert.equal(CjsSchema.cast(composed, Contract), composed);
    if (base) assert.equal(CjsSchema.cast(composed, base), composed);
    assert.deepEqual(Array.from(mappedInterfaces(Composed)), []);
    for (const instance of [ new Contract(), new Derived(), composed ])
    {
      for (const method of required)
      {
        assert.throws(() => instance[method](), /must be implemented|does not implement/u, `${name}.${method}`);
      }
      if (hasReset)
      {
        assert.equal(instance.Reset(), undefined);
        assert.deepEqual(Object.keys(instance), []);
      }
      for (const method of [ "Initialize", "OnModified", "GetValues", "SetValues", "AssignTo", "QueryInterface" ])
      {
        assert.equal(method in instance, false, `${name} must not install ${method}`);
      }
    }
    for (const method of required)
    {
      assert.equal(CjsSchema.getMethod(Composed, method).impl.status, "abstract");
    }
    if (hasReset) assert.equal(CjsSchema.getMethod(Composed, "Reset").impl.status, "noop");
  });

  test(`${name} keeps concrete operations and raw arguments separate from explicit query exposure`, () =>
  {
    const calls = [];
    const result = {};
    const record = (method, args) =>
    {
      calls.push([ method, ...args ]);
      return result;
    };
    // These are real inherited implementations; composing a contract must not
    // wrap them, coerce their inputs, choose an output adapter, or invoke them.
    class Operations
    {
      UpdateValue(...args) { return record("UpdateValue", args); }
      Reset(...args) { return record("Reset", args); }
      Update(...args) { return record("Update", args); }
      GetValueAt(...args) { return record("GetValueAt", args); }
      ScaleTime(...args) { return record("ScaleTime", args); }
      GetValueDotAt(...args) { return record("GetValueDotAt", args); }
      GetValueDoubleDotAt(...args) { return record("GetValueDoubleDotAt", args); }
      InterpolatedPosition(...args) { return record("InterpolatedPosition", args); }
      Start(...args) { return record("Start", args); }
      SetStartTime(...args) { return record("SetStartTime", args); }
      Sort(...args) { return record("Sort", args); }
      Reverse(...args) { return record("Reverse", args); }
      ScaleValue(...args) { return record("ScaleValue", args); }
      Length(...args) { return record("Length", args); }
      Extrapolation(...args) { return record("Extrapolation", args); }
      CopyValue(...args) { return record("CopyValue", args); }
    }
    class Consumer extends Operations {}
    const methods = hasReset ? [ ...required, "Reset" ] : required;
    meta.blue.inherit(Contract)(Consumer);
    CjsSchema.define(Consumer, { className: `TestCurvePrerequisiteConcrete${name}` });
    const instance = new Consumer();
    for (const method of methods) assert.equal(instance[method], Operations.prototype[method]);
    assert.equal(CjsSchema.cast(instance, Contract), instance);
    assert.deepEqual(Array.from(mappedInterfaces(Consumer)), []);
    meta.blue.interfaceTable({ interfaces: [ Consumer, Contract ], chainTo: null })(Consumer);
    assert.deepEqual(Array.from(mappedInterfaces(Consumer)), [ Consumer, Contract ]);
    if (base)
    {
      assert.equal(CjsSchema.cast(instance, base), instance);
      assert.equal(mappedInterfaces(Consumer).has(base), false);
    }
    assert.deepEqual(calls, []);

    const time = 2 ** 40 + 0.125;
    const out = { untouched: true };
    const scale = { valueOf() { throw new Error("The contract coerced a caller-owned argument"); } };
    const outputMethods = [ "Update", "GetValueAt", "GetValueDotAt", "GetValueDoubleDotAt", "InterpolatedPosition" ];
    const expected = [];
    for (const method of methods)
    {
      let args = [];
      if ([ "UpdateValue", "SetStartTime" ].includes(method)) args = [ time ];
      else if ([ "ScaleTime", "ScaleValue" ].includes(method)) args = [ scale ];
      else if (outputMethods.includes(method)) args = Contract === ITriScalarFunction ? [ time ] : [ out, time ];
      assert.equal(instance[method](...args), result, `${name}.${method} return value`);
      expected.push([ method, ...args ]);
    }
    assert.deepEqual(calls, expected);
    assert.deepEqual(out, { untouched: true });
    assert.equal("Initialize" in instance, false);
    assert.equal("SetValues" in instance, false);
  });
}

test("curve method names alone grant no nominal or query identities", () =>
{
  class Decoy
  {
    UpdateValue() {}
    Reset() {}
    Update() {}
    GetValueAt() {}
    ScaleTime() {}
    GetValueDotAt() {}
    GetValueDoubleDotAt() {}
    InterpolatedPosition() {}
    Start() {}
    SetStartTime() {}
    Sort() {}
    Reverse() {}
    ScaleValue() {}
    Length() {}
    Extrapolation() {}
    CopyValue() {}
  }
  CjsSchema.define(Decoy, { className: "TestCurvePrerequisiteDecoy" });
  const decoy = new Decoy();
  for (const { Contract } of contracts) assert.equal(CjsSchema.cast(decoy, Contract), null);
  assert.deepEqual(Array.from(mappedInterfaces(Decoy)), []);
});

test("curve interfaces import inertly without pulling domain consumers or model infrastructure", () =>
{
  const probe = spawnSync(process.execPath, [
    ...process.execArgv,
    "--input-type=module", "--eval", `
      import assert from "node:assert/strict";
      import { registerHooks } from "node:module";
      const trinityModules = new Set();
      registerHooks({
        load(url, context, nextLoad)
        {
          const allowed = url.match(/\\/(?:src|dist)\\/trinity\\/curves\\/(ITriDuration|ITr2ValueBinding)\\.js$/);
          if (allowed) trinityModules.add(allowed[1]);
          if ((!allowed && /\\/(?:src|dist)\\/(?:audio|character|trinity|trinityal|sof)\\//.test(url))
            || /\\/(?:src|dist)\\/global\\/model\\//.test(url))
          {
            throw new Error("Curve interface import reached an unrequested domain or model: " + url);
          }
          return nextLoad(url, context);
        }
      });
      for (const name of ["document", "window", "navigator", "AudioContext", "webkitAudioContext", "Worker"])
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get() { throw new Error("Curve interface import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("Curve interface import started " + name); };
      }
      const shared = await import("@carbonenginejs/runtime/blue");
      const { CjsSchema } = await import("@carbonenginejs/runtime/schema");
      assert.deepEqual(Array.from(trinityModules), []);
      for (const name of ["ITriFunction", "ITriScalarFunction", "ITriVectorFunction", "ITriQuaternionFunction", "ITriColorFunction", "ITriCurveLength"])
      {
        assert.equal(typeof shared[name], "function");
        assert.equal(CjsSchema.GetConstructor(name), shared[name]);
        assert.equal(shared.blue.classes.GetClassRegistration(name).type, shared[name]);
      }
      const { ITriDuration } = await import("./src/trinity/curves/ITriDuration.js");
      const { ITr2ValueBinding } = await import("./src/trinity/curves/ITr2ValueBinding.js");
      for (const [name, Contract] of [["ITriDuration", ITriDuration], ["ITr2ValueBinding", ITr2ValueBinding]])
      {
        assert.equal(CjsSchema.GetConstructor(name), Contract);
        assert.equal(shared.blue.classes.GetClassRegistration(name).type, Contract);
      }
      assert.deepEqual(Array.from(trinityModules).sort(), ["ITr2ValueBinding", "ITriDuration"]);
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
