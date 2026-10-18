// EveSpaceScene's Carbon MAP_PROPERTY rows (EveSpaceScene_Blue.cpp:164-179,
// 448-451, 532-537): each accessor routes through the Carbon getter and
// setter it names, shLightingManager keeps its PERSISTONLY backing member
// under the same exposed name, and the flags follow the macro (READWRITE for
// a pair, READ for a getter alone).
import test from "node:test";
import assert from "node:assert/strict";
import { EveEffectRoot2, EveSpaceScene, Tr2QuadRenderer, Tr2ShLightingManager } from "../../npm/dist/trinity/index.js";
import { EffectKeyGenerator, TriRenderBatchAccumulator } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { StubContext } from "../support/stubContext.js";

/** A real manager whose register/unregister calls are counted. */
function RecordingManager()
{
  const manager = new Tr2ShLightingManager();
  const calls = { registered: 0, unregistered: 0 };
  const register = manager.RegisterSecondaryLightSource.bind(manager);
  const unregister = manager.UnregisterSecondaryLightSource.bind(manager);
  manager.RegisterSecondaryLightSource = (...args) => { calls.registered += 1; return register(...args); };
  manager.UnregisterSecondaryLightSource = (...args) => { calls.unregistered += 1; return unregister(...args); };
  return { manager, calls };
}

const schema = () => CjsSchema.getSchema(EveSpaceScene);
const property = name => schema().properties.find(entry => entry.name === name);

test("shLightingManager routes through SetShLightingManager and GetShLightingManager (cpp:3368-3423)", () =>
{
  const scene = new EveSpaceScene();
  const root = new EveEffectRoot2();
  scene.objects.push(root);
  const { manager, calls } = RecordingManager();

  assert.equal(scene.shLightingManager, null);
  scene.shLightingManager = manager;
  assert.equal(calls.registered, 1, "the setter registers the scene's light sources");
  assert.equal(scene._shLightingManager, manager, "stored in m_shLightingManager");
  assert.equal(scene.shLightingManager, manager);
  assert.equal(scene.GetShLightingManager(), manager);

  scene.shLightingManager = manager;
  assert.equal(calls.registered, 1, "the same manager is a no-op");

  scene.shLightingManager = null;
  assert.equal(calls.unregistered, 1, "clearing unregisters them");
  assert.equal(scene.GetShLightingManager(), null);
});

test("Initialize replays a reader-stored manager through the setter (cpp:3252-3257)", () =>
{
  const scene = new EveSpaceScene();
  const root = new EveEffectRoot2();
  scene.objects.push(root);
  const { manager, calls } = RecordingManager();

  scene._shLightingManager = manager;
  assert.equal(calls.registered, 0, "a reader writes the backing member without the setter");

  scene.Initialize(StubContext({ width: 16, height: 16 }));
  assert.equal(calls.registered, 1);
  assert.equal(scene.GetShLightingManager(), manager);
});

test("shLightingManager is a PERSISTONLY member plus a READWRITE property under one name", () =>
{
  new EveSpaceScene();
  const member = schema().members.find(entry => entry.name === "shLightingManager");
  assert.equal(member.key, "_shLightingManager");
  assert.equal(member.edit.persistOnly, true);
  assert.equal(member.edit.persist, true);
  assert.notEqual(member.edit.read, true);

  const entry = property("shLightingManager");
  assert.equal(entry.key, "shLightingManager");
  assert.equal(entry.edit.read, true);
  assert.equal(entry.edit.write, true);
  assert.notEqual(entry.edit.persist, true, "MAP_PROPERTY, not MAP_PROPERTY_PERSISTED");
});

test("cameraAttachments is the camera attachment parent's children (cpp:304-307), read only", () =>
{
  const scene = new EveSpaceScene();
  assert.equal(scene._GetCameraAttachments(), scene.cameraAttachmentParent.GetChildren());
  assert.equal(scene.cameraAttachments, scene.cameraAttachmentParent.effectChildren);
  assert.throws(() => { scene.cameraAttachments = []; }, TypeError);

  const entry = property("cameraAttachments");
  assert.equal(entry.edit.read, true);
  assert.notEqual(entry.edit.write, true);
});

test("quadRenderer is the shared quad renderer (cpp:1765-1768), read only", () =>
{
  const scene = new EveSpaceScene();
  assert.equal(scene.quadRenderer, Tr2QuadRenderer.Instance());
  assert.equal(scene.quadRenderer, scene.GetQuadRenderer());
  assert.throws(() => { scene.quadRenderer = null; }, TypeError);

  const entry = property("quadRenderer");
  assert.equal(entry.edit.read, true);
  assert.notEqual(entry.edit.write, true);
});

test("shadowsInReflections routes through EnableShadowsInReflections/IsShadowsInReflectionsEnabled (cpp:4154-4173)", () =>
{
  const scene = new EveSpaceScene();
  assert.equal(scene.shadowsInReflections, false);

  scene.shadowsInReflections = true;
  assert.equal(scene.IsShadowsInReflectionsEnabled(), true);
  assert.notEqual(scene._reflectionShadowMap, null);
  assert.equal(scene.shadowsInReflections, true);

  scene.shadowsInReflections = false;
  assert.equal(scene._reflectionShadowMap, null);
  assert.equal(scene.shadowsInReflections, false);

  const entry = property("shadowsInReflections");
  assert.equal(entry.edit.read, true);
  assert.equal(entry.edit.write, true);
});

test("PerThreadAccumulator is an effect-sorted accumulator over the pool allocator (h:194-200)", () =>
{
  const accumulator = new EveSpaceScene.PerThreadAccumulator();
  assert.ok(accumulator instanceof TriRenderBatchAccumulator);
  assert.equal(accumulator.keyGenerator, EffectKeyGenerator);
  assert.equal(accumulator.GetTriPoolAllocator(), Tr2RenderContext_GetMainThreadRenderContext().GetTriPoolAllocator());
  assert.equal(CjsSchema.getClassName(EveSpaceScene.PerThreadAccumulator), "EveSpaceScenePerThreadAccumulator");
});
