import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);


test("the built WebGPU subpath is import-inert and isolated from the root", () =>
{
  const probe = spawnSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `
      const guarded = [
        "navigator",
        "window",
        "document",
        "fetch",
        "GPU",
        "GPUDevice",
        "GPUShaderStage",
        "GPUBufferUsage",
        "GPUTextureUsage"
      ];
      for (const name of guarded)
      {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          get()
          {
            throw new Error(\`WebGPU import touched \${name}\`);
          }
        });
      }

      const engine = await import("@carbonenginejs/runtime/engine/webgpu");
      for (const name of guarded) delete globalThis[name];
      const contracts = await import("@carbonenginejs/runtime/contracts");
      const root = await import("@carbonenginejs/runtime");

      for (const name of [
        "CjsWebgpuBackendCandidate",
        "CjsWebgpuBindGroup",
        "CjsWebgpuBuffer",
        "CjsWebgpuDevice",
        "CjsWebgpuPackage",
        "CjsWebgpuPipeline",
        "CjsWebgpuResource",
        "CjsWebgpuSampler",
        "CjsWebgpuShaderModule",
        "CjsWebgpuTexture",
        "CollectPerObjectUploads",
        "CommitPerObjectUploads",
        "MaterialLayoutFromShader",
        "NormalizeMaterialLayout",
        "PackMaterialConstants",
        "UploadPerObjectData"
      ])
      {
        if (engine[name] === undefined) throw new Error(\`Missing WebGPU export: \${name}\`);
      }

      const candidate = new engine.CjsWebgpuBackendCandidate();
      if (!(candidate instanceof contracts.CjsBackendCandidate))
      {
        throw new Error("The WebGPU candidate does not share the canonical contract identity");
      }
      if (root.CjsWebgpuBackendCandidate !== undefined || root.CjsWebgpuDevice !== undefined)
      {
        throw new Error("The root export eagerly exposes the WebGPU engine");
      }
    `
  ], {
    cwd: path.join(packageRoot, "npm"),
    encoding: "utf8"
  });

  assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});
