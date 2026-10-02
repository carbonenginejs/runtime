import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

for (const first of ["blue", "schema", "consts/trinity", "consts/graphics", "consts/render-context"])
test(`Blue imports stay inert with ${first} evaluated first`, () =>
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
      await import("@carbonenginejs/runtime/" + ${JSON.stringify(first)});
      const shared = await import("@carbonenginejs/runtime/blue");
      const names = [
        "trinity.EntityComponents.ReflectionMode", "trinity.Tr2Lod",
        "trinity.Tr2RenderContextEnum.PresentInterval", "trinity.Tr2WindowMode",
        "trinity.Tr2WindowShowState", "blue.TRIEXTRAPOLATION", "blue.TRIOPERATOR",
        "trinity.Tr2RenderContextEnum.SwapEffect", "trinity.Tr2EffectStateManager.RenderingMode",
        "trinity.ImageIO.PixelFormat", "trinity.Tr2RenderContextEnum.DepthStencilFormat",
        "trinity.ImageIO.TextureType", "trinity.Tr2UpscalingAL.Technique",
        "trinity.Tr2UpscalingAL.Setting", "trinity.Tr2CpuUsage", "trinity.Tr2GpuUsage",
        "trinity.TriBatchType"
      ];
      for (const name of names) assert.equal(shared.blue.enums.HasEnum(name), true, name);
      const graphics = await import("@carbonenginejs/runtime/consts/graphics");
      const trinity = await import("@carbonenginejs/runtime/consts/trinity");
      const render = await import("@carbonenginejs/runtime/consts/render-context");
      const identities = [
        graphics.ReflectionMode, trinity.Tr2Lod, render.PresentInterval,
        render.Tr2WindowMode, render.Tr2WindowShowState, graphics.TRIEXTRAPOLATION,
        graphics.TRIOPERATOR, render.SwapEffect, graphics.RenderingMode,
        render.PixelFormat, render.DepthStencilFormat, render.TextureType,
        render.UpscalingTechnique, render.UpscalingSetting, render.Tr2CpuUsage,
        render.Tr2GpuUsage, graphics.TriBatchType
      ];
      for (let i = 0; i < names.length; i++)
      {
        assert.equal(shared.blue.enums.GetEnum(names[i]), identities[i], names[i]);
      }
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
      assert.equal(shared.blue.os.IsRegisteredForTicks(shared.blue.resMan), false);
      const fresh = new shared.CjsBlue();
      assert.equal(fresh.os.IsRegisteredForTicks(fresh.resMan), false);
      assert.equal(fresh.resMan.workerLoader.worker, null);
      assert.equal(fresh.audio._initialized, false);
      assert.equal(fresh.sof, null);
    `
  ], {
    cwd: path.join(packageRoot, "npm"),
    encoding: "utf8"
  });
  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
