import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ITr2DebugRenderable, ITr2DebugRenderer2 } from "@carbonenginejs/runtime/interfaces";
import { CjsSchema, meta } from "@carbonenginejs/runtime/schema";
import { vec3 } from "@carbonenginejs/runtime/math/vec3";
import { vec4 } from "@carbonenginejs/runtime/math/vec4";
import { mat4 } from "@carbonenginejs/runtime/math/mat4";
import { ITr2DebugRenderable as DirectDebugRenderable } from "../../src/global/interfaces/ITr2DebugRenderable.js";
import { ITr2DebugRenderer2 as DirectDebugRenderer } from "../../src/global/interfaces/ITr2DebugRenderer2.js";
import { mappedInterfaces } from "../../src/global/compose/interface.js";

test("ITr2DebugRenderable has one registered identity and its two native abstract methods", () =>
{
  assert.equal(ITr2DebugRenderable, DirectDebugRenderable);
  assert.equal(CjsSchema.getClassName(ITr2DebugRenderable), "ITr2DebugRenderable");
  assert.equal(CjsSchema.GetConstructor("ITr2DebugRenderable"), ITr2DebugRenderable);
  for (const method of ["GetDebugOptions", "RenderDebugInfo"])
  {
    assert.equal(CjsSchema.getMethod(ITr2DebugRenderable, method).impl.status, "abstract");
  }
  assert.deepEqual(CjsSchema.getSchema(ITr2DebugRenderable).members, []);
  assert.deepEqual(CjsSchema.getSchema(ITr2DebugRenderable).properties, []);
  assert.deepEqual(Object.getOwnPropertyNames(ITr2DebugRenderable.prototype), [
    "constructor", "GetDebugOptions", "RenderDebugInfo"
  ]);
  assert.equal(Object.getPrototypeOf(ITr2DebugRenderable.prototype), Object.prototype);
  assert.deepEqual(Array.from(mappedInterfaces(ITr2DebugRenderable)), []);
});

test("ITr2DebugRenderable requires both concrete debug operations", () =>
{
  class MissingDebugRenderable extends ITr2DebugRenderable {}
  for (const renderable of [new ITr2DebugRenderable(), new MissingDebugRenderable()])
  {
    assert.throws(() => renderable.GetDebugOptions(new Set()), /ITr2DebugRenderable\.GetDebugOptions must be implemented/u);
    assert.throws(() => renderable.RenderDebugInfo({}), /ITr2DebugRenderable\.RenderDebugInfo must be implemented/u);
  }
});

test("debug composition preserves caller-owned option accumulation and renderer identity without implicit query mapping", () =>
{
  const calls = [];
  class DebugRenderable
  {
    GetDebugOptions(options)
    {
      calls.push(options);
      options.add("Show bounds");
    }

    RenderDebugInfo(renderer)
    {
      calls.push(renderer);
    }
  }
  const getDebugOptions = DebugRenderable.prototype.GetDebugOptions;
  const renderDebugInfo = DebugRenderable.prototype.RenderDebugInfo;
  meta.blue.inherit(ITr2DebugRenderable)(DebugRenderable, { kind: "class" });
  CjsSchema.define(DebugRenderable, { className: "TestSharedDebugRenderableProvider" });

  const renderable = new DebugRenderable();
  assert.equal(DebugRenderable.prototype.GetDebugOptions, getDebugOptions);
  assert.equal(DebugRenderable.prototype.RenderDebugInfo, renderDebugInfo);
  assert.equal(CjsSchema.cast(renderable, ITr2DebugRenderable), renderable);
  assert.equal(CjsSchema.cast({ GetDebugOptions() {}, RenderDebugInfo() {} }, ITr2DebugRenderable), null);
  assert.equal(mappedInterfaces(DebugRenderable).has(ITr2DebugRenderable), false);

  const options = new Set(["Other provider"]);
  const renderer = {};
  assert.equal(renderable.GetDebugOptions(options), undefined);
  assert.equal(renderable.GetDebugOptions(options), undefined);
  assert.deepEqual(options, new Set(["Other provider", "Show bounds"]));
  assert.equal(renderable.RenderDebugInfo(renderer), undefined);
  assert.equal(calls[0], options);
  assert.equal(calls[1], options);
  assert.equal(calls[2], renderer);

  meta.blue.interfaceTable({ interfaces: [ITr2DebugRenderable], chainTo: null })(DebugRenderable);
  assert.deepEqual(mappedInterfaces(DebugRenderable), new Set([ITr2DebugRenderable]));
  assert.equal("Initialize" in renderable, false);
  assert.equal("SetValues" in renderable, false);
});

test("the shared debug contract imports without Trinity, audio, model or device startup", () =>
{
  const guard = String.raw`
    export async function load(url, context, nextLoad)
    {
      if (/\/(?:src|dist)\/(?:audio|character|trinity|trinityal|sof)\//.test(url)
        || /\/(?:src|dist)\/global\/model\//.test(url))
      {
        throw new Error("Shared debug contract import reached a domain or model: " + url);
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
          get() { throw new Error("Shared debug contract import touched " + name); }
        });
      }
      for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
      {
        globalThis[name] = () => { throw new Error("Shared debug contract import started " + name); };
      }
      const { ITr2DebugRenderable, ITr2DebugRenderer2 } = await import("@carbonenginejs/runtime/interfaces");
      const { CjsSchema } = await import("@carbonenginejs/runtime/schema");
      assert.equal(CjsSchema.GetConstructor("ITr2DebugRenderable"), ITr2DebugRenderable);
      assert.equal(CjsSchema.GetConstructor("ITr2DebugRenderer2"), ITr2DebugRenderer2);
    `
  ], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8"
  });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});

test("ITr2DebugRenderer2 declares every unique native operation as an abstract obligation", () =>
{
  const methods = [
    "HasOption", "IsSelected", "DrawLine", "DrawTriangle", "DrawBox", "DrawSphere",
    "DrawCylinder", "DrawCone", "DrawCapsule", "DrawArrow", "DrawDoubleArrow",
    "DrawSphereArrow", "DrawAxis", "DrawExtrusionShape", "DrawText",
    "GetColorForOption", "SetColorForOption", "DrawAudioSpeaker"
  ];
  assert.equal(ITr2DebugRenderer2, DirectDebugRenderer);
  assert.equal(CjsSchema.GetConstructor("ITr2DebugRenderer2"), ITr2DebugRenderer2);
  assert.deepEqual(Object.getOwnPropertyNames(ITr2DebugRenderer2.prototype), ["constructor", ...methods]);
  assert.equal(Object.getPrototypeOf(ITr2DebugRenderer2.prototype), Object.prototype);
  assert.deepEqual(CjsSchema.getSchema(ITr2DebugRenderer2).members, []);
  assert.deepEqual(CjsSchema.getSchema(ITr2DebugRenderer2).properties, []);
  assert.deepEqual(Array.from(mappedInterfaces(ITr2DebugRenderer2)), []);
  class MissingRenderer extends ITr2DebugRenderer2 {}
  for (const renderer of [new ITr2DebugRenderer2(), new MissingRenderer()])
  {
    for (const method of methods)
    {
      assert.equal(CjsSchema.getMethod(ITr2DebugRenderer2, method).impl.status, "abstract");
      assert.throws(() => renderer[method](), new RegExp(`ITr2DebugRenderer2\\.${method} must be implemented`, "u"));
    }
  }
});

test("renderer composition preserves query booleans and caller-owned color output", () =>
{
  const calls = [];
  class Renderer
  {
    HasOption(owner, option)
    {
      calls.push(["option", owner, option]);
      return option === "enabled";
    }

    IsSelected(owner)
    {
      calls.push(["selected", owner]);
      return false;
    }

    GetColorForOption(color, option)
    {
      calls.push(["getColor", color, option]);
      vec4.set(color, 0.25, 0.5, 0.75, 1);
      return true;
    }

    SetColorForOption(option, color)
    {
      calls.push(["setColor", option, color]);
    }
  }
  const implementations = ["HasOption", "IsSelected", "GetColorForOption", "SetColorForOption"]
    .map(name => [name, Renderer.prototype[name]]);
  meta.blue.inherit(ITr2DebugRenderer2)(Renderer, { kind: "class" });
  CjsSchema.define(Renderer, { className: "TestSharedDebugRendererQueries" });
  const renderer = new Renderer();
  for (const [name, implementation] of implementations) assert.equal(Renderer.prototype[name], implementation);
  const owner = {};
  const color = vec4.create();
  assert.equal(renderer.HasOption(owner, "disabled"), false);
  assert.equal(renderer.HasOption(owner, "enabled"), true);
  assert.equal(renderer.IsSelected(owner), false);
  assert.equal(renderer.GetColorForOption(color, "enabled"), true);
  assert.deepEqual(Array.from(color), [0.25, 0.5, 0.75, 1]);
  assert.equal(renderer.SetColorForOption("enabled", color), undefined);
  assert.deepEqual(calls, [
    ["option", owner, "disabled"], ["option", owner, "enabled"], ["selected", owner],
    ["getColor", color, "enabled"], ["setColor", "enabled", color]
  ]);
  assert.equal(calls[0][1], owner);
  assert.equal(calls[3][1], color);
  assert.equal(calls[4][2], color);
  assert.equal(CjsSchema.cast(renderer, ITr2DebugRenderer2), renderer);
  assert.equal(mappedInterfaces(Renderer).has(ITr2DebugRenderer2), false);
  meta.blue.interfaceTable({ interfaces: [ITr2DebugRenderer2], chainTo: null })(Renderer);
  assert.deepEqual(mappedInterfaces(Renderer), new Set([ITr2DebugRenderer2]));
  assert.throws(() => renderer.DrawAxis(owner, mat4.create(), 0), /TestSharedDebugRendererQueries\.DrawAxis must be implemented/u);
  assert.equal("GetRawRoot" in renderer, false);
});

test("concrete renderer overload dispatch retains native argument order and identity", () =>
{
  const calls = [];
  class Renderer
  {
    DrawSphere(...args)
    {
      calls.push(args);
    }

    DrawAxis(owner, transform, effect)
    {
      calls.push([owner, transform, effect]);
    }

    DrawText(font, position, color, format, ...args)
    {
      calls.push([font, position, color, format, ...args]);
    }
  }
  const drawSphere = Renderer.prototype.DrawSphere;
  meta.blue.inherit(ITr2DebugRenderer2)(Renderer, { kind: "class" });
  CjsSchema.define(Renderer, { className: "TestSharedDebugRendererOverloads" });
  const renderer = new Renderer();
  const owner = {};
  const transform = mat4.create();
  const center = vec3.fromValues(2, 3, 4);
  const sphere = vec4.fromValues(2, 3, 4, 5);
  const debugColor = { color: 0xff00ff00 };
  const overloads = [
    [owner, sphere, 8, 0, debugColor],
    [owner, center, 5, 8, 0, debugColor],
    [owner, transform, 8, 0, debugColor],
    [owner, transform, 5, 8, 0, debugColor],
    [owner, transform, center, 5, 8, 0, debugColor]
  ];
  for (const args of overloads) assert.equal(renderer.DrawSphere(...args), undefined);
  assert.equal(Renderer.prototype.DrawSphere, drawSphere);
  for (let i = 0; i < overloads.length; i++)
  {
    assert.equal(calls[i].length, overloads[i].length);
    for (let j = 0; j < overloads[i].length; j++) assert.equal(calls[i][j], overloads[i][j]);
  }
  renderer.DrawAxis(owner, transform, 2);
  assert.deepEqual(calls[5], [owner, transform, 2]);
  const textColor = vec4.fromValues(1, 1, 1, 1);
  renderer.DrawText(0, center, textColor, "%s %d", "marker", 7);
  assert.deepEqual(calls[6], [0, center, textColor, "%s %d", "marker", 7]);
  assert.equal(calls[6][1], center);
  assert.equal(calls[6][2], textColor);
});
