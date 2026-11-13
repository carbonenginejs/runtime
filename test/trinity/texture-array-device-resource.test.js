import assert from "node:assert/strict";
import test from "node:test";
import { Tr2DeviceResource, Tr2Renderer, Tr2TextureArray, TriDevice } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { HostBitmap } from "../../npm/dist/global/imageio/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";

// Tr2TextureArray is a Tr2DeviceResource (Tr2TextureArray.h:36-38). Carbon builds its texture inside AddElement;
// ours registers the array there and builds on the device tick, through Carbon's own OnPrepareResources
// (cpp:136-144) and CreateTexture (cpp:146-199). A read never creates storage.

/** A device with an empty registry and the stub backend on the main-thread context. */
function setup(t)
{
  const oldResources = TriDevice._resourcesRegistered, oldGenerations = TriDevice._registeredGenerations;
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previousAL = context.GetRenderContextAL();

  TriDevice._resourcesRegistered = [];
  TriDevice._registeredGenerations = [];

  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);

  t.after(() =>
  {
    context.SetRenderContextAL(previousAL);
    TriDevice._resourcesRegistered = oldResources;
    TriDevice._registeredGenerations = oldGenerations;
  });

  return { device: new TriDevice(), context };
}

/** An 8x8 RGBA bitmap with four mips, every byte set to `value`. */
function bitmap(value)
{
  const result = new HostBitmap();
  result.Create(8, 8, 4, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  result.GetRawData().fill(value);
  return result;
}

const registered = resource => TriDevice.GetResourcesRegistered().includes(resource);

/** Whether two views cover the same bytes; GetMipRawData makes a new view on every call. */
const sameBytes = (a, b) => a.buffer === b.buffer && a.byteOffset === b.byteOffset && a.byteLength === b.byteLength;

test("AddElement registers the array and the device tick builds its texture", t =>
{
  const { device } = setup(t);
  const array = new Tr2TextureArray();
  assert.equal(array.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(array.GetTexture(), null, "no texture before the first element");

  let changes = 0;
  const listener = { Changed() { changes += 1; } };
  array.OnTextureChange().RegisterListener(listener, listener.Changed);

  const element = array.AddElement(bitmap(1));
  assert.equal(element.IsValid(), true);
  assert.equal(registered(array), true, "adding an element is a use");
  assert.equal(array.GetTexture(), null, "a read creates nothing");
  assert.equal(changes, 1);

  device._PreparePendingResources();
  const texture = array.GetTexture();
  assert.ok(texture && texture.IsValid(), "the device tick prepared it");
  assert.equal(texture.GetArraySize(), 16, "capacity rounds up to the increment (cpp:55-62)");
  assert.equal(texture.GetMipCount(), 4);
  assert.equal(element.GetTexture(), texture, "the handle reads the array's texture (cpp:222-229)");
  assert.equal(changes, 2, "preparing raises the change event (cpp:141)");

  array.AddElement(bitmap(2));
  assert.equal(texture.IsValid(), false, "a new element drops the stale texture");
  assert.equal(array.GetTexture(), null);
  device._PreparePendingResources();
  assert.ok(array.GetTexture().IsValid(), "and the next tick builds one holding both");

  array.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  assert.ok(array.GetTexture().IsValid(), "Carbon's release is empty (cpp:132-134)");

  const last = array.GetTexture();
  array.Destruct();
  assert.equal(last.IsValid(), false, "_Destructor releases the texture member");
  assert.equal(registered(array), false);
});

test("CreateTexture supplies every mip of every slice, filling empty slices as Carbon does", t =>
{
  const { device, context } = setup(t);
  const array = new Tr2TextureArray();
  const first = array.AddElement(bitmap(1));
  array.AddElement(bitmap(2));
  const second = array.GetElement(1);
  first.Release();

  const create = context.CreateTexture;
  let captured = null;
  t.mock.method(context, "CreateTexture", function(desc, options)
  {
    captured = options;
    return create.call(this, desc, options);
  });
  device._PreparePendingResources();

  const data = captured.initialData;
  assert.equal(data.length, 16 * 4, "array size times mip count");
  for (let mip = 0; mip < 4; mip++)
  {
    assert.ok(sameBytes(data[4 + mip].sysMem, second.GetMipRawData(mip)), "a valid slice supplies its own mips");
    assert.equal(data[4 + mip].sysMemPitch, second.GetMipPitch(mip));
  }
  // Carbon quirk (cpp:155-159, 185-191): an empty slice takes the last valid element's mip 0 at every level.
  for (const index of [ 0, 3, 8, 63 ])
  {
    assert.ok(sameBytes(data[index].sysMem, second.GetMipRawData(0)), `entry ${index} is the filler`);
    assert.equal(data[index].sysMemSlicePitch, second.GetMipSize(0));
  }
  assert.equal(captured.gpuUsage, array.gpuUsage);
});
