// Regression coverage for Carbon's row-vector composition convention, restored
// CPU surface, and decorator corrections. Each assertion cites its relevant
// Carbon source contract at the implementation or test site.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EveChildTransform,
  EveChildModifierSRT,
  EveParticleDirectForce,
  EveParticleDragForce,
  EveParticleSpring,
  EveSocketParameterBool,
  EveSocketParameterBindingBase,
  EveSocketParameterFilePath,
  EveSocketParameterString,
  EveSocketParameterVector3,
  IEveSocketParameter,
  EveTransform,
  Tr2Effect,
  Tr2EffectTechnique,
  Tr2InstancedMesh,
  Tr2MeshArea,
  Tr2ConstantEffectParameter,
  Tr2ParticleDirectForce,
  Tr2ParticleDragForce,
  Tr2ParticleSpring,
  Tr2Pass,
  Tr2RenderBatch,
  Tr2RenderContext,
  Tr2SamplerOverride,
  Tr2Shader,
  Tr2Transform,
  Tr2Vector2Parameter,
  Tr2Vector4Parameter,
  Tr2VisibilityEvent,
  TriDevice,
  TriVariable,
  TriViewport,
  Vec3TransformByViewport
} from "../../npm/dist/trinity/index.js";

import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

function assertClose(actual, expected, message)
{
  assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: expected ${expected}, got ${actual}`);
}

test("child transforms compose exactly like EveTransform (parent . local)", () =>
{
  // Same Carbon expression (world = local * parent, row-vector) ported into
  // both classes must produce the same world transform.
  const parent = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), Math.PI / 2),
    vec3.fromValues(10, 0, 0),
    vec3.fromValues(2, 2, 2)
  );
  const scaling = vec3.fromValues(1, 1, 1);
  const rotation = quat.create();
  const translation = vec3.fromValues(1, 0, 0);

  const reference = new Tr2Transform();
  vec3.copy(reference.translation, translation);
  reference.UpdateViewDependentData(null, parent);

  const child = new EveChildTransform();
  child.Setup(scaling, rotation, translation, null);
  child.UpdateTransform(parent);

  for (let index = 0; index < 16; index++)
  {
    assertClose(child.worldTransform[index], reference.worldTransform[index], `worldTransform[${index}]`);
  }
  // The parent rotation must act on the child translation: local +X under a
  // +90-degree Y rotation and scale 2 lands at parent origin + (0,0,-2).
  assertClose(child.worldTransform[12], 10, "tx");
  assertClose(child.worldTransform[14], -2, "tz");
});

test("EveChildModifierSRT matches the row-vector identity cross-check", () =>
{
  // SRT * transform (row-vector) must equal transform when SRT is identity,
  // and must run the SRT FIRST otherwise.
  const modifier = new EveChildModifierSRT();
  modifier.translation = vec3.fromValues(0, 5, 0);
  const source = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2),
    vec3.create(),
    vec3.fromValues(1, 1, 1)
  );
  const out = mat4.create();
  modifier.ApplyTransform(null, source, 0, null, out);
  // SRT translation (0,5,0) rotated by the source's +90-degree Z roll lands
  // on -X: origin -> (-5, 0, 0).
  assertClose(out[12], -5, "rotated SRT tx");
  assertClose(out[13], 0, "rotated SRT ty");
});

test("TriVariable.Clear zeroes the payload but keeps the type", () =>
{
  const variable = new TriVariable();
  variable.contentType = TriVariable.ContentType.TRIVARIABLE_FLOAT4;
  variable.SetValue(new Float32Array([1, 2, 3, 4]));
  variable.Clear();
  assert.equal(variable.GetType(), TriVariable.ContentType.TRIVARIABLE_FLOAT4, "type survives Clear");
  assert.deepEqual(Array.from(variable.GetValue()), [0, 0, 0, 0], "payload zeroed in place");

  variable.Invalidate();
  assert.equal(variable.GetType(), TriVariable.ContentType.TRIVARIABLE_INVALID, "Invalidate resets the type");
});

test("TriVariable type tables match Carbon's sizes", () =>
{
  assert.equal(TriVariable.GetTypeSize(TriVariable.ContentType.TRIVARIABLE_FLOAT4X4), 64);
  assert.equal(TriVariable.GetTypeSize(TriVariable.ContentType.TRIVARIABLE_INVALID), 64, "INVALID registers as the largest type");
  assert.equal(TriVariable.GetTypeSize(TriVariable.ContentType.TRIVARIABLE_FLOAT2), 8);
  assert.equal(TriVariable.GetTypeName(TriVariable.ContentType.TRIVARIABLE_COLOR), "TRIVARIABLE_COLOR");
});

test("Tr2VisibilityEvent carries Carbon's defaults and flag enum", () =>
{
  const event = new Tr2VisibilityEvent();
  assert.equal(event.mirrorIndex, -1);
  assert.equal(event.eventType, Tr2VisibilityEvent.EventType.INSTANCE_VISIBLE);
  assert.equal(event.useClipPlane, false);
  assert.equal(Tr2VisibilityEvent.EventType.FLUSH_GPU_COMMAND_BUFFER, 1 << 29);
});

test("TriDevice exposes the loader switches and screen-space math", () =>
{
  const device = new TriDevice();
  assert.equal(device.disableGeometryLoad, false);
  assert.equal(device.minimumModelLOD, 0);

  device.viewport = new TriViewport();
  device.viewport.__init__(0, 0, 4, 4);
  assert.equal(device.AspectRatio(), 1);
  // DX pixel-centre mapping: for four pixels, pixel 3 -> +1 and pixel 0 -> -1.
  const projected = device.ScreenToProjection(3, 0);
  assertClose(projected.x, 1, "pixel centre maps to +1");
  assertClose(projected.y, 1, "y flips");

  device.animationTime = 1;
  assertClose(device.GetAnimationTimeElapsed(TriDevice.ANIMATION_TIME_MAX - 1), 2, "elapsed wraps across the recenter");
});

test("Vec3TransformByViewport maps clip space into the viewport", () =>
{
  const viewport = new TriViewport();
  viewport.__init__(10, 20, 100, 50);
  const point = vec3.fromValues(0, 0, 0.5);
  Vec3TransformByViewport(point, viewport);
  assert.deepEqual(Array.from(point), [60, 45, 0.5]);
});

test("Tr2MeshArea carries min-LOD and joint state with Carbon's copy reset", () =>
{
  const area = new Tr2MeshArea();
  assert.equal(area.GetMinLod(), -1, "TR2_LOD_UNSPECIFIED default");
  area.SetMinLod(2);
  area.SetJointCount(4);
  area.SetJointMappingAnimRig([0, 1, 2, 3]);
  area.SetAlphaCutout(true);

  const copy = new Tr2MeshArea();
  copy.CopyFrom(area);
  assert.equal(copy.index, area.index);
  assert.equal(copy.GetJointCount(), 0, "operator= deliberately resets joint state");
  assert.equal(copy.GetJointMappingAnimRig(), null);
  assert.equal(area.GetJointCount(), 4, "source keeps its joints");
  assert.equal(copy.IsAlphaCutout(), true, "operator= preserves alpha-cutout state");
});

test("Tr2InstancedMesh bounds helpers follow Carbon's shapes", () =>
{
  const mesh = new Tr2InstancedMesh();
  assert.equal(mesh.GetInstanceBoundsClosestToPoint([0, 0, 0]), null, "STATIC bounds -> empty sphere");

  mesh.SetDynamicBounds(3);
  mesh.SetInstanceGeometryRes({
    IsInstanceDataReady: () => true,
    GetInstanceBufferBoundingBox: () => ({ min: [-10, -10, -10], max: [10, 10, 10] })
  });
  const sphere = mesh.GetInstanceBoundsClosestToPoint([100, 0, 0]);
  assert.equal(sphere.radius, 3);
  assertClose(sphere.center[0], 10, "clamped into the shrunken outer bounds");

  const areaBounds = mesh.GetAreaBounds(0, null);
  assertClose(areaBounds.max[0], 13, "area bounds share the whole-mesh bounds");
});

test("Tr2RenderContext.TechniqueInBatch inspects batch shaders", () =>
{
  const shaderWith = new Tr2Shader();
  const technique = new Tr2EffectTechnique();
  technique.name = "Depth";
  technique.passes = [new Tr2Pass(), new Tr2Pass()];
  shaderWith.effect.techniques = [technique];
  const shaderWithout = new Tr2Shader();
  const batchWith = new Tr2RenderBatch();
  batchWith.shader = shaderWith;
  const batchWithout = new Tr2RenderBatch();
  batchWithout.shader = shaderWithout;
  assert.equal(Tr2RenderContext.TechniqueInBatch([batchWithout], "Depth"), false);
  assert.equal(Tr2RenderContext.TechniqueInBatch([batchWithout, batchWith], "Depth"), true);
  assert.equal(Tr2RenderContext.TechniqueInBatch([], "Depth"), false);
  assert.throws(
    () => Tr2RenderContext.TechniqueInBatch([{ shader: shaderWith }], "Depth"),
    /expects Tr2RenderBatch entries/u
  );
});

test("Tr2RenderContext registers the objectId variable lazily", () =>
{
  const context = new Tr2RenderContext();
  const variable = context.GetObjectIdVariable();
  assert.equal(variable.GetName(), "objectId");
  assert.equal(context.GetObjectIdVariable(), variable, "cached after first use");
});

test("Tr2Effect.GetHashValue reacts to authored content", () =>
{
  const effect = Tr2Effect.from({ effectFilePath: "res:/graphics/effect/a.fx" });
  const baseline = effect.GetHashValue();
  assert.equal(effect.GetHashValue(), baseline, "stable for unchanged content");

  const constant = new Tr2ConstantEffectParameter();
  constant.name = "Tint";
  effect.constParameters.push(constant);
  assert.notEqual(effect.GetHashValue(), baseline, "const parameter changes the hash");
});

test("Tr2Effect.isTextureResource uses Carbon's 1..5 texture range", () =>
{
  assert.equal(Tr2Effect.isTextureResource({ type: 5 }), true, "TEXTURE_TYPELESS is a texture");
  assert.equal(Tr2Effect.isTextureResource({ type: 0 }), false, "0 is not a valid resource type");
  assert.equal(Tr2Effect.isTextureResource({ type: 6 }), false, "BUFFER starts at 6");
});

test("Tr2Effect variable store falls back to the global store at call time", () =>
{
  const effect = new Tr2Effect();
  assert.equal(effect.variableStore, null, "no eager global capture");
  assert.ok(effect.GetVariableStore(), "falls back to the global store");
  const store = { GetVariable: () => null };
  effect.SetVariableStore(store);
  assert.equal(effect.GetVariableStore(), store);
});

test("vector parameters expose Blue component accessors and sRGB mirrors", () =>
{
  const parameter = new Tr2Vector2Parameter();
  parameter.SetValue([0.5, 0.25]);
  assert.equal(parameter.x, 0.5);
  parameter.y = 0.75;
  assert.equal(parameter.GetValue()[1], 0.75);
  assert.equal(parameter.v2, 0.75, "v2 aliases y");

  parameter.isSrgb = true;
  parameter.SetValue([0.5, 0.5]);
  assert.ok(parameter.linearValue[0] < 0.5, "gamma-to-linear darkens midtones");

  const vector4 = new Tr2Vector4Parameter();
  vector4.w = 0.125;
  assert.equal(vector4.v4, 0.125);
});

test("schema decorators: sampler fields rebuild bindings, const parameters persist", () =>
{
  // Field metadata registers via decorator initializers on first construction.
  void new Tr2SamplerOverride();
  void new Tr2ConstantEffectParameter();
  for (const field of ["filter", "mipFilter", "lodBias", "maxMipLevel", "maxAnisotropy"])
  {
    const meta = CjsSchema.getField(Tr2SamplerOverride, field);
    assert.ok(meta?.io?.rebuild?.includes("bindings"), `${field} carries the bindings consequence`);
  }
  assert.equal(CjsSchema.getField(Tr2ConstantEffectParameter, "name")?.io?.persist, true);
  assert.equal(CjsSchema.getField(Tr2ConstantEffectParameter, "value")?.io?.persist, true);
});

test("Eve particle force aliases hydrate as their Tr2 bases", () =>
{
  assert.ok(new EveParticleDirectForce() instanceof Tr2ParticleDirectForce);
  assert.ok(new EveParticleDragForce() instanceof Tr2ParticleDragForce);
  assert.ok(new EveParticleSpring() instanceof Tr2ParticleSpring);
  assert.equal(CjsSchema.GetConstructor("EveParticleDirectForce"), EveParticleDirectForce);
});

test("typed socket parameters bind, default, and reset like Carbon", () =>
{
  assert.ok(new EveSocketParameterBindingBase() instanceof IEveSocketParameter);
  assert.ok(new EveSocketParameterBool() instanceof IEveSocketParameter);
  assert.throws(
    () => new EveSocketParameterBindingBase().ExtractDefault(null),
    /must be implemented/
  );
  const socket = new EveSocketParameterBool();
  socket.name = "enabled";
  socket.value = true;
  socket.SetValueToDefault();
  assert.equal(socket.value, false, "no defaults -> the type default");

  const external = {
    IsValid: () => true,
    GetName: () => "enabled",
    GetValue: () => true,
    CreateBinding: () => ({
      SetSource() {},
      Initialize() {},
      IsValid: () => true,
      CopyValue() {}
    })
  };
  assert.equal(socket.BindToExternalParameter(external), true);
  assert.equal(socket.Used(), true);
  socket.value = false;
  socket.SetValueToDefault();
  assert.equal(socket.value, true, "default captured from the external parameter");
  socket.Reset();
  assert.equal(socket.Used(), false, "Reset restores then clears bindings");

  const vector = new EveSocketParameterVector3();
  vector.SetValueToDefault();
  assert.deepEqual(Array.from(vector.value), [0, 0, 0]);

  assert.ok(new EveSocketParameterFilePath() instanceof EveSocketParameterString);
});
