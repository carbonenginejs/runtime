import test from 'node:test';
import assert from 'node:assert/strict';
import { BLUELISTEVENT as E } from '../../npm/dist/global/consts/blue.js';
import { IListNotify } from '../../npm/dist/global/blue/index.js';
import { CjsSchema, blue } from '../../npm/dist/global/schema/index.js';
import { Tr2ParticleSystem, Tr2SphereConstraint, Tr2PlaneConstraint, ITr2GenericEmitter, PlayFX, IEveFiringEffectElement, Tr2Sprite2dPolygon, Tr2Sprite2dLineTrace, Tr2Sprite2dVertex, Tr2Sprite2dTriangle, Tr2Sprite2dLineTraceVertex } from '../../npm/dist/trinity/index.js';
import { Tr2InteriorScene, ITr2InteriorDynamic } from '../../npm/dist/character/index.js';

class TestEmitter extends ITr2GenericEmitter {}
blue.interface(ITr2GenericEmitter)(TestEmitter);
class TestEffect extends IEveFiringEffectElement {}
blue.interface(IEveFiringEffectElement)(TestEffect);
class TestDynamic extends ITr2InteriorDynamic {}
blue.interface(ITr2InteriorDynamic)(TestDynamic);

function observer(owner, name)
{
  assert.ok(CjsSchema.cast(owner, IListNotify));
  const info = {};
  owner[name].GetInfo(info);
  assert.equal(info.notify, owner);
  assert.equal(Array.isArray(owner[name]), true);
}

test('particle constraints and collision emitters use constructor-owned list callbacks', t =>
{
  const system = new Tr2ParticleSystem();
  t.after(() => system.Destruct());
  observer(system, 'constraints');
  const constraint = new Tr2SphereConstraint();
  let bound = null, binds = 0;
  constraint.Bind = value => { bound = value; binds++; };
  assert.equal(system.constraints.Append(constraint), true);
  assert.equal(bound, system);
  system.OnListModified(E.BELIST_LOADFINISHED, 0, 0, constraint, system.constraints);
  assert.equal(binds, 1);
  system.OnListModified(E.BELIST_INSERTED | E.BELIST_LOADING, 0, 0, constraint, system.constraints);
  assert.equal(binds, 2, 'Tr2ParticleSystem.cpp:220-239 does not suppress loading inserts');
  observer(constraint, 'onCollisionEmitters');
  const emitter = new TestEmitter();
  let flags = 0;
  emitter.SetThreadSafeFlag = () => { flags++; };
  assert.equal(constraint.onCollisionEmitters.Append(emitter), true);
  assert.equal(flags, 1);
  constraint.OnListModified(E.BELIST_INSERTED | E.BELIST_LOADING, 0, 0, emitter, constraint.onCollisionEmitters);
  constraint.OnListModified(E.BELIST_INSERTED, 0, 0, emitter, constraint.generators);
  assert.equal(flags, 1);
  const plane = new Tr2PlaneConstraint();
  plane.Bind = value => { assert.equal(value, system); binds++; };
  assert.equal(system.constraints.Append(plane), true);
  assert.equal(binds, 3);
  observer(plane, 'onCollisionEmitters');
  assert.equal(plane.onCollisionEmitters.Append(emitter), true);
  assert.equal(flags, 2);
});

test('PlayFX firing list registers additions and unregisters removal and unload', () =>
{
  const owner = new PlayFX();
  observer(owner, 'generatedFiringEffects');
  owner.registry = {};
  const effect = new TestEffect();
  let registered = 0, removed = 0;
  effect.Register = registry => { assert.equal(registry, owner.registry); registered++; };
  effect.UnRegister = registry => { assert.equal(registry, owner.registry); removed++; };
  assert.equal(owner.generatedFiringEffects.Append(effect), true);
  assert.equal(registered, 1);
  owner.OnListModified(E.BELIST_INSERTED | E.BELIST_LOADING, 0, 0, effect, owner.generatedFiringEffects);
  assert.equal(registered, 1, 'PlayFX.cpp:166-200 skips loading changes');
  owner.generatedFiringEffects.Remove(0);
  assert.equal(removed, 1);
  owner.generatedFiringEffects.Append(effect);
  owner.generatedFiringEffects.Remove(-1);
  assert.equal(removed, 2);
});

test('polygon dirties on every event; line trace preserves Carbon unmasked event filtering', () =>
{
  const polygon = new Tr2Sprite2dPolygon(), line = new Tr2Sprite2dLineTrace();
  observer(polygon, 'vertices'); observer(polygon, 'triangles'); observer(line, 'vertices');
  let polygons = 0, lines = 0;
  polygon.SetDirty = () => { polygons++; }; line.SetDirty = () => { lines++; };
  assert.equal(polygon.vertices.Append(new Tr2Sprite2dVertex()), true);
  assert.equal(line.vertices.Append(new Tr2Sprite2dLineTraceVertex()), true);
  polygon.OnListModified(E.BELIST_LOADFINISHED);
  line.OnListModified(E.BELIST_LOADFINISHED);
  line.OnListModified(E.BELIST_INSERTED | E.BELIST_LOADING);
  assert.equal(polygons, 2, 'Tr2Sprite2dPolygon.cpp:158-161 dirties for every notification');
  assert.equal(lines, 1, 'Tr2Sprite2dLineTrace.cpp:779-789 switches on the unmasked event');
  assert.equal(polygon.triangles.Append(new Tr2Sprite2dTriangle()), true);
  assert.equal(polygons, 3);
  line.vertices.Remove(-1);
  assert.equal(lines, 2);
});

test('interior list notifications update shadows and maintain pending dynamics', () =>
{
  const scene = new Tr2InteriorScene();
  observer(scene, 'lights'); observer(scene, 'dynamics');
  let shadows = 0;
  scene.SetupShadowMaps = () => { shadows++; };
  scene.OnListModified(E.BELIST_LOADFINISHED, 0, 0, null, scene.lights);
  assert.equal(shadows, 1);
  const dynamic = new TestDynamic();
  let additions = 0, removals = 0;
  dynamic.AddToScene = physics => { assert.equal(physics, scene._apexScene); additions++; return false; };
  dynamic.RemoveFromScene = () => { removals++; };
  assert.equal(scene.dynamics.Append(dynamic), true);
  assert.equal(additions, 1);
  assert.deepEqual(scene._dynamicsPendingLoad, [dynamic]);
  scene.OnListModified(E.BELIST_INSERTED, 0, 0, dynamic, scene.dynamics);
  assert.equal(scene._dynamicsPendingLoad.length, 1);
  scene.OnListModified(E.BELIST_INSERTED | E.BELIST_LOADING, 0, 0, dynamic, scene.dynamics);
  assert.equal(additions, 2);
  scene.dynamics.Remove(0);
  assert.equal(removals, 1);
  assert.equal(scene._dynamicsPendingLoad.length, 0);
  dynamic.AddToScene = () => true;
  scene.dynamics.Append(dynamic);
  assert.equal(scene._dynamicsPendingLoad.length, 0, 'Tr2InteriorScene.cpp:267-272 queues only failed additions');
});
