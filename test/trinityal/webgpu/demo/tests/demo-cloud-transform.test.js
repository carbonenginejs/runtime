import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoTransformTarget, createDemoCopiedTransform, selectionBounds } from '../demoGizmo.js';
import { EveEffectRoot2, EveChildCloud } from '../../../../../npm/dist/trinity/index.js';
import { mat4 } from '../../../../../npm/dist/global/math/mat4.js';

function close(a, b) {
  for (let i=0;i<a.length;i++) assert.ok(Math.abs(a[i]-b[i])<1e-4, `${i}: ${a[i]} != ${b[i]}`);
}

test('effect-root gizmo SRT survives native updates under a curve-driven parent', () => {
  const root = new EveEffectRoot2();
  root.translationCurve = { Update__Ticks(time, out) { out.set([100, 0, 0]); } };
  root.boundingSphereRadius = 2;
  root.UpdateSyncronous({ GetTime: () => 0 });
  const target = createDemoTransformTarget(root);
  const edited = mat4.fromYRotation(mat4.create(), .7);
  mat4.scale(edited, edited, [-2, 3, 4]);
  edited[12]=10; edited[13]=20; edited[14]=30;
  assert.equal(target.writeLocal(edited), true);
  root.UpdateSyncronous({ GetTime: () => 1 });
  close(target.readLocal(mat4.create()), edited);
  const expected = mat4.multiply(mat4.create(), target.readParentWorld(mat4.create()), edited);
  close(root.GetLocalToWorldTransform(), expected);
  const bounds = selectionBounds(root);
  close(bounds.centre, [110,20,30]);
  assert.ok(bounds.radius > 0);
  const copy = new EveEffectRoot2();
  const copiedTarget = createDemoCopiedTransform(copy, expected, 1, null);
  copy.UpdateSyncronous({ GetTime: () => 2 });
  close(copy.GetLocalToWorldTransform(), expected);
  copiedTarget.destroy(); target.destroy();
  root.UpdateSyncronous({ GetTime: () => 3 });
  close(root.GetLocalToWorldTransform(), expected);
});

test('cloud child world bounds frame effect roots with no authored root sphere', () => {
  const root = new EveEffectRoot2(), cloud = new EveChildCloud();
  root.effectChildren.push(cloud);
  cloud.GetBoundingSphere = out => { out.set([100, 200, 300, 10]); return true; };
  const bounds = selectionBounds(root);
  close(bounds.centre, [100, 200, 300]);
  assert.ok(Math.abs(bounds.radius - Math.sqrt(300)) < 1e-5);
});
