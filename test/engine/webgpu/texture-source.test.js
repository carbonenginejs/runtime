// The last link: an effect's named texture to a realized WebGPU texture.
// Both ends worked before this - the format readers decode, the device realizes
// - and nothing joined them, because TriTextureParameter.SetResource is never
// called from src.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuTextureSource } from "../../../npm/dist/engine/webgpu/internal.js";

/** A material exposing one named resource, as Tr2Effect does. */
function materialWith(resources)
{
  return { GetResourceByName: name => resources[name] ?? null };
}

/** A resource manager recording what it was asked for. */
function manager({ ready = async () => {} } = {})
{
  const requested = [];

  return {
    requested,
    GetResource(path, options)
    {
      requested.push([ path, options?.requirement ]);
      return { path, Ready: ready };
    }
  };
}

/** A device recording each realization. */
function device()
{
  const realized = [];

  return {
    realized,
    async RealizeRgba8Texture(resource, options)
    {
      realized.push([ resource.path, options.textureKey ]);
      return { texture: resource.path, textureKey: options.textureKey };
    }
  };
}

test("a named resource resolves through its authored path", async () =>
{
  const gpu = device();
  const resources = manager();
  const source = new CjsWebgpuTextureSource(gpu, { resourceManager: resources });

  const realized = await source.Resolve("DiffuseMap", materialWith({
    DiffuseMap: { resourcePath: "res:/texture/hull/af1_diffuse.dds" }
  }));

  assert.equal(realized.texture, "res:/texture/hull/af1_diffuse.dds");
  assert.equal(realized.textureKey, "DiffuseMap");
  assert.equal(resources.requested[0][0], "res:/texture/hull/af1_diffuse.dds");
  assert.equal(resources.requested[0][1], "texture", "loaded as a texture, not as bytes");
});

test("the name is the binding and the path is only where it currently points", async () =>
{
  // A skin changes the path and not the name, which is why the shader binds by
  // name and only the effect knows the file.
  const gpu = device();
  const source = new CjsWebgpuTextureSource(gpu, { resourceManager: manager() });

  await source.Resolve("DiffuseMap", materialWith({ DiffuseMap: { resourcePath: "res:/a.dds" } }));
  source.Clear();
  await source.Resolve("DiffuseMap", materialWith({ DiffuseMap: { resourcePath: "res:/b.dds" } }));

  assert.deepEqual(gpu.realized.map(([ path ]) => path), [ "res:/a.dds", "res:/b.dds" ]);
});

test("two batches binding one texture realize it once", async () =>
{
  // The ordinary case in a frame; realizing twice would allocate twice.
  const gpu = device();
  const source = new CjsWebgpuTextureSource(gpu, { resourceManager: manager() });
  const material = materialWith({ DiffuseMap: { resourcePath: "res:/shared.dds" } });

  const [ first, second ] = await Promise.all([
    source.Resolve("DiffuseMap", material),
    source.Resolve("DiffuseMap", material)
  ]);

  assert.equal(gpu.realized.length, 1);
  assert.equal(first, second, "both batches share the one realization");
});

test("resolution waits for a texture still in flight", async () =>
{
  // A browser cannot bind an already-created texture the way Carbon does: the
  // first frame that wants one may be earlier than the frame that has it.
  let release = null;
  const ready = () => new Promise(resolve => { release = resolve; });
  const gpu = device();
  const source = new CjsWebgpuTextureSource(gpu, { resourceManager: manager({ ready }) });

  const pending = source.Resolve("DiffuseMap", materialWith({
    DiffuseMap: { resourcePath: "res:/slow.dds" }
  }));

  assert.equal(gpu.realized.length, 0, "nothing is realized before the payload arrives");

  release();
  await pending;

  assert.equal(gpu.realized.length, 1);
});

test("an unknown name says nothing points at a file", async () =>
{
  const source = new CjsWebgpuTextureSource(device(), { resourceManager: manager() });

  await assert.rejects(
    source.Resolve("Missing", materialWith({})),
    /declares no resource named "Missing"/
  );
});

test("a named resource with no path refuses rather than binding nothing", async () =>
{
  const source = new CjsWebgpuTextureSource(device(), { resourceManager: manager() });

  await assert.rejects(
    source.Resolve("DiffuseMap", materialWith({ DiffuseMap: { resourcePath: "" } })),
    /names no path/
  );
});

test("the hook plugs straight into the resolver", async () =>
{
  const gpu = device();
  const source = new CjsWebgpuTextureSource(gpu, { resourceManager: manager() });
  const hook = source.ResolveTexture();

  const realized = await hook("DiffuseMap", materialWith({
    DiffuseMap: { resourcePath: "res:/hook.dds" }
  }));

  assert.equal(realized.texture, "res:/hook.dds");
});
