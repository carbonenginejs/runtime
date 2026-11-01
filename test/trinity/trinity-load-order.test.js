// Every class imports `trinity`, and Tr2DeviceResource is applied while classes
// are being defined (`@be.inherit`). If CjsTrinity's imports reached a class that
// inherits it, loading Tr2DeviceResource.js first would ask for it before it
// exists. Each module here is loaded FIRST, in a fresh process, so any such cycle
// fails here rather than in a host that happens to import in that order.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../npm/dist");
const FIRST = [
  "index.js",
  "trinity/index.js",
  "trinity/CjsTrinity.js",
  "trinity/core/device/Tr2DeviceResource.js",
  "trinity/core/device/TriDevice.js",
  "trinity/core/variable/Tr2VariableStore.js",
  "trinity/font/Tr2FontManager.js",
  "trinity/core/Tr2Renderer.js",
  "trinity/core/line/Tr2LineSet.js",
  "trinity/particle/Tr2ParticleSystem.js",
  "trinity/eve/scene/EveSpaceScene.js",
  "core/CjsLibrary.js"
];

for (const module of FIRST)
{
  test(`${module} loads first`, () =>
  {
    const url = pathToFileURL(path.join(dist, module)).href;
    const result = spawnSync(process.execPath, [ "--input-type=module", "-e", `await import(${JSON.stringify(url)});` ], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr.split("\n").find(line => /Error/.test(line)) ?? result.stderr);
  });
}
