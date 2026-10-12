import test from 'node:test';
import assert from 'node:assert/strict';
import { CjsResource } from '../../npm/dist/global/blue/index.js';
import { HostBitmap } from '../../npm/dist/global/imageio/index.js';
import { PixelFormat } from '../../npm/dist/global/consts/renderContext/index.js';
import { Tr2ImageRes } from '../../npm/dist/resource/texture/Tr2ImageRes.js';
import { Tr2Sprite2dPickingMask, Tr2Sprite2dTexture, Tr2Sprite2dContainerBase, Tr2Sprite2d } from '../../npm/dist/trinity/index.js';
import { ITr2Sprite2dTextureNotifyTarget } from '../../npm/dist/trinity/sprite2d/ITr2Sprite2dTextureNotifyTarget.js';

/** A prepared Tr2ImageRes over a real 4x4 HostBitmap with one set pixel at (2, 2). */
function image(format, bytes)
{
  const bitmap = new HostBitmap();
  assert.equal(bitmap.Create(4, 4, 1, format), true);
  bitmap.GetRawData(2, 2).set(bytes);

  const resource = new Tr2ImageRes();
  resource.SetPayload(bitmap);
  resource.SetState(CjsResource.State.PREPARED);
  return resource;
}

/** A 9-slice mask with one-pixel edges, as Tr2Sprite2dPickingMask_Blue.cpp:48-70 exposes. */
function mask(resource, channel, threshold)
{
  const result = new Tr2Sprite2dPickingMask();
  Object.assign(result, { channel, threshold, leftEdge: 1, topEdge: 1, rightEdge: 1, bottomEdge: 1, mask: resource });
  return result;
}

// Point (3, 3) on a 4x4 sprite at the origin: x = 3 - 0.5 = 2.5 (cpp:52); not in
// the left edge (2.5 >= 1) nor the right (2.5 < 4 - 1); centre mapping
// uint32((2.5 - 1) / (4 - 2) * (4 - 2) + 1) = 2 (cpp:73). Same for y, so (2, 2).
const hit = [ 3, 3 ], origin = [ 0, 0 ];

test('SampleMask reads the bitmap pixel as r, g, b, a and indexes it by channel (cpp:97-107)', () =>
{
  // BGRA bytes B=10, G=20, R=200, A=255 -> r = 200/255, g = 20/255, b = 10/255, a = 1
  // (imageio HostBitmap.cpp:1350-1353, ImageUtility.cpp:32-35).
  const resource = image(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, [ 10, 20, 200, 255 ]);

  // channel 3 "Alpha": a = 1 > 0.5.
  assert.equal(mask(resource, 3, 0.5).SampleMask(hit, origin, 4, 4), true);

  // channel 0, labelled "Blue" (Blue.cpp:15), reads channels[0] = r = 200/255 > 0.5 (Carbon quirk).
  assert.equal(mask(resource, 0, 0.5).SampleMask(hit, origin, 4, 4), true);

  // channel 2, labelled "Red" (Blue.cpp:13), reads channels[2] = b = 10/255, not > 0.5.
  assert.equal(mask(resource, 2, 0.5).SampleMask(hit, origin, 4, 4), false);

  // channel above 3 clamps to 3 (cpp:102).
  assert.equal(mask(resource, 9, 0.5).SampleMask(hit, origin, 4, 4), true);

  // Point (1, 1): x = 0.5 < leftEdge -> px = 0 (cpp:57-60); pixel (0, 0) is clear.
  assert.equal(mask(resource, 3, 0.5).SampleMask([ 1, 1 ], origin, 4, 4), false);
});

test('an R8 mask is forced to channel 2 and so never picks (cpp:103-106)', () =>
{
  // R8 byte 255 lands in r (ImageUtility.cpp:37-40: value << 16); the override
  // reads channels[2] = b = 0, and 0 > 0 is false whatever channel was chosen.
  const resource = image(PixelFormat.PIXEL_FORMAT_R8_UNORM, [ 255 ]);
  assert.equal(resource.GetBitmap().GetPixel(2, 2).r, 1);

  for (const channel of [ 0, 1, 2, 3 ])
  {
    assert.equal(mask(resource, channel, 0).SampleMask(hit, origin, 4, 4), false, `channel ${channel}`);
  }
});

test('maskPath is Carbon exposure, not ours (Tr2Sprite2dPickingMask_Blue.cpp:27-33)', () =>
{
  const result = new Tr2Sprite2dPickingMask();
  assert.equal(result.maskPath, '');
  assert.equal(result.GetMaskPath(), '');
});

test('texture listeners receive Sprite2dTextureChanged through protected _SetDirty (Tr2Sprite2dTexture.cpp:299-305)', () =>
{
  class Listener extends ITr2Sprite2dTextureNotifyTarget
  {
    seen = [];
    Sprite2dTextureChanged(texture) { this.seen.push(texture); }
  }

  const texture = new Tr2Sprite2dTexture(), listener = new Listener();
  texture.RegisterForChangeNotification(listener);

  // SetSrcX ends in SetDirty (cpp:163-167).
  texture.SetSrcX(4);
  assert.deepEqual(listener.seen, [ texture ]);
  assert.equal('SetDirty' in texture, false);

  // The base interface method is pure virtual (ITr2Sprite2dTexture.h:17).
  assert.throws(() => new ITr2Sprite2dTextureNotifyTarget().Sprite2dTextureChanged(texture));
});

test('ContainerBase Destroy detaches background then children (Tr2Sprite2dContainer.cpp:18-34)', () =>
{
  const outer = new Tr2Sprite2dContainerBase(), container = new Tr2Sprite2dContainerBase();
  const child = new Tr2Sprite2d(), backdrop = new Tr2Sprite2d();

  // BELIST_INSERTED sets the parent (cpp:48-55).
  outer.children.Append(container);
  container.children.Append(child);
  container.background.Append(backdrop);
  assert.equal(child._parent, container);
  assert.equal(backdrop._parent, container);

  // SetChildDirty: m_isDirty = true, then the parent's SetChildDirty (cpp:35-42).
  container.isDirty = false; outer.isDirty = false;
  container.SetChildDirty(child);
  assert.equal(container.isDirty, true);
  assert.equal(outer.isDirty, true);

  container.Destroy();
  assert.equal(child._parent, null);
  assert.equal(backdrop._parent, null);

  // The destructor detaches without editing the lists.
  assert.equal(container.children.length, 1);
  assert.equal(container.background.length, 1);
});
