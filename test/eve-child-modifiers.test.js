import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import {
  EveChildContainer,
  EveChildMesh,
  EveChildModifierAttachToBone,
  EveChildModifierBillboard2D,
  EveChildModifierBillboard3D,
  EveChildModifierBooster,
  EveChildModifierCameraOrientedRotationConstrained,
  EveChildModifierHalo,
  EveChildModifierHaloInverted,
  EveChildModifierSRT,
  EveChildModifierStretch,
  EveChildModifierTranslateWithCamera,
  EveChildUpdateParams,
  EveSpaceObject2,
  EveUpdateContext,
  Tr2RenderContext
} from "../npm/dist/index.js";


const EPSILON = 1e-4;

/**
 * Builds a frame context whose render context places the camera at the given
 * world position with identity view orientation (view = translate(-cameraPos)).
 * @param {number[]} cameraPosition
 * @returns {EveUpdateContext}
 */
function contextAtCamera(cameraPosition)
{
  const view = mat4.fromTranslation(mat4.create(), [
    -cameraPosition[0],
    -cameraPosition[1],
    -cameraPosition[2]
  ]);
  const renderContext = new Tr2RenderContext();
  renderContext.SetViewTransform(view);

  const context = new EveUpdateContext();
  context.renderContext = renderContext;
  return context;
}

/**
 * @param {number} actual
 * @param {number} expected
 * @param {string} message
 */
function assertClose(actual, expected, message)
{
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${message}: expected ${expected}, got ${actual}`
  );
}

/**
 * @param {Float32Array} actual
 * @param {number[]} expected
 * @param {string} message
 */
function assertMatrixClose(actual, expected, message)
{
  for (let index = 0; index < 16; index++)
  {
    assertClose(actual[index], expected[index], `${message}[${index}]`);
  }
}

test("Tr2RenderContext derives view position and inverse from the view matrix", () =>
{
  const context = new Tr2RenderContext();
  assert.equal(context.HasViewMatrix(), false);
  assert.deepEqual(Array.from(context.GetViewPosition()), [0, 0, 0]);

  const view = mat4.fromTranslation(mat4.create(), [0, 0, -10]);
  context.SetViewTransform(view);

  assert.equal(context.HasViewMatrix(), true);
  assertMatrixClose(context.GetViewTransform(), Array.from(view), "viewTransform");
  assert.deepEqual(Array.from(context.GetViewPosition()), [0, 0, 10]);
  // Inverse-view translation row is the camera position.
  const inverse = context.GetInverseViewTransform();
  assertClose(inverse[12], 0, "inverse tx");
  assertClose(inverse[13], 0, "inverse ty");
  assertClose(inverse[14], 10, "inverse tz");
});

test("EveChildModifierBillboard2D copies inverse-view rotation scaled by parent axes", () =>
{
  const modifier = new EveChildModifierBillboard2D();
  const context = contextAtCamera([0, 0, 10]);
  const out = mat4.create();

  // Identity transform + identity view orientation -> identity result.
  modifier.ApplyTransform(context, mat4.create(), 0, null, out);
  assertMatrixClose(out, Array.from(mat4.create()), "billboard identity");

  // Parent scale is preserved per axis.
  const scaled = mat4.fromScaling(mat4.create(), [2, 3, 4]);
  modifier.ApplyTransform(context, scaled, 0, null, out);
  assertClose(out[0], 2, "billboard scaleX");
  assertClose(out[5], 3, "billboard scaleY");
  assertClose(out[10], 4, "billboard scaleZ");
});

test("EveChildModifierHalo fades with the squared facing dot", () =>
{
  const modifier = new EveChildModifierHalo();
  const out = mat4.create();

  // Child Z axis points straight at the camera -> facing 1 -> identity.
  modifier.ApplyTransform(contextAtCamera([0, 0, 10]), mat4.create(), 0, null, out);
  assertMatrixClose(out, Array.from(mat4.create()), "halo facing");

  // Camera perpendicular to child Z -> facing 0 -> basis collapses to zero.
  modifier.ApplyTransform(contextAtCamera([10, 0, 0]), mat4.create(), 0, null, out);
  for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10])
  {
    assertClose(out[index], 0, `halo perpendicular basis[${index}]`);
  }
  assertClose(out[15], 1, "halo perpendicular w");
});

test("EveChildModifierHaloInverted scales up as the child Z turns away", () =>
{
  const modifier = new EveChildModifierHaloInverted();
  const out = mat4.create();

  // Camera behind the child Z axis -> scale 1, result is the alignment basis.
  modifier.ApplyTransform(contextAtCamera([0, 0, -10]), mat4.create(), 0, null, out);
  assertClose(out[0], 1, "haloInverted alignMat[0]");
  assertClose(out[5], -1, "haloInverted alignMat[5]");
  assertClose(out[10], -1, "haloInverted alignMat[10]");

  // Camera in front of the child Z axis -> scale 0 -> zero basis.
  modifier.ApplyTransform(contextAtCamera([0, 0, 10]), mat4.create(), 0, null, out);
  assertClose(out[0], 0, "haloInverted collapsed[0]");
  assertClose(out[5], 0, "haloInverted collapsed[5]");
  assertClose(out[10], 0, "haloInverted collapsed[10]");
});

test("EveChildModifierBooster keeps a constant apparent radius", () =>
{
  const modifier = new EveChildModifierBooster();
  const context = contextAtCamera([0, 0, 10]);
  const out = mat4.create();

  modifier.ApplyTransform(context, mat4.create(), 0, null, out);

  const distCenter = 10;
  const radius = 0.5;
  const B = Math.sqrt(distCenter * distCenter - radius * radius);
  const scale = B / distCenter;
  const trans = -(radius * radius) / (distCenter * scale);

  assertClose(out[0], scale, "booster scaleX");
  assertClose(out[5], scale, "booster scaleY");
  assertClose(out[10], scale, "booster scaleZ");
  assertClose(out[14], trans, "booster tz");
});

test("EveChildModifierCameraOrientedRotationConstrained yaws toward the camera", () =>
{
  const modifier = new EveChildModifierCameraOrientedRotationConstrained();
  const out = mat4.create();

  // Camera on +X, child identity -> yaw 90deg about world up so child Z -> +X.
  modifier.ApplyTransform(contextAtCamera([10, 0, 0]), mat4.create(), 0, null, out);

  // Child local +Z (column 2) now points along world +X toward the camera.
  const forward = vec3.fromValues(out[8], out[9], out[10]);
  assertClose(forward[0], 1, "cameraOriented forward.x");
  assertClose(forward[1], 0, "cameraOriented forward.y");
  assertClose(forward[2], 0, "cameraOriented forward.z");
  // World up column is unchanged.
  assertClose(out[5], 1, "cameraOriented up preserved");
});

test("camera-dependent modifiers copy the transform through when no render context is set", () =>
{
  const source = mat4.fromRotationTranslationScale(
    mat4.create(),
    [0, 0, 0, 1],
    [3, 4, 5],
    [1, 1, 1]
  );
  const emptyContext = new EveUpdateContext();

  const modifiers = [
    new EveChildModifierBillboard2D(),
    new EveChildModifierBillboard3D(),
    new EveChildModifierBooster(),
    new EveChildModifierCameraOrientedRotationConstrained(),
    new EveChildModifierHalo(),
    new EveChildModifierHaloInverted(),
    new EveChildModifierTranslateWithCamera()
  ];

  for (const modifier of modifiers)
  {
    const out = mat4.create();
    const result = modifier.ApplyTransform(emptyContext, source, 0, null, out);
    assert.equal(result, out, `${modifier.constructor.name} returns out`);
    assertMatrixClose(out, Array.from(source), `${modifier.constructor.name} passthrough`);
  }
});

test("EveUpdateContext has value-typed defaults with only reference fields null", () =>
{
  const context = new EveUpdateContext();

  // Scalars default to 0 / false, not null or undefined.
  assert.equal(context.currentTime, 0);
  assert.equal(context.visibilityThreshold, 0);
  assert.equal(context.lodFactor, 0);
  assert.equal(context.invLodFactor, 0);
  assert.equal(context.raytracingEnabled, false);

  // Reference fields default to null.
  assert.equal(context.dataTextureManager, null);
  assert.equal(context.gpuParticleSystem, null);
  assert.equal(context.ballpark, null);
  assert.equal(context.taskGroup, null);
  assert.equal(context.frustum, null);
  assert.equal(context.renderContext, null);
  assert.equal(context.device, null);

  // Scanner-artifact duplicates are gone.
  assert.equal(context.time, undefined);
  assert.equal(context.manager, undefined);
  assert.equal(context.ps, undefined);

  // Time accessors: SetTime shifts current into last; deltaT is computed on
  // demand and stays 0 until a second frame is stamped (Carbon semantics).
  context.SetTime(12.5);
  assert.equal(context.GetTime(), 12.5);
  assert.equal(context.GetDeltaT(), 0);
  context.SetTime(12.75);
  assert.equal(context.GetTime(), 12.75);
  assert.ok(Math.abs(context.GetDeltaT() - 0.25) < 1e-9);

  // No field is left as @type.unknown.
  assert.equal(CjsSchema.getField(EveUpdateContext, "visibilityThreshold")?.type.kind, "float32");
  assert.equal(CjsSchema.getField(EveUpdateContext, "renderContext")?.type.kind, "objectRef");
});

test("EveChildMesh.UpdateAsyncronous folds transform modifiers in order over the world transform", () =>
{
  const mesh = new EveChildMesh();
  const first = new EveChildModifierSRT();
  first.translation = vec3.fromValues(1, 0, 0);
  const second = new EveChildModifierSRT();
  second.rotation = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2);
  mesh.AddTransformModifier(first);
  mesh.AddTransformModifier(second);

  const params = new EveChildUpdateParams();
  mesh.UpdateAsyncronous(null, params);

  // Manually fold the same modifiers over the seed world transform (identity).
  const expected = mat4.create();
  const tmp = mat4.create();
  first.ApplyTransform(null, expected, 0, null, tmp);
  mat4.copy(expected, tmp);
  second.ApplyTransform(null, expected, 0, null, tmp);
  mat4.copy(expected, tmp);

  assertMatrixClose(mesh.worldTransform, Array.from(expected), "mesh modifier fold");
});

test("EveChildMesh.UpdateAsyncronous threads the frame context to camera modifiers", () =>
{
  const mesh = new EveChildMesh();
  mesh.AddTransformModifier(new EveChildModifierCameraOrientedRotationConstrained());

  const params = new EveChildUpdateParams();
  mesh.UpdateAsyncronous(contextAtCamera([10, 0, 0]), params);

  // With the context threaded, the child yaws so its local +Z faces the camera
  // on +X (out[8..10] = [1,0,0]). Without threading it would stay identity
  // (out[8..10] = [0,0,1]) - so this asserts the context actually reached the modifier.
  assertClose(mesh.worldTransform[8], 1, "threaded camera forward.x");
  assertClose(mesh.worldTransform[10], 0, "threaded camera forward.z");
});

test("EveChildContainer.UpdateAsyncronous ticks controllers and folds modifiers", () =>
{
  const container = new EveChildContainer();

  let updatedFrequency = null;
  container.controllers.push({ Update(frequency) { updatedFrequency = frequency; } });

  const modifier = new EveChildModifierSRT();
  modifier.translation = vec3.fromValues(0, 5, 0);
  container.AddTransformModifier(modifier);

  const params = new EveChildUpdateParams();
  params.controllerUpdateFrequency = 0.25;
  container.UpdateAsyncronous(null, params);

  assert.equal(updatedFrequency, 0.25, "controller ticked with the params frequency");
  assertClose(container.worldTransform[13], 5, "container modifier applied (ty)");
});

test("EveSpaceObject2.UpdateAsyncronous drives an effect child's camera modifier end to end", () =>
{
  // Plays the host role: build the scene object, give it an effect-child mesh
  // with a camera modifier, stamp a render context onto the frame context, and
  // drive the async update - the same path a real frame driver would run.
  const object = new EveSpaceObject2();
  object.update = true;
  object.display = true;

  const mesh = new EveChildMesh();
  mesh.AddTransformModifier(new EveChildModifierCameraOrientedRotationConstrained());
  object.effectChildren.push(mesh);

  const context = contextAtCamera([10, 0, 0]);
  object.UpdateAsyncronous(context);

  // The child mesh yawed to face the camera on +X (local +Z -> world +X),
  // proving context.renderContext threaded all the way from the scene object
  // through EveChildMesh.UpdateAsyncronous into the modifier.
  assertClose(mesh.worldTransform[8], 1, "end-to-end camera forward.x");
  assertClose(mesh.worldTransform[10], 0, "end-to-end camera forward.z");
});

test("EveSpaceObject2.UpdateAsyncronous leaves an effect child unmodified when no render context is stamped", () =>
{
  const object = new EveSpaceObject2();
  object.update = true;
  object.display = true;

  const mesh = new EveChildMesh();
  mesh.AddTransformModifier(new EveChildModifierCameraOrientedRotationConstrained());
  object.effectChildren.push(mesh);

  // Frame context without a renderContext (e.g. a pass that has not set the view).
  object.UpdateAsyncronous(new EveUpdateContext());

  // Modifier falls back to the unmodified world transform (identity here).
  assertMatrixClose(mesh.worldTransform, Array.from(mat4.create()), "no-context passthrough");
});

test("camera-dependent modifiers carry the carbon.contextual camera marker", () =>
{
  for (const Modifier of [
    EveChildModifierBillboard2D,
    EveChildModifierBillboard3D,
    EveChildModifierBooster,
    EveChildModifierCameraOrientedRotationConstrained,
    EveChildModifierHalo,
    EveChildModifierHaloInverted,
    EveChildModifierTranslateWithCamera
  ])
  {
    const method = CjsSchema.getMethod(Modifier, "ApplyTransform");
    assert.equal(method.carbon.method, true, `${Modifier.name} carbon.method`);
    assert.equal(method.carbon.contextual, true, `${Modifier.name} contextual`);
    assert.deepEqual(Array.from(method.carbon.contextTiers), ["camera"], `${Modifier.name} tiers`);
    assert.equal(method.impl.status, "implemented", `${Modifier.name} status`);
  }
});

test("EveChildModifierAttachToBone composes the Float4x3 bone before the child", () =>
{
  const modifier = new EveChildModifierAttachToBone();
  const out = mat4.create();
  const transform = mat4.fromZRotation(mat4.create(), Math.PI / 2);

  // No bone selected -> passthrough.
  modifier.ApplyTransform(null, transform, 0, null, out);
  assert.ok(Math.abs(out[1] - 1) < EPSILON, "passthrough keeps the rotation");

  // Bone 0 = translation (1, 0, 0) in Float4x3 column-stride packing.
  const bones = new Float32Array([1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0]);
  modifier.SetBoneIndex(0);
  modifier.ApplyTransform(null, transform, 1, bones, out);
  // Carbon (row-vector): bone * transform - bone applies FIRST, so the bone
  // translation (1,0,0) is rotated by the +90-degree Z child into (0,1,0).
  assert.ok(Math.abs(out[12]) < EPSILON, "tx rotated away");
  assert.ok(Math.abs(out[13] - 1) < EPSILON, "bone translation rotated onto +Y");
});

test("EveChildModifierTranslateWithCamera adds or replaces the view position", () =>
{
  const modifier = new EveChildModifierTranslateWithCamera();
  const context = contextAtCamera([5, 6, 7]);
  const out = mat4.create();
  const transform = mat4.fromTranslation(mat4.create(), [1, 1, 1]);

  modifier.ApplyTransform(context, transform, 0, null, out);
  assert.deepEqual([out[12], out[13], out[14]], [6, 7, 8], "additive mode");

  modifier.attachedToCamera = true;
  modifier.ApplyTransform(context, transform, 0, null, out);
  assert.deepEqual([out[12], out[13], out[14]], [5, 6, 7], "attached mode");
});

test("EveChildModifierBillboard3D fixed mode builds the camera-facing basis", () =>
{
  const modifier = new EveChildModifierBillboard3D();
  modifier.fixed = true;
  const out = mat4.create();

  // Identity child at the origin, camera on +X: local +Z must face the camera.
  modifier.ApplyTransform(contextAtCamera([10, 0, 0]), mat4.create(), 0, null, out);
  assert.ok(Math.abs(out[8] - 1) < EPSILON, "forward.x");
  assert.ok(Math.abs(out[10]) < EPSILON, "forward.z");
  assert.ok(Math.abs(out[5] - 1) < EPSILON, "up preserved");
});

test("EveChildModifierBillboard3D fixed mode preserves Carbon composition with rotation and nonuniform scale", () =>
{
  const modifier = new EveChildModifierBillboard3D();
  modifier.fixed = true;

  const rotation = quat.setAxisAngle(
    quat.create(),
    vec3.normalize(vec3.create(), [0.2, 1, 0.3]),
    0.65
  );
  const translation = [2, -1, 3];
  const scale = [2, 3, 4];
  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    rotation,
    translation,
    scale
  );
  const context = contextAtCamera([9, 5, 13]);
  const out = mat4.create();

  modifier.ApplyTransform(context, transform, 0, null, out);

  const toObject = vec3.normalize(
    vec3.create(),
    vec3.subtract(vec3.create(), [9, 5, 13], translation)
  );
  const right = vec3.normalize(
    vec3.create(),
    vec3.cross(vec3.create(), [0, 1, 0], toObject)
  );
  const up = vec3.normalize(
    vec3.create(),
    vec3.cross(vec3.create(), toObject, right)
  );
  const billboard = mat4.create();
  billboard[0] = right[0];
  billboard[1] = right[1];
  billboard[2] = right[2];
  billboard[4] = up[0];
  billboard[5] = up[1];
  billboard[6] = up[2];
  billboard[8] = toObject[0];
  billboard[9] = toObject[1];
  billboard[10] = toObject[2];

  const scaleMatrix = mat4.fromScaling(mat4.create(), scale);
  const inverseScale = mat4.invert(mat4.create(), scaleMatrix);
  const transformSansScale = mat4.multiply(mat4.create(), transform, inverseScale);
  const expected = mat4.multiply(
    mat4.create(),
    mat4.multiply(mat4.create(), transformSansScale, billboard),
    scaleMatrix
  );

  assertMatrixClose(out, Array.from(expected), "fixed billboard composition");
});

test("EveChildModifierStretch spans from the child to the destination", () =>
{
  const modifier = new EveChildModifierStretch();
  modifier.SetDestPosition([0, 0, -10]);
  const out = mat4.create();

  modifier.ApplyTransform(null, mat4.create(), 0, null, out);
  // Carbon's TriQuaternionArcFromForward (and gl arcFromForward - verified
  // identical, both neutral at -Z) leaves a -Z stretch unrotated: scaled to
  // the length on Z, centred at the midpoint.
  assert.ok(Math.abs(out[10] - 10) < EPSILON, "z scale = stretch length");
  assert.ok(Math.abs(out[14] + 5) < EPSILON, "midpoint translation");
  assert.ok(Math.abs(out[0] - 1) < EPSILON, "x scale from source");
});

test("EveChildModifierStretch keeps source rotation first with nonuniform scale", () =>
{
  const modifier = new EveChildModifierStretch();
  const destination = [-4, 6, -2];
  modifier.SetDestPosition(destination);

  const rotation = quat.setAxisAngle(
    quat.create(),
    vec3.normalize(vec3.create(), [1, 2, 0.5]),
    0.6
  );
  const translation = [3, -2, 5];
  const sourceScale = [2, 3, 4];
  const transform = mat4.fromRotationTranslationScale(
    mat4.create(),
    rotation,
    translation,
    sourceScale
  );
  const out = mat4.create();

  modifier.ApplyTransform(null, transform, 0, null, out);

  const diff = vec3.subtract(vec3.create(), destination, translation);
  const arcMatrix = mat4.arcFromForward(mat4.create(), diff);
  const arcRotation = mat4.getRotation(quat.create(), arcMatrix);
  const midpoint = vec3.scaleAndAdd(vec3.create(), translation, diff, 0.5);
  const stretchTransform = mat4.fromRotationTranslationScale(
    mat4.create(),
    arcRotation,
    midpoint,
    [sourceScale[0], sourceScale[1], vec3.length(diff)]
  );
  const sourceRotation = mat4.fromQuat(mat4.create(), rotation);
  const expected = mat4.multiply(mat4.create(), stretchTransform, sourceRotation);
  const reversed = mat4.multiply(mat4.create(), sourceRotation, stretchTransform);

  assertMatrixClose(out, Array.from(expected), "stretch composition");
  assert.ok(
    Array.from(out).some((value, index) => Math.abs(value - reversed[index]) > 1e-3),
    "nontrivial fixture distinguishes reversed operand order"
  );
});
