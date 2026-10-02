import test from 'node:test';
import assert from 'node:assert/strict';
import { CjsSchema } from '../../npm/dist/global/schema/index.js';
import { NotifyModified, BlueList } from '../../npm/dist/global/blue/index.js';
import { BLUELISTEVENT as Event } from '../../npm/dist/global/consts/blue.js';
import { PixelFormat } from '../../npm/dist/global/consts/renderContext/index.js';
import { EveCloudEditableVolume, EveCloudVolumeBall, Tr2HostBitmap, TriCurveSet } from '../../npm/dist/trinity/index.js';

function volume(t, values = {}) {
  const result = new EveCloudEditableVolume();
  result.width = result.height = result.depth = 2;
  Object.assign(result, values);
  t.after(() => result.Destroy());
  return result;
}
function ball() {
  const result = new EveCloudVolumeBall();
  result.radius = .25; result.opacity = 1; result.selfIllumination.set([1, 0, 0, 1]);
  return result;
}
function pixel(bitmap) { return Array.from(bitmap.GetRawData().subarray(28, 32)); }

test('Trinity host bitmap retains writable inherited volume storage and validity', () => {
  const bitmap = new Tr2HostBitmap();
  assert.equal(bitmap.IsValid(), false);
  assert.equal(bitmap.CreateVolume(2, 3, 4, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM), true);
  assert.equal(bitmap.IsValid(), true); assert.equal(bitmap.IsCompressed(), false);
  const bytes = bitmap.GetRawData(); assert.equal(bytes.length, 96);
  bytes[95] = 117; assert.equal(bitmap.GetRawData()[95], 117, 'native CPU access returns a writable view');
  bitmap.Destroy(); assert.equal(bitmap.GetRawData(), null);
});

test('cloud raster publication produces native BGRA voxels and adopts the bitmap into its texture', t => {
  const cloud = volume(t), sphere = ball();
  assert.equal(cloud.balls.constructor, BlueList);
  cloud.balls.Append(sphere);
  const bitmap = cloud.Rasterize();
  assert.equal(bitmap, cloud.bitmap); assert.equal(cloud.GetTexture().loadedBitmap, bitmap);
  assert.deepEqual([bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetDepth()], [2, 2, 2]);
  assert.deepEqual(pixel(bitmap), [0, 0, 255, 255], 'cpp:297-337: only sample(1,1,1) lies inside this ball');
  assert.ok(bitmap.GetRawData().subarray(0, 28).every(value => value === 0));
});

test('mapped cloud and ball notifications preserve pending snapshot then dirty successor', t => {
  const cloud = volume(t), sphere = ball(); cloud.balls.Append(sphere);
  CjsSchema.setValues(sphere, { opacity: 0, selfIllumination: [0, 0, 0, 0] });
  assert.deepEqual(pixel(cloud.Rasterize()), [0, 0, 255, 255], 'native join publishes the already-running snapshot');
  assert.deepEqual(pixel(cloud.Rasterize()), [0, 0, 0, 0], 'next join publishes the requested successor');
  // Finish the extra snapshot requested by the second Rasterize, then drain its publication.
  while (!cloud._thread.next().done) {}
  cloud.Update(0);
  const control = t.mock.method(sphere, 'OnModified', () => true);
  CjsSchema.setValues(sphere, { opacity: 1 });
  cloud.Update(1); assert.deepEqual(pixel(cloud.bitmap), [0, 0, 0, 0]);
  assert.equal(cloud._thread, null, 'negative control: discarded notification schedules no work');
  control.mock.restore(); NotifyModified(sphere, ['opacity']);
  assert.ok(cloud._thread); assert.deepEqual(pixel(cloud.Rasterize()), [0, 0, 0, 255]);
});

test('cloud list loading phases wire weak owners without spurious rasterization', t => {
  const cloud = volume(t), sphere = ball(); cloud.balls.push(sphere);
  cloud.OnListModified(Event.BELIST_INSERTED | Event.BELIST_LOADING, 0, 0, sphere, cloud.balls);
  assert.equal(sphere._owner, null); assert.equal(cloud._thread, null);
  cloud.OnListModified(Event.BELIST_LOADFINISHED, 0, 0, null, cloud.balls);
  assert.equal(sphere._owner.deref(), cloud); assert.equal(cloud._thread, null);
  cloud.OnListModified(Event.BELIST_REMOVED | Event.BELIST_UNLOADING, 0, 0, sphere, cloud.balls);
  assert.equal(sphere._owner.deref(), cloud);
  cloud.OnListModified(Event.BELIST_UNLOADSTART, 0, 0, null, cloud.balls);
  assert.equal(sphere._owner, null); assert.equal(cloud._thread, null);
  cloud.OnListModified(Event.BELIST_LOADFINISHED, 0, 0, null, cloud.balls);
  cloud.balls.Remove(0); assert.equal(sphere._owner, null); assert.ok(cloud._thread);
  assert.ok(cloud.Rasterize().GetRawData().every(value => value === 0));
});

test('animated cloud samples four curve times into native channels and restores playing time', t => {
  const cloud = volume(t, { animated: true }), sphere = ball(), curves = new TriCurveSet();
  cloud.balls.push(sphere); cloud.OnListModified(Event.BELIST_LOADFINISHED, 0, 0, null, cloud.balls);
  curves.PlayFrom(.7); cloud.curveSets.push(curves);
  const times = [], update = curves.Update.bind(curves);
  t.mock.method(curves, 'Update', (...args) => {
    times.push(args); update(...args);
    CjsSchema.setValues(sphere, { opacity: curves.GetScaledTime() });
  });
  cloud.OnVolumeModified();
  assert.equal(cloud._volumeDirty, false, 'sampling notifications are suppressed only during native snapshot assembly');
  assert.equal(curves.IsPlaying(), true); assert.equal(curves.GetScaledTime(), .7);
  assert.deepEqual(times.map(args => args[0]), [0, 0, 0, Math.fround(1/3), 0, Math.fround(2/3), 0, 1]);
  assert.deepEqual(pixel(cloud.Rasterize()), [212, 154, 0, 255], 'cpp:270-294: four gamma opacity frames stored in B,G,R,A order');
});

test('cloud loading initializes real list identities and asynchronous work publishes only on Update', async t => {
  const cloud = CjsSchema.from('EveCloudEditableVolume', {width:2,height:2,depth:2,
    balls:[{_type:'EveCloudVolumeBall',radius:.25,opacity:1,selfIllumination:[1,0,0,1]}]});
  t.after(() => cloud.Destroy());
  assert.equal(cloud.balls.constructor, BlueList); assert.equal(cloud.balls[0]._owner.deref(), cloud);
  assert.equal(cloud.bitmap.IsValid(), false);
  const deadline = Date.now()+2000;
  while (cloud._timer !== null && Date.now()<deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(cloud._timer, null); assert.equal(cloud.bitmap.IsValid(), false, 'job completion does not publish');
  cloud.Update(0); assert.deepEqual(pixel(cloud.bitmap), [0,0,255,255]);
  CjsSchema.setValues(cloud, {width:4,height:3}); assert.ok(cloud._thread);
  cloud.Destroy(); assert.equal(cloud._timer, null); assert.equal(cloud._thread, null);
});

test('default zero-radius balls preserve existing voxel contributions', t => {
  const cloud = volume(t); cloud.balls.push(ball(), new EveCloudVolumeBall());
  assert.deepEqual(pixel(cloud.Rasterize()), [0, 0, 255, 255], 'native ordered std::min keeps a zero-radius contribution at zero');
});

test('completed cloud status retains native Update publication and debug option declaration', t => {
  const cloud=volume(t); cloud.balls.push(ball()); cloud.Rasterize();
  const adopt=t.mock.method(cloud.texture, 'CreateFromHostBitmap');
  cloud.Update(0); cloud.Update(1);
  assert.equal(adopt.mock.callCount(), 2, 'cpp:100 checks DataReady without requiring a live thread handle');
  const options=new Set(); cloud.GetDebugOptions(options); assert.deepEqual([...options], ['Cloud Balls']);
  assert.throws(()=>cloud.RenderDebugInfo(null,null), /unported debug geometry/);
});
