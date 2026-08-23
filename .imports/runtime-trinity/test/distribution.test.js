import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { EveBoxVolume } from "../npm/dist/eve/volume/EveBoxVolume.js";
import { EveEllipsoidVolume } from "../npm/dist/eve/volume/EveEllipsoidVolume.js";
import { EveSphereVolume } from "../npm/dist/eve/volume/EveSphereVolume.js";
import { EveChildUpdateParams } from "../npm/dist/eve/EveChildUpdateParams.js";
import { EveLocatorSets } from "../npm/dist/eve/locator/EveLocatorSets.js";
import { Locator } from "../npm/dist/eve/locator/Locator.js";
import { PlacementDataWithIdentifier } from "../npm/dist/eve/PlacementDataWithIdentifier.js";
import { EveSpaceObject2 } from "../npm/dist/eve/spaceObject/EveSpaceObject2.js";
import { EveBaseDistributionMethod } from "../npm/dist/eve/distribution/EveBaseDistributionMethod.js";
import { EveDistributionModifierProcessLifetime } from "../npm/dist/eve/distribution/attributeModifiers/EveDistributionModifierProcessLifetime.js";
import { EveDistributionModifierScaleBySpaceObjectParent } from "../npm/dist/eve/distribution/attributeModifiers/EveDistributionModifierScaleBySpaceObjectParent.js";
import { EveDistributionModifierTransformOffset } from "../npm/dist/eve/distribution/attributeModifiers/EveDistributionModifierTransformOffset.js";
import { EveDistributionPlacementGeneratorLocators } from "../npm/dist/eve/distribution/placement/EveDistributionPlacementGeneratorLocators.js";
import { EveDistributionPlacementGeneratorParentLocators } from "../npm/dist/eve/distribution/placement/EveDistributionPlacementGeneratorParentLocators.js";
import { EveDistributionPlacementGeneratorVolume } from "../npm/dist/eve/distribution/placement/EveDistributionPlacementGeneratorVolume.js";
import { EveDistributionSpawnModifierLifeTimeOffset } from "../npm/dist/eve/distribution/spawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.js";
import { EveDistributionSpawnModifierRandomOffset } from "../npm/dist/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomOffset.js";
import { EveDistributionSpawnModifierRandomRotation } from "../npm/dist/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomRotation.js";
import { EveDistributionSpawnModifierRandomScale } from "../npm/dist/eve/distribution/spawnModifiers/EveDistributionSpawnModifierRandomScale.js";
import { EveDistributionSpawnerBurst } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerBurst.js";
import { EveDistributionSpawnerControllerTrigger } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerControllerTrigger.js";
import { EveDistributionSpawnerInterval } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerInterval.js";
import { EveDistributionSpawnerTriggerPlane } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerTriggerPlane.js";
import { EveDistributionSpawnerTriggerSnake } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerTriggerSnake.js";
import { EveDistributionSpawnerTriggerSphere } from "../npm/dist/eve/distribution/spawners/EveDistributionSpawnerTriggerSphere.js";


test("locator distributions rebuild and consume Carbon placement pools", () =>
{
  const first = new Locator();
  first.position.set([10, 0, 0]);
  const second = new Locator();
  second.position.set([20, 0, 0]);

  assert.deepEqual(Array.from(first.scale), [1, 1, 1]);
  assert.equal(first.boneIndex, -1);

  const generator = new EveDistributionPlacementGeneratorLocators();
  generator.locators.push(first, second);

  const calls = [];
  const distribution = new EveBaseDistributionMethod();
  distribution.placementGenerators.push(generator);
  distribution.spawnModifiers.push({
    ProcessSpawnModifier(placement, count)
    {
      placement.initialTranslation[0] += 5;
      calls.push(["spawn", count]);
    }
  });
  distribution.lifetimeModifiers.push({
    AffectsTransform: () => false,
    ProcessDistributionModifier(placement, deltaTime)
    {
      calls.push(["lifetime", placement.initialPlacementID, deltaTime]);
      return 0;
    }
  });
  distribution.spawnTriggers.push({
    Reset: placements => calls.push(["reset", placements.length]),
    UpdateSyncronous: () => calls.push(["update"]),
    SetControllerVariable: (name, value) => calls.push(["variable", name, value])
  });

  assert.equal(distribution.Initialize(), true);
  assert.equal(distribution.GetFreePlacementCount(), 2);
  assert.equal(distribution.GetNumberOfPlacements(), 0);
  assert.equal(distribution.GetClosestFreePlacement([19, 0, 0]), 1);

  const originalRandom = Math.random;
  Math.random = () => 0;
  try
  {
    distribution.AddEntity();
  }
  finally
  {
    Math.random = originalRandom;
  }

  assert.equal(distribution.GetFreePlacementCount(), 1);
  assert.equal(distribution.entitiesSpawned, 1);
  assert.equal(distribution.GetNumberOfPlacements(), 1);
  assert.equal(distribution.placementData[0].uniqueID, 0);
  assert.equal(distribution.placementData[0].initialPlacementID, 0);
  assert.deepEqual(Array.from(distribution.placementData[0].initialTranslation), [15, 0, 0]);
  assert.equal(distribution.GetClosestFreePlacement([19, 0, 0]), 1);

  assert.equal(distribution.TriggerEntityByID(1), 0);
  assert.equal(distribution.GetFreePlacementCount(), 0);
  assert.equal(distribution.GetNumberOfPlacements(), 2);
  assert.deepEqual(Array.from(distribution.placementData[1].initialTranslation), [25, 0, 0]);
  assert.equal(distribution.TriggerEntityByID(1), -1);

  distribution.SetControllerVariable("Intensity", 0.5);
  assert.deepEqual(calls.at(-1), ["variable", "Intensity", 0.5]);
  assert.equal(distribution.GetInitialPlacementData(99), null);
  assert.equal(CjsSchema.getMethod(EveBaseDistributionMethod, "AddEntity")?.impl?.status, "implemented");
  assert.equal(CjsSchema.getMethod(EveBaseDistributionMethod, "RegeneratePlacementData")?.impl?.status, "adapted");
});

test("distribution updates release timed-out locators and recompute centers", () =>
{
  const locator = new Locator();
  locator.position.set([4, 5, 6]);
  const generator = new EveDistributionPlacementGeneratorLocators();
  generator.locators.push(locator);

  const distribution = new EveBaseDistributionMethod();
  distribution.timeOutOnTriggering = 1;
  distribution.placementGenerators.push(generator);
  distribution.Initialize();
  distribution.AddEntity();

  const context = { GetDeltaT: () => 2 };
  distribution.UpdateSyncronous(context);
  assert.deepEqual(Array.from(distribution.GetPlacementDataCenter()), [4, 5, 6]);
  assert.equal(distribution.GetFreePlacementCount(), 0);

  distribution.UpdateSyncronous(context);
  assert.equal(distribution.GetFreePlacementCount(), 1);

  generator.OnStructureListModified(0, null, 0, generator.locators);
  assert.equal(generator.IsRequestingRegeneration(), true);
  distribution.UpdateSyncronous(context);
  assert.equal(generator.IsRequestingRegeneration(), false);
  assert.equal(distribution.GetNumberOfPlacements(), 0);
  assert.equal(distribution.GetFreePlacementCount(), 1);
});

test("distribution spawn modifiers reproduce Carbon placement transforms", () =>
{
  const placement = new PlacementDataWithIdentifier();
  placement.uniqueID = 7;
  placement.initialPlacementID = 3;

  const offset = new EveDistributionSpawnModifierRandomOffset();
  offset.consistentRandom = true;
  offset.minOffset.set([1, 2, 3]);
  offset.maxOffset.set([1, 2, 3]);
  offset.ProcessSpawnModifier(placement, 1);
  assert.deepEqual(Array.from(placement.initialTranslation), [1, 2, 3]);

  const scale = new EveDistributionSpawnModifierRandomScale();
  scale.consistentRandom = true;
  scale.minScale.set([2, 3, 4]);
  scale.maxScale.set([2, 3, 4]);
  scale.ProcessSpawnModifier(placement, 1);
  assert.deepEqual(Array.from(placement.initialScale), [2, 3, 4]);

  const rotation = new EveDistributionSpawnModifierRandomRotation();
  rotation.consistentRandom = true;
  rotation.overrideRotation = true;
  rotation.minRotation.set([Math.PI, 0, 0]);
  rotation.maxRotation.set([Math.PI, 0, 0]);
  rotation.ProcessSpawnModifier(placement, 1);
  assert.ok(Math.abs(placement.initialRotation[1] - 1) < 1e-6);
  assert.ok(Math.abs(placement.initialRotation[3]) < 1e-6);

  const lifetime = new EveDistributionSpawnModifierLifeTimeOffset();
  lifetime.consistentRandom = true;
  lifetime.minOffset = 2;
  lifetime.maxOffset = 2;
  lifetime.cascadingLifetimeOffset = 0.5;
  lifetime.ProcessSpawnModifier(placement, 1);
  assert.equal(placement.lifeTime, 3.5);
});

test("distribution lifetime modifiers update Carbon transform and kill state", () =>
{
  const placement = new PlacementDataWithIdentifier();
  const transform = new EveDistributionModifierTransformOffset();
  transform.translation.set([1, 2, 3]);
  transform.scaling.set([2, 3, 4]);
  assert.equal(transform.AffectsTransform(), true);
  assert.equal(transform.ProcessDistributionModifier(placement, 0, {}), 0);
  assert.deepEqual(Array.from(placement.additionalTranslation), [1, 2, 3]);
  assert.deepEqual(Array.from(placement.additionalScale), [2, 3, 4]);

  const parentScale = new EveDistributionModifierScaleBySpaceObjectParent();
  const params = {
    spaceObjectParent: {
      GetBoundingSphere(out)
      {
        out.set([0, 0, 0, 2000]);
        return true;
      }
    }
  };
  parentScale.authoredForBoundingRadius = 1000;
  parentScale.scaleFactor = 1;
  assert.equal(parentScale.ProcessDistributionModifier(placement, 0, params), 0);
  assert.deepEqual(Array.from(placement.additionalScale), [4, 6, 8]);

  const lifetime = new EveDistributionModifierProcessLifetime();
  lifetime.lifetimeDuration = 2;
  placement.lifeTime = 3;
  assert.equal(lifetime.AffectsTransform(), false);
  assert.equal(
    lifetime.ProcessDistributionModifier(placement, 0, {}),
    EveDistributionModifierProcessLifetime.DistributionEntityLifeTimeEvent.KILL_ENTITY
  );
});


test("a lifetime replacement with no free placement produces Carbon's default record", () =>
{
  const locator = new Locator();
  locator.position.set([7, 8, 9]);
  const generator = new EveDistributionPlacementGeneratorLocators();
  generator.locators.push(locator);

  const distribution = new EveBaseDistributionMethod();
  distribution.placementGenerators.push(generator);
  distribution.Initialize();
  distribution.AddEntity();
  assert.equal(distribution.GetFreePlacementCount(), 0);

  let replace = true;
  distribution.lifetimeModifiers.push({
    AffectsTransform: () => false,
    ProcessDistributionModifier()
    {
      if (!replace)
      {
        return EveDistributionModifierProcessLifetime.DistributionEntityLifeTimeEvent.DO_NOTHING;
      }
      replace = false;
      return EveDistributionModifierProcessLifetime.DistributionEntityLifeTimeEvent.KILL_AND_SPAWN_NEW_FROM_DISTRIBUTION;
    }
  });

  distribution.UpdateSyncronous({ GetDeltaT: () => 1 });
  assert.equal(distribution.GetNumberOfPlacements(), 1);
  assert.equal(distribution.GetFreePlacementCount(), 0);
  assert.ok(distribution.placementData[0] instanceof PlacementDataWithIdentifier);
  assert.equal(distribution.placementData[0].uniqueID, 1);
  assert.equal(distribution.placementData[0].initialPlacementID, -1);
  assert.deepEqual(Array.from(distribution.placementData[0].initialTranslation), [0, 0, 0]);
});

test("burst and interval spawners drive Carbon distribution owners", () =>
{
  const generator = new EveDistributionPlacementGeneratorLocators();
  for (let i = 0; i < 4; i++)
  {
    const locator = new Locator();
    locator.position[0] = i;
    generator.locators.push(locator);
  }

  const burst = new EveDistributionSpawnerBurst();
  burst.completeness = 0.5;
  burst.additionalTriggersPerBurst = 1;
  const distribution = new EveBaseDistributionMethod();
  distribution.placementGenerators.push(generator);
  distribution.spawnTriggers.push(burst);
  distribution.Initialize();
  distribution.UpdateSyncronous({ GetDeltaT: () => 0 });
  assert.equal(distribution.GetNumberOfPlacements(), 3);
  distribution.UpdateSyncronous({ GetDeltaT: () => 10 });
  assert.equal(distribution.GetNumberOfPlacements(), 3);

  const additions = [];
  const interval = new EveDistributionSpawnerInterval();
  interval.useRandomStartOffset = false;
  interval.delayBetweenRepeats = 1;
  interval.numberOfRepeats = 2;
  interval.Restart();
  const owner = { AddEntities: count => additions.push(count) };
  interval.UpdateSyncronous({ GetDeltaT: () => 1 }, {}, owner);
  interval.UpdateSyncronous({ GetDeltaT: () => 0.1 }, {}, owner);
  interval.UpdateSyncronous({ GetDeltaT: () => 1.1 }, {}, owner);
  interval.UpdateSyncronous({ GetDeltaT: () => 10 }, {}, owner);
  assert.deepEqual(additions, [1, 1]);
});

test("controller trigger spawners gate and restart their Carbon children", () =>
{
  const calls = [];
  const child = {
    Restart: () => calls.push("restart"),
    UpdateSyncronous: () => calls.push("update")
  };
  const trigger = new EveDistributionSpawnerControllerTrigger();
  trigger.variableName = "Active";
  trigger.restartOnReceivingValue = true;
  trigger.spawners.push(child);

  trigger.UpdateSyncronous({}, {}, {});
  assert.deepEqual(calls, []);
  trigger.SetControllerVariable("Other", 1);
  assert.deepEqual(calls, []);
  trigger.SetControllerVariable("Active", 1);
  assert.equal(trigger.isActive, true);
  trigger.UpdateSyncronous({}, {}, {});
  assert.deepEqual(calls, ["restart", "update"]);

  trigger.invertTrigger = true;
  trigger.SetControllerVariable("Active", 1);
  assert.equal(trigger.isActive, false);
});

test("parent locator generators resolve and rebuild the Carbon locator-set contract", () =>
{
  const damage = new EveLocatorSets();
  damage.name = "damage";
  const first = new Locator();
  first.position.set([1, 2, 3]);
  damage.locators.push(first);

  const weapon = new EveLocatorSets();
  weapon.name = "weapon";
  const second = new Locator();
  second.position.set([4, 5, 6]);
  weapon.locators.push(second);

  const parent = new EveSpaceObject2();
  parent.locatorSets.push(damage, weapon);
  assert.equal(parent.GetLocatorsForSet("damage"), damage.locators);
  assert.equal(parent.GetLocatorsForSet("missing"), null);

  const generator = new EveDistributionPlacementGeneratorParentLocators();
  const distribution = new EveBaseDistributionMethod();
  distribution.placementGenerators.push(generator);
  distribution.Initialize();
  assert.equal(distribution.GetFreePlacementCount(), 0);

  const params = new EveChildUpdateParams();
  params.spaceObjectParent = parent;
  const context = { GetDeltaT: () => 0 };
  distribution.UpdateSyncronous(context, params);
  assert.equal(distribution.GetFreePlacementCount(), 1);
  assert.deepEqual(
    Array.from(distribution.GetInitialPlacementData(0).initialTranslation),
    [1, 2, 3]
  );

  generator.SetValues({ locatorSetName: "weapon" });
  distribution.UpdateSyncronous(context, params);
  assert.equal(distribution.GetFreePlacementCount(), 1);
  assert.deepEqual(
    Array.from(distribution.GetInitialPlacementData(0).initialTranslation),
    [4, 5, 6]
  );

  const third = new Locator();
  third.position.set([7, 8, 9]);
  weapon.locators.push(third);
  generator.OnStructureListModified(0, third, 1, weapon.locators);
  distribution.UpdateSyncronous(context, params);
  assert.equal(distribution.GetFreePlacementCount(), 2);
  assert.equal(
    CjsSchema.getMethod(EveDistributionPlacementGeneratorParentLocators, "GetInitialPlacements")?.impl?.status,
    "adapted"
  );
});

test("volume generators consume Carbon volume points and change callbacks", () =>
{
  const originalRandom = Math.random;
  Math.random = () => 0;
  try
  {
    const sphere = new EveSphereVolume();
    sphere.position.set([10, 20, 30]);
    sphere.radius = 3;
    sphere.innerRadius = 1;

    const generator = new EveDistributionPlacementGeneratorVolume();
    generator.volume = sphere;
    generator.numGenerated = 1;
    generator.hollowVolume = true;
    const placements = [];
    generator.GetInitialPlacements(placements, { value: 4 });

    assert.equal(placements.length, 1);
    assert.equal(placements[0].placement.uniqueID, 4);
    assert.deepEqual(Array.from(placements[0].placement.initialTranslation), [10, 20, 29]);
    assert.deepEqual(Array.from(placements[0].placement.initialScale), [1, 1, 1]);
    assert.equal(placements[0].placement.boneIndex, -1);
    const direction = vec3.transformQuat(
      vec3.create(),
      vec3.fromValues(0, 1, 0),
      placements[0].placement.initialRotation
    );
    assert.ok(vec3.distance(direction, vec3.fromValues(0, 0, -1)) < 1e-6);
    assert.equal(generator.IsRequestingRegeneration(), false);

    sphere.SetValues({ radius: 4 });
    assert.equal(generator.IsRequestingRegeneration(), true);
    generator.GetInitialPlacements([], { value: 0 });
    assert.equal(generator.IsRequestingRegeneration(), false);
    generator.SetValues({ falloffFactor: 2 });
    assert.equal(generator.IsRequestingRegeneration(), true);
  }
  finally
  {
    Math.random = originalRandom;
  }

  Math.random = () => 0.5;
  try
  {
    const ellipsoid = new EveEllipsoidVolume();
    ellipsoid.shape.set([2, 3, 4]);
    const ellipsoidPoints = [];
    ellipsoid.GeneratePointsInVolume(ellipsoidPoints, 2, true, 1);
    assert.equal(ellipsoidPoints.length, 2);
    assert.ok(Math.abs(ellipsoidPoints[0][0]) <= 2);
    assert.ok(Math.abs(ellipsoidPoints[0][1]) <= 3);
    assert.ok(Math.abs(ellipsoidPoints[0][2]) <= 4);

    const box = new EveBoxVolume();
    box.scaling.set([2, 4, 6]);
    const boxPoints = [];
    box.GeneratePointsInVolume(boxPoints, 1, true, 1);
    assert.deepEqual(Array.from(boxPoints[0]), [-0.5, 0, 0]);
  }
  finally
  {
    Math.random = originalRandom;
  }

  assert.equal(
    CjsSchema.getMethod(EveSphereVolume, "GeneratePointsInVolume")?.impl?.status,
    "adapted"
  );
  assert.equal(
    CjsSchema.getMethod(EveDistributionPlacementGeneratorVolume, "GetInitialPlacements")?.impl?.status,
    "adapted"
  );
});

test("sphere and plane trigger spawners follow Carbon sorted trigger progress", () =>
{
  const makePlacement = (uniqueID, position) =>
  {
    const placement = new PlacementDataWithIdentifier();
    placement.uniqueID = uniqueID;
    placement.initialTranslation.set(position);
    return { placement, timeOutDuration: 0 };
  };
  const spherePlacements = [
    makePlacement(10, [1, 0, 0]),
    makePlacement(20, [3, 0, 0]),
    makePlacement(30, [5, 0, 0])
  ];
  const planePlacements = [
    makePlacement(10, [0, 0, 0]),
    makePlacement(20, [0, 2, 0]),
    makePlacement(30, [0, 4, 0])
  ];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try
  {
    const sphereCalls = [];
    const sphere = new EveDistributionSpawnerTriggerSphere();
    sphere.playDuration = 10;
    sphere.delayBeforeActivation = 1;
    sphere.Reset(spherePlacements);
    const sphereOwner = { TriggerEntityByID: id => sphereCalls.push(id) };
    sphere.UpdateSyncronous({ GetDeltaT: () => 0.5 }, {}, sphereOwner);
    sphere.UpdateSyncronous({ GetDeltaT: () => 0.6 }, {}, sphereOwner);
    sphere.UpdateSyncronous({ GetDeltaT: () => 5 }, {}, sphereOwner);
    sphere.UpdateSyncronous({ GetDeltaT: () => 5 }, {}, sphereOwner);
    assert.deepEqual(sphereCalls, [10, 20, 30]);

    const planeCalls = [];
    const plane = new EveDistributionSpawnerTriggerPlane();
    plane.playDuration = 10;
    plane.reversePlaneAnimation = true;
    plane.Reset(planePlacements);
    const planeOwner = { TriggerEntityByID: id => planeCalls.push(id) };
    plane.UpdateSyncronous({ GetDeltaT: () => 1 }, {}, planeOwner);
    plane.UpdateSyncronous({ GetDeltaT: () => 5 }, {}, planeOwner);
    plane.UpdateSyncronous({ GetDeltaT: () => 5 }, {}, planeOwner);
    assert.deepEqual(planeCalls, [30, 20, 10]);
  }
  finally
  {
    Math.random = originalRandom;
  }

  assert.equal(
    CjsSchema.getMethod(EveDistributionSpawnerTriggerSphere, "UpdateSyncronous")?.impl?.status,
    "adapted"
  );
  assert.equal(
    CjsSchema.getMethod(EveDistributionSpawnerTriggerPlane, "UpdateSyncronous")?.impl?.status,
    "adapted"
  );
});

test("snake trigger spawners follow Carbon nearest-placement travel", () =>
{
  const makePlacement = (uniqueID, position) =>
  {
    const placement = new PlacementDataWithIdentifier();
    placement.uniqueID = uniqueID;
    placement.initialTranslation.set(position);
    return { placement, timeOutDuration: 0 };
  };
  const placements = [
    makePlacement(10, [0, 0, 0]),
    makePlacement(20, [10, 0, 0]),
    makePlacement(30, [20, 0, 0])
  ];
  const closest = [20, 30, -1];
  const calls = [];
  const owner = {
    TriggerEntityByID: id => calls.push(id),
    GetClosestFreePlacement: () => closest.shift() ?? -1,
    GetInitialPlacementData: id => placements.find(value => value.placement.uniqueID === id)?.placement ?? null
  };

  const originalRandom = Math.random;
  Math.random = () => 0;
  try
  {
    const snake = new EveDistributionSpawnerTriggerSnake();
    snake.totalDestinations = 1;
    snake.minBaseTimeBetweenTriggers = 1;
    snake.maxBaseTimeBetweenTriggers = 1;
    snake.distanceToTravelTimeMultiplier = 10;
    snake.Reset(placements);
    snake.UpdateSyncronous({ GetDeltaT: () => 0 }, {}, owner);
    assert.deepEqual(calls, [10]);
    assert.equal(snake.destinationsReached, 0);
    snake.UpdateSyncronous({ GetDeltaT: () => 1 }, {}, owner);
    assert.equal(snake.travelProgress, 0.5);
    snake.UpdateSyncronous({ GetDeltaT: () => 1 }, {}, owner);
    assert.deepEqual(calls, [10, 20]);
    assert.equal(snake.destinationsReached, 1);
    snake.UpdateSyncronous({ GetDeltaT: () => 100 }, {}, owner);
    assert.deepEqual(calls, [10, 20]);
  }
  finally
  {
    Math.random = originalRandom;
  }

  assert.equal(
    CjsSchema.getMethod(EveDistributionSpawnerTriggerSnake, "UpdateSyncronous")?.impl?.status,
    "adapted"
  );
});
