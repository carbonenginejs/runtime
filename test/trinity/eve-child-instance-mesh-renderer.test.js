import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
import {
  EveBaseDistributionMethod,
  EveChildInstanceMeshRenderer,
  EveChildSmartLightSet,
  EveChildUpdateParams,
  EveEntity,
  EveSmartLightAttributeModifierColor,
  EveSmartLightBaseAttributeModifier,
  EveSmartLightBaseGroup,
  EveSmartLightColorShareGroup,
  EveSmartLightMesh,
  EveSmartLightPointLight,
  EveSmartLightQuad,
  EveUpdateContext,
  IEveSmartLightGroupAttributeModifier,
  PlacementDataWithIdentifier,
  Tr2Effect,
  Tr2FactionLight,
  Tr2FloatParameter,
  Tr2InstancedMesh,
  Tr2MeshArea,
  Tr2RenderContext,
  Tr2RuntimeInstanceData,
  Tr2Vector4Parameter,
  TriFrustum
} from "../../npm/dist/trinity/index.js";
import * as generatedChildren from "../../npm/dist/trinity/generated/eve/child/index.js";
import * as generatedSmartLights from "../../npm/dist/trinity/generated/eve/smartLights/index.js";


const EPSILON = 1e-5;


function assertArrayClose(actual, expected, epsilon = EPSILON)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]} in [${Array.from(actual)}]`
    );
  }
}


function axisQuaternion(axis, angle)
{
  const normalized = vec3.normalize(vec3.create(), axis);
  return quat.setAxisAngle(quat.create(), normalized, angle);
}


function createPlacement()
{
  const placement = new PlacementDataWithIdentifier();
  vec3.set(placement.initialTranslation, 3, 5, 7);
  quat.copy(placement.initialRotation, axisQuaternion([1, 2, 0.5], 0.9));
  vec3.set(placement.initialScale, 2, 3, 4);
  vec3.set(placement.additionalTranslation, -1, 2, -3);
  vec3.set(placement.translationFrameDelta, 0.25, -0.5, 1.5);
  quat.copy(placement.additionalRotation, axisQuaternion([-0.25, 1, 2], -0.65));
  vec3.set(placement.additionalScale, 0.5, 2, 1.5);
  placement.boneIndex = 0x01020304;
  placement.lifeTime = 2;
  placement.uniqueID = 7;
  placement.initialPlacementID = 3;
  return placement;
}


class TestDistribution extends EveBaseDistributionMethod
{
  constructor(placements, center = [0, 0, 0])
  {
    super();
    this.placementData = placements;
    this.center = vec3.clone(center);
    this.dynamic = false;
    this.syncCount = 0;
    this.asyncCount = 0;
  }

  UpdateSyncronous()
  {
    this.syncCount++;
  }

  UpdateAsyncronous()
  {
    this.asyncCount++;
  }

  GetPlacementDataCenter()
  {
    return vec3.clone(this.center);
  }

  GetHasDynamicMovement()
  {
    return this.dynamic;
  }
}


class TestGeometry extends TriGeometryRes
{
  constructor(radius = 2)
  {
    super();
    this.radius = radius;
    this.good = true;
    this.meshCount = 1;
  }

  IsGood()
  {
    return this.good;
  }

  GetBoundingSphere(meshIndex)
  {
    return meshIndex >= 0 && meshIndex < this.meshCount
      ? vec4.fromValues(0, 0, 0, this.radius)
      : null;
  }

  GetMeshCount()
  {
    return this.meshCount;
  }
}


class VisibleFrustum extends TriFrustum
{
  IsSphereVisible()
  {
    return true;
  }

  IsBoxVisible()
  {
    return true;
  }

  GetPixelSizeAccross()
  {
    return 100;
  }

  GetPixelSizeAccrossEst()
  {
    return 100;
  }
}


function createFrame(worldTransform)
{
  const renderContext = new Tr2RenderContext();
  renderContext.SetViewTransform(mat4.fromTranslation(mat4.create(), [-17, -9, 11]));

  const frustum = new VisibleFrustum();
  vec3.set(frustum.viewPos, 17, 9, -11);

  const updateContext = new EveUpdateContext();
  updateContext.renderContext = renderContext;
  updateContext.SetFrustum(frustum);
  updateContext.SetVisibilityThreshold(0);
  updateContext.SetLodFactor(1);

  const params = new EveChildUpdateParams();
  mat4.copy(params.localToWorldTransform, worldTransform);
  params.activationStrength = 0.75;
  return { renderContext, updateContext, params };
}


function publishConstraint(rotationConstraint)
{
  const placement = createPlacement();
  const distribution = new TestDistribution([ placement ]);
  const geometry = new TestGeometry();
  const mesh = new Tr2InstancedMesh();
  mesh.geometry = geometry;

  const renderer = new EveChildInstanceMeshRenderer();
  renderer.mesh = mesh;
  renderer.distribution = distribution;
  renderer.rotationConstraint = rotationConstraint;
  vec3.set(renderer.staticOffsetTranslation, 1, -2, 0.5);
  quat.copy(renderer.staticOffsetRotation, axisQuaternion([2, -1, 0.25], 0.37));
  vec3.set(renderer.staticOffsetScale, 1.25, 0.75, 2);

  const worldTransform = mat4.fromRotationTranslationScale(
    mat4.create(),
    axisQuaternion([0.3, 1, -0.4], 0.72),
    [4, -3, 2],
    [1.5, 0.75, 2.25]
  );
  const frame = createFrame(worldTransform);

  // The first invisible pass creates the provider and computes bounds, but
  // intentionally leaves its bytes unpublished.
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  const provider = mesh.GetInstanceGeometryResource();
  assert.ok(provider instanceof Tr2RuntimeInstanceData);
  assert.equal(provider.dataRevision, 0);

  renderer.UpdateAsyncronous(frame.updateContext, frame.params);
  assert.equal(renderer.UpdateVisibility(frame.updateContext, worldTransform, 3), true);
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  assert.equal(mesh.GetInstanceGeometryResource(), provider);
  assert.equal(provider.dataRevision, 1);
  return { renderer, mesh, provider, distribution, placement, frame };
}


test("instance-mesh and smart-light promotions expose maintained exact schemas", () =>
{
  assert.equal(generatedChildren.EveChildInstanceMeshRenderer, undefined);
  assert.equal(generatedSmartLights.EveSmartLightMesh, undefined);
  assert.equal(existsSync("src/trinity/generated/eve/child/EveChildInstanceMeshRenderer.js"), false);
  assert.equal(existsSync("src/trinity/generated/eve/smartLights/EveSmartLightMesh.js"), false);
  assert.equal(existsSync("npm/dist/trinity/generated/eve/child/EveChildInstanceMeshRenderer.js"), false);
  assert.equal(existsSync("npm/dist/trinity/generated/eve/smartLights/EveSmartLightMesh.js"), false);

  assert.deepEqual(Object.keys(new EveChildInstanceMeshRenderer().GetValues()), [
    "name", "partTag", "ownedLocatorSets", "display", "inheritOverlayEffects", "overlayEffects",
    "damageOverlay", "mesh", "minScreenSize", "currentScreenSize",
    "rotationConstraint", "staticOffsetRotation", "staticOffsetTranslation",
    "distribution", "staticOffsetScale"
  ]);
  assert.deepEqual(Object.keys(new EveSmartLightMesh().GetValues()), [
    "name", "ownedLocatorSets", "display", "inheritOverlayEffects", "overlayEffects",
    "damageOverlay", "mesh", "minScreenSize", "currentScreenSize",
    "rotationConstraint", "staticOffsetRotation", "staticOffsetTranslation",
    "staticOffsetScale", "shaderParamColorName", "factionColor",
    "useFactionColor", "attributeModifiers", "customColor", "castShadows"
  ]);

  const smart = new EveSmartLightMesh();
  smart.castShadows = true;
  assert.equal(smart.castShadow, true);
  smart.castShadow = false;
  assert.equal(smart.castShadows, false);
  assert.equal(CjsSchema.getField(EveSmartLightMesh, "castShadow"), null);
  assert.equal(CjsSchema.getField(EveSmartLightMesh, "castShadows")?.type?.kind, "boolean");
  assert.equal(CjsSchema.getField(EveSmartLightMesh, "currentScreenSize")?.type?.kind, "float32");
  assert.deepEqual(EveChildInstanceMeshRenderer.RotationalConstraints, {
    NONE: 0,
    BILLBOARD: 1,
    BILLBOARD_WITH_Z_LOCKED: 2
  });
  assert.equal(Object.isFrozen(EveChildInstanceMeshRenderer.RotationalConstraints), true);
});


test("instance transforms preserve logical matrices and pack shader TEXCOORD8 through 14", () =>
{
  const expectedRows = [
    [1.09308803, -1.14840758, 4.95025349, 2.09147716],
    [-0.25753656, 2.58523989, 9.50582123, 4.74231434],
    [-0.54893863, -3.49967098, 5.39762688, 3.61988354]
  ];
  const { renderer, provider, mesh } = publishConstraint(
    EveChildInstanceMeshRenderer.RotationalConstraints.NONE
  );

  assert.deepEqual(provider.layout.map(value => value.usageIndex), [8, 9, 10, 11, 12, 13, 14]);
  assert.equal(provider.GetStride(), 100);
  assert.equal(provider.GetData().byteLength, 100);
  assert.equal(provider.IsInstanceDataReady(), true);
  assert.equal(mesh.boundsMethod, Tr2InstancedMesh.BoundsMethod.DYNAMIC_SCALED);

  const row = provider.GetItem(0);
  assertArrayClose(row[0], expectedRows[0]);
  assertArrayClose(row[1], expectedRows[1]);
  assertArrayClose(row[2], expectedRows[2]);
  assertArrayClose(row[3], [...expectedRows[0].slice(0, 3), 2.34147716]);
  assertArrayClose(row[4], [...expectedRows[1].slice(0, 3), 4.24231434]);
  assertArrayClose(row[5], [...expectedRows[2].slice(0, 3), 5.11988354]);
  assert.equal(row[6], 0x01020304);

  assertArrayClose(renderer.instanceTransforms[0], [
    1.09308803, -0.25753656, -0.54893863, 0,
    -1.14840758, 2.58523989, -3.49967098, 0,
    4.95025349, 9.50582123, 5.39762688, 0,
    2.09147716, 4.74231434, 3.61988354, 1
  ]);

  const data = provider.GetData();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  assert.equal(view.getInt32(96, true), 0x01020304);
});


test("billboard and Z-locked constraints retain Carbon's nonuniform-scale math", () =>
{
  const fixtures = [
    [EveChildInstanceMeshRenderer.RotationalConstraints.BILLBOARD, [
      [-0.99734604, -2.71010256, 0.31608999, 2.09147716],
      [0.75210887, -3.59232426, -0.31732839, 4.74231434],
      [0.04619190, -0.02362563, 11.99163818, 3.61988354]
    ]],
    [EveChildInstanceMeshRenderer.RotationalConstraints.BILLBOARD_WITH_Z_LOCKED, [
      [-0.90951127, 2.70154953, 3.98306942, 2.09147716],
      [0.55324668, 3.51230526, -5.29781008, 4.74231434],
      [-0.65514004, -0.78443885, -10.00342274, 3.61988354]
    ]]
  ];

  for (const [constraint, expected] of fixtures)
  {
    const { provider } = publishConstraint(constraint);
    const row = provider.GetItem(0);
    assertArrayClose(row[0], expected[0]);
    assertArrayClose(row[1], expected[1]);
    assertArrayClose(row[2], expected[2]);
  }
});


test("static publication retries visibility, refreshes explicitly, and settles zero counts", () =>
{
  const state = publishConstraint(EveChildInstanceMeshRenderer.RotationalConstraints.NONE);
  const { renderer, provider, distribution, frame } = state;
  const initialRevision = provider.dataRevision;

  distribution.placementData[0].initialTranslation[0] += 5;
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  assert.equal(provider.dataRevision, initialRevision);

  renderer.RefreshStaticGeometry();
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  assert.equal(provider.dataRevision, initialRevision + 1);

  distribution.placementData.length = 0;
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  const zeroRevision = provider.dataRevision;
  renderer.UpdateSyncronous(frame.updateContext, frame.params);
  assert.equal(provider.dataRevision, zeroRevision);
});


test("smart-light modifiers receive a nominal detached placement and RGB-only color", () =>
{
  const placement = createPlacement();
  const distribution = new TestDistribution([ placement ], [2, 3, 4]);
  const smart = new EveSmartLightMesh();
  const worldTransform = mat4.fromRotationTranslationScale(
    mat4.create(),
    axisQuaternion([0.3, 1, -0.4], 0.72),
    [4, -3, 2],
    [1.5, 0.75, 2.25]
  );
  const frame = createFrame(worldTransform);
  smart.UpdateAsyncronous(frame.updateContext, frame.params, distribution);

  let received = null;
  const modifier = {
    ProcessAttributeModifier(attribute, value, center, direction, strength)
    {
      received = { attribute, value, center: vec3.clone(center), direction: vec3.clone(direction), strength };
      attribute[0] = 0.25;
      attribute[3] = 99;
      value.initialTranslation[0] = 999;
    }
  };
  smart.attributeModifiers.push(modifier);
  smart.UpdateSyncronous(frame.updateContext, frame.params, distribution);

  assert.ok(received.value instanceof PlacementDataWithIdentifier);
  assert.notEqual(received.value, placement);
  assert.notEqual(received.value.initialTranslation, placement.initialTranslation);
  assert.equal(placement.initialTranslation[0], 3);
  assert.equal(received.attribute.length, 3);
  assert.equal(received.attribute[3], undefined);
  assert.equal(received.strength, frame.params.activationStrength);
  assertArrayClose(received.center, [2, 3, 4]);
  assertArrayClose(received.direction, [1.23209965, 0.16481461, 0.66881418]);

  const inherited = new TestDistribution([]);
  smart.distribution = inherited;
  smart.UpdateAsyncronous(frame.updateContext, frame.params, distribution);
  assert.equal(inherited.asyncCount, 1);
});


test("named SOF faction colors resolve across groups, modifiers, and faction lights", () =>
{
  class NamedColorSet
  {
    static Types = Object.freeze(["Primary", "Secondary"]);

    colors = [vec4.fromValues(1, 0, 0, 1), vec4.fromValues(0.1, 0.2, 0.3, 0.4)];

    Get(index, out)
    {
      return vec4.copy(out, this.colors[index]);
    }
  }

  const set = new NamedColorSet();
  const group = new EveSmartLightBaseGroup();
  group.useFactionColor = true;
  group.factionColor = 1;
  group.SetInheritProperties(set);
  assertArrayClose(group.GetGroupColor(), [0.1, 0.2, 0.3, 0.4]);

  const modifier = new EveSmartLightAttributeModifierColor();
  modifier.useFactionColor = true;
  modifier.factionColor = 1;
  modifier.SetInheritProperties(set);
  assertArrayClose(modifier.GetGroupColor(), [0.1, 0.2, 0.3, 0.4]);

  const light = new Tr2FactionLight();
  light.factionColor = 1;
  light.saturation = 1;
  light.SetInheritProperties(set);
  assertArrayClose(light.color, [0.1, 0.2, 0.3, 0.4]);

  assert.throws(
    () =>
    {
      group.SetInheritProperties({});
      group.GetGroupColor();
    },
    TypeError
  );
});


test("smart-light list notifications preserve exact Carbon insertion and registry events", () =>
{
  const interfaceModifier = new IEveSmartLightGroupAttributeModifier();
  assert.ok(interfaceModifier instanceof EveSmartLightBaseAttributeModifier);
  assert.ok(new EveSmartLightAttributeModifierColor() instanceof IEveSmartLightGroupAttributeModifier);
  assert.doesNotThrow(() => interfaceModifier.SetControllerVariable("Intensity", 1));
  assert.doesNotThrow(() => interfaceModifier.SetInheritProperties([]));
  assert.throws(() => interfaceModifier.UpdateSyncronous({}, {}, 1), /must be implemented/);
  assert.throws(
    () => interfaceModifier.ProcessAttributeModifier(vec3.create(), {}, vec3.create(), vec3.create(), 1),
    /must be implemented/
  );

  const colorSet = Array.from(
    { length: 45 },
    () => vec4.fromValues(0.1, 0.2, 0.3, 0.4)
  );
  for (const Owner of [
    EveSmartLightBaseGroup,
    EveSmartLightMesh,
    EveSmartLightPointLight,
    EveSmartLightQuad
  ])
  {
    const owner = new Owner();
    owner.SetInheritProperties(colorSet);
    const calls = [];
    const modifier = {
      SetInheritProperties(value)
      {
        calls.push(value);
      }
    };
    owner.OnListModified(0x09, 0, 0, modifier, owner.attributeModifiers);
    owner.OnListModified(0x18, 0, 0, modifier, owner.attributeModifiers);
    assert.equal(calls.length, 0);
    owner.OnListModified(0x08, 0, 0, modifier, owner.attributeModifiers);
    assert.deepEqual(calls, [ colorSet ]);

    owner.attributeModifiers = [ {} ];
    assert.throws(() => owner.SetControllerVariable("Intensity", 1), TypeError);
  }

  class GroupEntity extends EveEntity
  {
    inherited = [];
    registered = [];
    unregistered = [];

    SetInheritProperties(value)
    {
      this.inherited.push(value);
    }

    Register(registry)
    {
      this.registered.push(registry);
    }

    UnRegister(registry)
    {
      this.unregistered.push(registry);
    }
  }

  for (const Owner of [ EveSmartLightColorShareGroup, EveChildSmartLightSet ])
  {
    const owner = new Owner();
    const registry = {};
    const group = new GroupEntity();
    owner.registry = registry;
    owner.SetInheritProperties(colorSet);
    owner.OnListModified(0x18, 0, 0, group, owner.lightGroups);
    const loadingInheritanceCount = Owner === EveChildSmartLightSet ? 1 : 0;
    assert.equal(group.inherited.length, loadingInheritanceCount);
    assert.equal(group.registered.length, 0);
    owner.OnListModified(0x08, 0, 0, group, owner.lightGroups);
    assert.equal(group.inherited.length, loadingInheritanceCount + 1);
    assertArrayClose(group.inherited.at(-1)[0], colorSet[0]);
    assert.deepEqual(group.registered, [ registry ]);
    owner.OnListModified(0x09, 0, 0, group, owner.lightGroups);
    assert.deepEqual(group.unregistered, [ registry ]);
    owner.lightGroups.push(group);
    owner.OnListModified(0x07, 0, 0, null, owner.lightGroups);
    assert.deepEqual(group.unregistered, [ registry, registry ]);
  }

  const shared = new EveSmartLightColorShareGroup();
  shared.lightGroups = [ {} ];
  assert.throws(() => shared.GetRenderables([]), TypeError);
  shared.lightGroups = [];
  shared.attributeModifiers = [ {} ];
  assert.throws(
    () => shared.UpdateSyncronous({}, { activationStrength: 1 }, null),
    TypeError
  );
});


test("smart mesh uses the real effect Vector4 facade and preserves Carbon wrong-type append", () =>
{
  const geometry = new TestGeometry();
  const mesh = new Tr2InstancedMesh();
  mesh.geometry = geometry;
  const area = new Tr2MeshArea();
  const effect = new Tr2Effect();
  area.effect = effect;
  mesh.opaqueAreas.push(area);

  const smart = new EveSmartLightMesh();
  smart.mesh = mesh;
  smart.shaderParamColorName = "LightColor";
  const lightColor = vec4.fromValues(0.2, 0.3, 0.4, 0.5);
  assert.equal(smart.SetMeshColorParameter(lightColor), true);
  const vector = effect.FindParameterByName("LightColor");
  assert.ok(vector instanceof Tr2Vector4Parameter);
  assertArrayClose(vector.GetValue(), [0.2, 0.3, 0.4, 0.5]);
  assert.equal(smart.SetMeshColorParameter(lightColor), false);

  const wrong = new Tr2FloatParameter();
  wrong.name = "OtherColor";
  effect.parameters.push(wrong);
  effect.SetParameter("OtherColor", [0.5, 0.6, 0.7, 0.8]);
  assert.equal(effect.parameters[0] instanceof Tr2Vector4Parameter, true);
  assert.equal(effect.parameters.includes(wrong), true);
  assert.equal(effect.parameters.at(-1) instanceof Tr2Vector4Parameter, true);
  assertArrayClose(effect.parameters.at(-1).GetValue(), [0.5, 0.6, 0.7, 0.8]);

  const invalidGeometry = new TestGeometry();
  invalidGeometry.meshCount = 0;
  mesh.geometry = invalidGeometry;
  assert.equal(smart.SetMeshColorParameter([0.9, 0.8, 0.7, 0.6]), false);
});
