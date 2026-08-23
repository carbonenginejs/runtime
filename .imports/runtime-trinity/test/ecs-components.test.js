import test from "node:test";
import assert from "node:assert/strict";
import {
  EveChildCloud2,
  EveChildContainer,
  EveChildMesh,
  EveComponentRegistry,
  EveComponentRequiredMethods,
  EveComponentType,
  EveEntity,
  EveSpaceObject2,
  GetReflectionSetting,
  ReflectionMode,
  ReflectionSetting,
  SetReflectionSetting,
  ShouldReflect
} from "../npm/dist/index.js";


test("EveComponentType carries the nine Carbon component-name strings verbatim", () =>
{
  assert.equal(EveComponentType.ReflectionRenderable, "ReflectionRenderable");
  assert.equal(EveComponentType.VolumetricRenderable, "VolumetricRenderable");
  assert.equal(EveComponentType.MeshMorph, "MeshMorph");
  assert.equal(EveComponentType.PostProcessOwner, "PostProcessOwner");
  assert.equal(EveComponentType.InstancedMeshProvider, "InstancedMeshProvider");
  assert.equal(EveComponentType.LightOwner, "LightOwner");
  assert.equal(EveComponentType.FroxelFogSettings, "FroxelFogSettings");
  assert.equal(EveComponentType.ShadowCaster, "ShadowCaster");
  assert.equal(EveComponentType.EveLightingOverride, "EveLightingOverride");
  assert.equal(Object.keys(EveComponentType).length, 9);
  assert.ok(Object.isFrozen(EveComponentType));
  assert.ok(Object.isFrozen(EveComponentRequiredMethods));
  for (const name of Object.values(EveComponentType))
  {
    assert.ok(
      Array.isArray(EveComponentRequiredMethods[name]) && EveComponentRequiredMethods[name].length > 0,
      `required-method duck list exists for ${name}`
    );
  }
});

test("reflection setting defaults to HIGH (Carbon's REFLECT_NEVER==3 init quirk, EveSpaceScene.cpp:112)", () =>
{
  assert.equal(GetReflectionSetting(), ReflectionSetting.REFLECTION_SETTING_HIGH);
  // Carbon's shipped behavior: HIGH-mode entities reflect out of the box.
  assert.equal(ShouldReflect(ReflectionMode.REFLECT_HIGH), true);
});

test("ShouldReflect matches EveEntity.cpp:13-33 for every mode at every setting", () =>
{
  const S = ReflectionSetting;
  const M = ReflectionMode;
  // [setting][mode] -> expected (mode order: HIGH, MEDIUM_AND_HIGH, LOW_MEDIUM_HIGH, NEVER)
  const expected = [
    [S.REFLECTION_SETTING_OFF, false, false, false, false],
    [S.REFLECTION_SETTING_LOW, false, false, true, false],
    [S.REFLECTION_SETTING_MEDIUM, false, true, true, false],
    [S.REFLECTION_SETTING_HIGH, true, true, true, false],
    [S.REFLECTION_SETTING_ULTRA, true, true, true, false]
  ];
  try
  {
    for (const [setting, high, mediumAndHigh, lowMediumHigh, never] of expected)
    {
      SetReflectionSetting(setting);
      assert.equal(ShouldReflect(M.REFLECT_HIGH), high, `REFLECT_HIGH at setting ${setting}`);
      assert.equal(ShouldReflect(M.REFLECT_MEDIUM_AND_HIGH), mediumAndHigh, `REFLECT_MEDIUM_AND_HIGH at setting ${setting}`);
      assert.equal(ShouldReflect(M.REFLECT_LOW_MEDIUM_HIGH), lowMediumHigh, `REFLECT_LOW_MEDIUM_HIGH at setting ${setting}`);
      assert.equal(ShouldReflect(M.REFLECT_NEVER), never, `REFLECT_NEVER at setting ${setting}`);
      // Unknown modes fall through to Carbon's default: false.
      assert.equal(ShouldReflect(42), false, `unknown mode at setting ${setting}`);
    }
  }
  finally
  {
    SetReflectionSetting(ReflectionSetting.REFLECTION_SETTING_HIGH);
  }
});

test("RegisterComponent throws fail-closed when the entity misses the interface duck", () =>
{
  const registry = new EveComponentRegistry();

  // Missing everything.
  assert.throws(
    () => registry.RegisterComponent(EveComponentType.LightOwner, new EveEntity()),
    /LightOwner.*GetLights/
  );
  assert.throws(
    () => registry.RegisterComponent(EveComponentType.ShadowCaster, new EveEntity()),
    /ShadowCaster.*IsCastingShadow/
  );
  assert.equal(registry.ComponentCount(EveComponentType.LightOwner), 0, "failed registration adds nothing");

  // Partial surface still fails (ShadowCaster needs all three pure virtuals).
  const partial = new EveEntity();
  partial.IsCastingShadow = () => false;
  assert.throws(
    () => registry.RegisterComponent(EveComponentType.ShadowCaster, partial),
    /GetShadowBatches/
  );

  // Full duck registers.
  const lightOwner = new EveEntity();
  lightOwner.GetLights = () => {};
  assert.equal(registry.RegisterComponent(EveComponentType.LightOwner, lightOwner), true);
  assert.equal(registry.ComponentCount(EveComponentType.LightOwner), 1);
  assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(lightOwner));

  // Names outside the Carbon vocabulary carry no duck requirements.
  assert.equal(registry.RegisterComponent("CustomCollection", new EveEntity()), true);
});

test("EveSpaceObject2 leaf self-registration: castShadow gates ShadowCaster, display gates everything", () =>
{
  const registry = new EveComponentRegistry();
  const object = new EveSpaceObject2();
  object.castShadow = true;
  // Default reflectionMode is REFLECT_NEVER (3) and lights is empty.

  object.Register(registry);
  assert.ok(registry.GetComponents(EveComponentType.ShadowCaster).includes(object));
  assert.equal(registry.ComponentCount(EveComponentType.ReflectionRenderable), 0, "REFLECT_NEVER never reflects");
  assert.equal(registry.ComponentCount(EveComponentType.LightOwner), 0, "no authored lights");

  // ShouldReflect gate opens with a reflecting mode (setting is HIGH).
  object.reflectionMode = ReflectionMode.REFLECT_LOW_MEDIUM_HIGH;
  registry.ReRegister(object);
  assert.ok(registry.GetComponents(EveComponentType.ReflectionRenderable).includes(object));
  assert.ok(registry.GetComponents(EveComponentType.ShadowCaster).includes(object));

  // The display gate applies on the register side only.
  object.display = false;
  registry.ReRegister(object);
  assert.equal(registry.ComponentCount(EveComponentType.ShadowCaster), 0);
  assert.equal(registry.ComponentCount(EveComponentType.ReflectionRenderable), 0);
  assert.ok(object.IsInRegistry(), "the entity itself stays registered");
});

test("container forwarding chain: EveSpaceObject2 -> EveChildContainer.objects -> EveChildMesh", () =>
{
  const registry = new EveComponentRegistry();
  const object = new EveSpaceObject2();
  const container = new EveChildContainer();
  const mesh = new EveChildMesh();
  mesh.mesh = {};
  mesh.castShadow = true;
  mesh.reflectionMode = ReflectionMode.REFLECT_NEVER;
  object.effectChildren.push(container);
  container.objects.push(mesh);

  object.Register(registry);
  assert.ok(container.IsInRegistry(), "container forwarded via effectChildren");
  assert.ok(mesh.IsInRegistry(), "mesh forwarded via container objects");
  assert.ok(registry.GetComponents(EveComponentType.ShadowCaster).includes(mesh));
  assert.equal(registry.ComponentCount(EveComponentType.ReflectionRenderable), 0, "REFLECT_NEVER mesh does not reflect");

  // Un-registration unwinds the chain and clears the leaf components.
  object.UnRegister(registry);
  assert.equal(registry.ComponentCount(EveComponentType.ShadowCaster), 0);
  assert.equal(object.IsInRegistry(), false);
  assert.equal(container.IsInRegistry(), false);
  assert.equal(mesh.IsInRegistry(), false);

  // A hidden container does not forward its objects.
  container.display = false;
  object.Register(registry);
  assert.ok(container.IsInRegistry(), "container itself still enters the registry");
  assert.equal(mesh.IsInRegistry(), false, "hidden container forwards nothing");
  object.UnRegister(registry);
});

test("EveChildCloud2 registers VolumetricRenderable unconditionally and gates ReflectionRenderable", () =>
{
  const registry = new EveComponentRegistry();
  const cloud = new EveChildCloud2();
  // Defaults: display=false, reflectionEffect=null, reflectionMode=REFLECT_HIGH.

  cloud.Register(registry);
  assert.ok(
    registry.GetComponents(EveComponentType.VolumetricRenderable).includes(cloud),
    "VolumetricRenderable is unconditional (EveChildCloud2.cpp:157)"
  );
  assert.equal(registry.ComponentCount(EveComponentType.ReflectionRenderable), 0, "hidden cloud without reflection effect");

  cloud.display = true;
  cloud.reflectionEffect = {};
  cloud.ReRegister();
  assert.ok(registry.GetComponents(EveComponentType.VolumetricRenderable).includes(cloud));
  assert.ok(
    registry.GetComponents(EveComponentType.ReflectionRenderable).includes(cloud),
    "REFLECT_HIGH reflects under the default HIGH setting"
  );

  try
  {
    SetReflectionSetting(ReflectionSetting.REFLECTION_SETTING_OFF);
    cloud.ReRegister();
    assert.ok(registry.GetComponents(EveComponentType.VolumetricRenderable).includes(cloud));
    assert.equal(registry.ComponentCount(EveComponentType.ReflectionRenderable), 0, "OFF setting disables reflection");
  }
  finally
  {
    SetReflectionSetting(ReflectionSetting.REFLECTION_SETTING_HIGH);
  }
});
