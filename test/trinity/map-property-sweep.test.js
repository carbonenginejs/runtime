// Carbon MAP_PROPERTY rows converted to accessor pairs: each accessor routes
// through the Carbon getter/setter its macro names, a same-name PERSISTONLY or
// HIDDEN MAP_ATTRIBUTE keeps its backing member under the exposed name, and the
// property flags follow the macro (READWRITE for a pair, READ for a getter
// alone, PERSIST only for MAP_PROPERTY_PERSISTED).
import test from "node:test";
import assert from "node:assert/strict";
import {
  EveChildCloud2,
  EveChildContainer,
  EveChildEffectPropagator,
  EveChildInstanceContainer,
  EveChildTurret,
  EveDistributionPlacementGeneratorVolume,
  EveFiringEffectElementContainer,
  EveMultiEffectParameter,
  EveShip2,
  EveSmartLightAttributeModifierExpressionBucket,
  EveSpaceObject2,
  EveVirtualCamera,
  Tr2CapsuleShapeAttributeGenerator,
  Tr2DynamicEmitter,
  Tr2ParticleElementDeclaration,
  Tr2ParticleSystem,
  Tr2RandomUniformAttributeGenerator,
  Tr2SphereShapeAttributeGenerator
} from "../../npm/dist/trinity/index.js";
import {
  EveSOFDataHullBanner,
  EveSOFDataHullBannerSetItem,
  EveSOFDataHullChildSet,
  EveSOFDataHullController
} from "../../npm/dist/sof/hull/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";

/** The class's property declaration for an exposed name. */
function Property(Constructor, name)
{
  const entry = CjsSchema.getSchema(Constructor).properties.find(value => value.name === name);
  assert.ok(entry, `${CjsSchema.getClassName(Constructor)}.${name} is a declared property`);
  return entry;
}

/** The class's stored-member declaration for an exposed name, or undefined. */
function Member(Constructor, name)
{
  return CjsSchema.getSchema(Constructor).members.find(value => value.name === name);
}

/** Asserts MAP_PROPERTY's READWRITE (no PERSIST) flags. */
function AssertReadWrite(Constructor, name)
{
  const entry = Property(Constructor, name);
  assert.equal(entry.key, name);
  assert.equal(entry.edit.read, true, `${name} is READ`);
  assert.equal(entry.edit.write, true, `${name} is WRITE`);
  assert.notEqual(entry.edit.persist, true, `${name} is MAP_PROPERTY, not MAP_PROPERTY_PERSISTED`);
}

/** Asserts MAP_PROPERTY_READONLY's READ flag and that assignment throws. */
function AssertReadOnly(instance, name)
{
  const entry = Property(instance.constructor, name);
  assert.equal(entry.edit.read, true, `${name} is READ`);
  assert.notEqual(entry.edit.write, true, `${name} has no setter`);
  assert.notEqual(entry.edit.persist, true, `${name} is not persisted`);
  assert.throws(() => { instance[name] = null; }, TypeError, `${name} has no setter`);
}

/** Asserts the same-name PERSISTONLY MAP_ATTRIBUTE backing member. */
function AssertPersistOnlyMember(Constructor, name)
{
  const member = Member(Constructor, name);
  assert.ok(member, `${name} keeps its backing member`);
  assert.equal(member.key, `_${name}`);
  assert.equal(member.edit.persistOnly, true);
  assert.notEqual(member.edit.read, true);
}

test("EveChildCloud2.lightmapDirty routes through IsLightmapDirty/MarkLightmapDirty (Blue.cpp:38)", t =>
{
  const cloud = new EveChildCloud2();
  const is = t.mock.method(cloud, "IsLightmapDirty");
  const mark = t.mock.method(cloud, "MarkLightmapDirty");

  assert.equal(cloud.lightmapDirty, true, "ctor default m_lightmapDirty (cpp:89)");
  assert.equal(is.mock.callCount(), 1);

  cloud.lightmapDirtyOffset = 7;
  cloud.lightmapDirty = false;
  assert.deepEqual(mark.mock.calls[0].arguments, [ false ]);
  assert.equal(cloud._lightmapDirty, false, "stored in m_lightmapDirty");
  assert.equal(cloud.lightmapDirtyOffset, 0, "MarkLightmapDirty zeroes the dirty offset (cpp:735-739)");

  AssertReadWrite(EveChildCloud2, "lightmapDirty");
  assert.equal(Member(EveChildCloud2, "lightmapDirty"), undefined, "no stored member under the exposed name");
});

test("EveChildContainer.isRendering/isUpdating are getters over IsRendering/IsUpdating (Blue.cpp:60-61)", t =>
{
  const container = new EveChildContainer();
  const rendering = t.mock.method(container, "IsRendering", () => true);
  const updating = t.mock.method(container, "IsUpdating", () => false);

  assert.equal(container.isRendering, true);
  assert.equal(container.isUpdating, false);
  assert.equal(rendering.mock.callCount(), 1);
  assert.equal(updating.mock.callCount(), 1);

  AssertReadOnly(container, "isRendering");
  AssertReadOnly(container, "isUpdating");
});

test("EveChildEffectPropagator.effect routes through SetEffect/GetEffect over a PERSISTONLY|NOTIFY m_effect (Blue.cpp:37-38)", t =>
{
  const propagator = new EveChildEffectPropagator();
  const effect = new EveChildInstanceContainer();
  const set = t.mock.method(propagator, "SetEffect");
  const get = t.mock.method(propagator, "GetEffect");

  propagator.effect = effect;
  assert.equal(set.mock.callCount(), 1);
  assert.equal(propagator._effect, effect, "stored in m_effect");
  assert.equal(effect.GetParent(), propagator, "SetEffect registers the child (cpp:647-658)");
  assert.equal(propagator.effect, effect);
  assert.equal(get.mock.callCount(), 1);

  propagator.effect = null;
  assert.equal(effect.GetParent(), null, "the replaced effect is unregistered");

  AssertReadWrite(EveChildEffectPropagator, "effect");
  AssertPersistOnlyMember(EveChildEffectPropagator, "effect");
  assert.equal(Member(EveChildEffectPropagator, "effect").edit.notify, true);
});

test("EveChildInstanceContainer.source routes through SetSource/GetSource over a PERSISTONLY m_source (Blue.cpp:58-59)", t =>
{
  const container = new EveChildInstanceContainer();
  const source = new EveChildContainer();
  const set = t.mock.method(container, "SetSource");
  const get = t.mock.method(container, "GetSource");

  container.source = source;
  assert.equal(set.mock.callCount(), 1);
  assert.equal(container._source, source, "stored in m_source");
  assert.equal(source.GetParent(), container, "SetSource registers the child (cpp:127-144)");
  assert.equal(container.source, source);
  assert.equal(get.mock.callCount(), 1);

  AssertReadWrite(EveChildInstanceContainer, "source");
  AssertPersistOnlyMember(EveChildInstanceContainer, "source");
});

test("EveChildTurret.firingEffect and targetObject route through Carbon's accessors (Blue.cpp:22, 42-43)", t =>
{
  const turret = new EveChildTurret();
  const setEffect = t.mock.method(turret, "SetFiringEffect", function (value) { this._firingEffect = value; });
  const getEffect = t.mock.method(turret, "GetFiringEffect");
  const effect = {};
  turret.firingEffect = effect;
  assert.equal(setEffect.mock.callCount(), 1);
  assert.equal(setEffect.mock.calls[0].arguments[0], effect);
  assert.equal(turret.firingEffect, effect);
  assert.equal(getEffect.mock.callCount(), 1);

  const target = {};
  const setTarget = t.mock.method(turret, "SetTargetObject", () => {});
  const getTarget = t.mock.method(turret, "GetTargetObject", () => target);
  turret.targetObject = target;
  assert.equal(setTarget.mock.calls[0].arguments[0], target);
  assert.equal(turret.targetObject, target);
  assert.equal(getTarget.mock.callCount(), 1);

  AssertReadWrite(EveChildTurret, "firingEffect");
  AssertReadWrite(EveChildTurret, "targetObject");
  const member = Member(EveChildTurret, "firingEffect");
  assert.equal(member.key, "_firingEffect", "HIDDEN m_firingEffect keeps the exposed name");
  assert.equal(member.edit.hidden, true);
});

test("EveSmartLightAttributeModifierExpressionBucket.expression compiles through SetExpression (Blue.cpp:20-21)", t =>
{
  const bucket = new EveSmartLightAttributeModifierExpressionBucket();
  const set = t.mock.method(bucket, "SetExpression");
  const get = t.mock.method(bucket, "GetExpression");

  bucket.expression = "time + 1";
  assert.deepEqual(set.mock.calls[0].arguments, [ "time + 1" ]);
  assert.equal(bucket._expression, "time + 1", "stored in m_expression");
  assert.notEqual(bucket._program, null, "the setter compiles the expression");
  assert.equal(bucket.expression, "time + 1");
  assert.equal(get.mock.callCount(), 1);

  AssertReadWrite(EveSmartLightAttributeModifierExpressionBucket, "expression");
  AssertPersistOnlyMember(EveSmartLightAttributeModifierExpressionBucket, "expression");
});

test("EveFiringEffectElementContainer.element and active route through Carbon's accessors (Blue.cpp:21-37)", t =>
{
  const container = new EveFiringEffectElementContainer();
  const element = { StartFiring() {}, StopFiring() {} };
  const setElement = t.mock.method(container, "SetElement");
  container.element = element;
  assert.equal(setElement.mock.callCount(), 1);
  assert.equal(container._element, element, "stored in m_element");
  assert.equal(container.element, element);

  const setActive = t.mock.method(container, "SetActive");
  const getActive = t.mock.method(container, "GetActive");
  container.active = true;
  assert.deepEqual(setActive.mock.calls[0].arguments, [ true ]);
  assert.equal(container.active, true, "SetActive started the element");
  assert.equal(getActive.mock.callCount(), 1);

  AssertReadWrite(EveFiringEffectElementContainer, "element");
  AssertReadWrite(EveFiringEffectElementContainer, "active");
  AssertPersistOnlyMember(EveFiringEffectElementContainer, "element");
});

test("EveMultiEffectParameter.isValid is a getter over IsValid (Blue.cpp:26)", t =>
{
  const parameter = new EveMultiEffectParameter();
  assert.equal(parameter.isValid, false, "no object bound");
  const valid = t.mock.method(parameter, "IsValid", () => true);
  assert.equal(parameter.isValid, true);
  assert.equal(valid.mock.callCount(), 1);
  AssertReadOnly(parameter, "isValid");
});

test("EveShip2.audioSpeedParameter routes through the private Get/SetAudioParameter (Blue.cpp:19)", t =>
{
  const ship = new EveShip2();
  const set = t.mock.method(ship, "_SetAudioParameter");
  const get = t.mock.method(ship, "_GetAudioParameter");
  const parameter = { value: 0 };

  ship.audioSpeedParameter = parameter;
  assert.equal(set.mock.calls[0].arguments[0], parameter);
  assert.equal(ship._audioSpeedParameter, parameter, "stored in m_audioSpeedParameter");
  assert.equal(ship.audioSpeedParameter, parameter);
  assert.equal(get.mock.callCount(), 1);
  AssertReadWrite(EveShip2, "audioSpeedParameter");
});

test("EveSpaceObject2.audioGeometry routes through the protected Get/SetAudioGeometry (Blue.cpp:327)", t =>
{
  const object = new EveSpaceObject2();
  const set = t.mock.method(object, "_SetAudioGeometry");
  const get = t.mock.method(object, "_GetAudioGeometry");
  const geometry = {};

  object.audioGeometry = geometry;
  assert.equal(set.mock.calls[0].arguments[0], geometry);
  assert.equal(object._audioGeometry, geometry, "stored in m_audioGeometry");
  assert.equal(object.audioGeometry, geometry);
  assert.equal(get.mock.callCount(), 1);
  AssertReadWrite(EveSpaceObject2, "audioGeometry");
});

test("EveDistributionPlacementGeneratorVolume.volume moves the change subscription through SetVolume (Blue.cpp:18-19)", t =>
{
  const generator = new EveDistributionPlacementGeneratorVolume();
  const calls = [];
  const volume = (name, id) => ({
    RegisterForChanges() { calls.push([ "register", name ]); return id; },
    UnregisterForChanges(token) { calls.push([ "unregister", name, token ]); }
  });
  const set = t.mock.method(generator, "SetVolume");
  const first = volume("first", 3);
  const second = volume("second", 4);

  generator.volume = first;
  generator.volume = second;
  assert.equal(set.mock.callCount(), 2);
  assert.deepEqual(calls, [ [ "register", "first" ], [ "unregister", "first", 3 ], [ "register", "second" ] ],
    "the old volume unsubscribes before the new one subscribes (cpp:26-31)");
  assert.equal(generator._volume, second, "stored in m_volume");
  assert.equal(generator.volume, second);

  AssertReadWrite(EveDistributionPlacementGeneratorVolume, "volume");
  AssertPersistOnlyMember(EveDistributionPlacementGeneratorVolume, "volume");
});

test("EveVirtualCamera.forward/right/up are getters over the direction methods (Blue.cpp:29-31)", t =>
{
  const camera = new EveVirtualCamera();
  camera.position.set([ 0, 0, 0 ]);
  camera.pointOfInterest.set([ 0, 0, -5 ]);
  assert.deepEqual(Array.from(camera.forward), Array.from(camera.GetViewDirection()));
  assert.deepEqual(Array.from(camera.right), Array.from(camera.GetRightDirection()));
  assert.deepEqual(Array.from(camera.up), Array.from(camera.GetUpDirection()));

  const view = t.mock.method(camera, "GetViewDirection");
  void camera.forward;
  assert.equal(view.mock.callCount(), 1);

  AssertReadOnly(camera, "forward");
  AssertReadOnly(camera, "right");
  AssertReadOnly(camera, "up");
});

test("particle generator and declaration name/dimension are getters over GetName/GetDimension", t =>
{
  const capsule = new Tr2CapsuleShapeAttributeGenerator();
  assert.equal(capsule.name, "POSITION + VELOCITY", "Carbon GetName (cpp:190-197)");
  capsule.controlVelocity = false;
  assert.equal(capsule.name, "POSITION");
  AssertReadOnly(capsule, "name");

  const sphere = new Tr2SphereShapeAttributeGenerator();
  assert.equal(sphere.name, "POSITION + VELOCITY");
  sphere.controlPosition = false;
  assert.equal(sphere.name, "VELOCITY", "Carbon GetName (cpp:195-213)");
  sphere.controlVelocity = false;
  assert.equal(sphere.name, "NONE");

  const uniform = new Tr2RandomUniformAttributeGenerator();
  uniform.customName = "glow";
  assert.equal(uniform.name, "glow");
  assert.equal(uniform.dimension, 0, "unbound generators report 0 (cpp:109-112)");
  const dimension = t.mock.method(uniform, "GetDimension", () => 4);
  assert.equal(uniform.dimension, 4);
  assert.equal(dimension.mock.callCount(), 1);
  AssertReadOnly(uniform, "name");
  AssertReadOnly(uniform, "dimension");

  const declaration = new Tr2ParticleElementDeclaration();
  declaration.customName = "custom";
  assert.equal(declaration.name, declaration.GetName());
  assert.equal(declaration.name, "custom");
  AssertReadOnly(declaration, "name");
});

test("SOF banner scaling/angleX/angleY route through Carbon's aspect-preserving setters (EveSOFData_Blue.cpp:672-678, 706-712)", t =>
{
  for (const Constructor of [ EveSOFDataHullBanner, EveSOFDataHullBannerSetItem ])
  {
    const banner = new Constructor();
    const setScaling = t.mock.method(banner, "SetScaling");
    banner.scaling = [ 2, 1, 1 ];
    assert.equal(setScaling.mock.callCount(), 1);
    assert.ok(Math.abs(banner._scaling[0] - 0.25) < 1e-6, "vertical banners keep their 0.25 target ratio");

    const copy = banner.scaling;
    copy[0] = 99;
    assert.ok(Math.abs(banner._scaling[0] - 0.25) < 1e-6, "GetScaling returns a copy");

    const setAngleX = t.mock.method(banner, "SetAngleX");
    banner.angleX = 0;
    assert.deepEqual(setAngleX.mock.calls[0].arguments, [ 0 ]);
    assert.equal(banner.angleX, 0);

    const setAngleY = t.mock.method(banner, "SetAngleY");
    banner.maintainAspectRatio = false;
    banner.angleY = 30;
    assert.deepEqual(setAngleY.mock.calls[0].arguments, [ 30 ]);
    assert.equal(banner._angleY, 30);
    assert.equal(banner.angleY, 30);

    for (const name of [ "scaling", "angleX", "angleY" ])
    {
      AssertReadWrite(Constructor, name);
      AssertPersistOnlyMember(Constructor, name);
    }
  }
});

test("SOF hull name rows are read-only getters over the derived GetName (EveSOFData_Blue.cpp:692-902)", () =>
{
  const controller = new EveSOFDataHullController();
  controller.path = "res:/fx/controllers/spin.red";
  assert.equal(controller.name, "spin");
  AssertReadOnly(controller, "name");

  const childSet = new EveSOFDataHullChildSet();
  assert.equal(childSet.name, "primary", "the visibility group (EveSOFData.cpp:500-503)");
  AssertReadOnly(childSet, "name");
});

test("Tr2ParticleSystem.maxParticleCount routes through the private GetMaxParticleCount and SetMaxParticleCount (Blue.cpp:97-118)", t =>
{
  const system = new Tr2ParticleSystem();
  const set = t.mock.method(system, "SetMaxParticleCount");
  const get = t.mock.method(system, "_GetMaxParticleCount");

  system.maxParticleCount = 6;
  assert.deepEqual(set.mock.calls[0].arguments, [ 6 ]);
  assert.equal(system._maxParticleCount, 6, "stored in m_maxParticleCount");
  assert.equal(system.maxParticleCount, 6);
  assert.equal(get.mock.callCount(), 1);

  const stride = t.mock.method(system, "GetGpuStride", () => 12);
  assert.equal(system.gpuStride, 12);
  assert.equal(stride.mock.callCount(), 1);

  AssertReadWrite(Tr2ParticleSystem, "maxParticleCount");
  AssertPersistOnlyMember(Tr2ParticleSystem, "maxParticleCount");
  AssertReadOnly(system, "gpuStride");
});

test("Tr2DynamicEmitter.emittedParticles is a getter over Carbon's GetEmittedParticleCount", t =>
{
  const emitter = new Tr2DynamicEmitter();
  assert.equal(emitter.emittedParticles, 0);
  const count = t.mock.method(emitter, "GetEmittedParticleCount", () => 5);
  assert.equal(emitter.emittedParticles, 5);
  assert.equal(count.mock.callCount(), 1);
  AssertReadOnly(emitter, "emittedParticles");
  // Tr2GpuParticleSystem's timer rows wait on their Get methods (GPU timing), so they stay unconverted.

});
