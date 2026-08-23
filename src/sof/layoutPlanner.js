import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { EveSOFDNA } from "./EveSOFDNA.js";


const RANDOM_INCLUCION = 0;
const PARENT_MATCH = 1;
const DEPLETION_COUNTER = 2;
const GRAPHIC_SETTING_MAP = 3;
const DEFAULT_SHADER_MODEL = 4;

/** Builds a detached, deterministic CPU plan for Carbon layout placement. */
export function planSofLayouts(dna, options = {})
{
  const diagnostics = [];
  const normalized = normalizeOptions(options, diagnostics);
  const plan = {
    schemaVersion: 1,
    dna: dna.GetDnaString(),
    options: {
      seedOverwrite: normalized.seedOverwrite,
      scrambleSeedOffset: normalized.scrambleSeedOffset,
      shaderModel: normalized.shaderModel,
      maxDepth: normalized.maxDepth,
      offsets: normalized.offsets.map(value => value.slice())
    },
    invocations: [],
    layouts: [],
    placements: [],
    skipped: [],
    diagnostics,
    finalRandomState: 0
  };
  const context = {
    ...normalized,
    plan,
    random: new SofLayoutRandom(normalized.initialRandomState),
    nextInvocationId: 0,
    nextPlacementId: 0
  };
  planDnaLayouts(dna, normalized.offsets, context, 0, null);
  plan.finalRandomState = context.random.state;
  return plan;
}

/**
 * Implements the deterministic integer pseudo-random sequence used by internal
 * SOF layout planning.
 */
class SofLayoutRandom
{
  /**
   * Initializes deterministic layout random state and draw accounting from the
   * supplied seed.
   */
  constructor(seed)
  {
    this.state = 0;
    this.drawCount = 0;
    this.srand(seed);
  }

  /**
   * Converts the supplied seed to unsigned 32-bit form and reduces it modulo
   * 714025 without changing the draw count.
   */
  srand(seed)
  {
    this.state = (Number(seed) >>> 0) % 714025;
  }

  /**
   * Advances the integer recurrence, increments the draw count, and emits its
   * Math.fround-normalized fraction.
   */
  next()
  {
    this.state = ((((this.state << 12) >>> 0) + 150889) >>> 0) % 714025;
    this.drawCount++;
    return Math.fround(this.state / 714025);
  }
}

function normalizeOptions(options, diagnostics)
{
  const requestedMaxDepth = Number(options.maxDepth ?? 16);
  const offsets = Array.isArray(options.offsets) && options.offsets.length
    ? options.offsets.map((value, index) => finiteVector(
      value,
      16,
      identityMatrix(),
      diagnostics,
      `options.offsets[${index}]`
    ))
    : [identityMatrix()];
  let shaderModel = Number(options.shaderModel);
  if (!Number.isInteger(shaderModel))
  {
    const quality = String(options.graphicsQuality ?? "").toLowerCase();
    shaderModel = quality === "low" ? 3 : quality === "high" ? 5 : DEFAULT_SHADER_MODEL;
  }
  if (shaderModel < 3 || shaderModel > 6)
  {
    diagnostics.push({ code: "invalid-shader-model", value: shaderModel, fallback: DEFAULT_SHADER_MODEL });
    shaderModel = DEFAULT_SHADER_MODEL;
  }
  return {
    seedOverwrite: Number(options.seedOverwrite ?? 0) >>> 0,
    scrambleSeedOffset: Number(options.scrambleSeedOffset ?? 0) >>> 0,
    initialRandomState: Number(options.initialRandomState ?? 1234) >>> 0,
    shaderModel,
    maxDepth: Number.isFinite(requestedMaxDepth) ? Math.max(0, Math.trunc(requestedMaxDepth)) : 16,
    offsets
  };
}

function planDnaLayouts(dna, offsets, context, depth, parentBatchKey)
{
  // Carbon has no recursion guard here. Keep the explicit limit: rejecting an
  // unsafe authored cycle is preferable to an unbounded build.
  if (depth > context.maxDepth)
  {
    context.plan.diagnostics.push({
      code: "layout-depth-limit",
      dna: dna.GetDnaString(),
      depth,
      parentBatchKey
    });
    return null;
  }

  const invocationId = context.nextInvocationId++;
  const invocation = {
    id: invocationId,
    dna: dna.GetDnaString(),
    depth,
    parentBatchKey,
    offsetCount: offsets.length,
    layoutKeys: []
  };
  context.plan.invocations.push(invocation);
  const managedLocatorSets = buildManagedLocatorSets(dna, context, invocationId);

  for (let layoutIndex = 0; layoutIndex < dna.GetLayoutCount(); layoutIndex++)
  {
    const layout = dna.GetLayoutData(layoutIndex);
    if (!layout) continue;
    const oldSeed = context.random.state;
    const sourceSeed = Number(layout.seed ?? 0) >>> 0;
    const effectiveSeed = (
      sourceSeed
      + context.seedOverwrite
      + (layout.scrambleSeed ? context.scrambleSeedOffset : 0)
    ) >>> 0;
    context.random.srand(effectiveSeed);
    const drawStart = context.random.drawCount;
    const layoutKey = `${invocationId}:${layoutIndex}`;
    const layoutPlan = {
      key: layoutKey,
      invocationId,
      index: layoutIndex,
      name: String(layout.name ?? ""),
      sourceSeed,
      effectiveSeed,
      randomStartState: context.random.state,
      randomEndState: context.random.state,
      restoredRandomState: null,
      randomDrawCount: 0,
      placementKeys: []
    };
    context.plan.layouts.push(layoutPlan);
    invocation.layoutKeys.push(layoutKey);

    for (let placementIndex = 0; placementIndex < (layout.placements?.length ?? 0); placementIndex++)
    {
      processPlacement(
        layout.placements[placementIndex],
        [placementIndex],
        layout,
        layoutPlan,
        dna,
        offsets,
        managedLocatorSets,
        context,
        depth
      );
    }

    layoutPlan.randomEndState = context.random.state;
    layoutPlan.randomDrawCount = context.random.drawCount - drawStart;
    if (layout.scrambleSeed)
    {
      context.random.srand((oldSeed + context.seedOverwrite) >>> 0);
      layoutPlan.restoredRandomState = context.random.state;
    }
  }
  return invocation;
}

function processPlacement(placement, path, layout, layoutPlan, dna, offsets, managedLocatorSets, context, depth)
{
  if (placement.isAGroup)
  {
    if (!placement.enabled)
    {
      skip(context, layoutPlan, path, placement, "disabled-group");
      return;
    }
    if (!conditionsPass(placement, path, layoutPlan, dna, context))
    {
      skip(context, layoutPlan, path, placement, "group-condition-failed");
      return;
    }
    for (let index = 0; index < (placement.placements?.length ?? 0); index++)
    {
      processPlacement(
        placement.placements[index],
        [...path, index],
        layout,
        layoutPlan,
        dna,
        offsets,
        managedLocatorSets,
        context,
        depth
      );
    }
    return;
  }

  if (!placement.enabled)
  {
    skip(context, layoutPlan, path, placement, "disabled-placement");
    return;
  }

  const locators = collectPlacementLocators(dna, placement.locatorSetName, managedLocatorSets, context, path);
  if (locators.length === 0)
  {
    skip(context, layoutPlan, path, placement, "no-locators");
    return;
  }
  if (!conditionsPass(placement, path, layoutPlan, dna, context))
  {
    skip(context, layoutPlan, path, placement, "placement-condition-failed");
    return;
  }
  if (placement.hasDistribution && !distributeLocators(
    placement.distribution,
    locators,
    managedLocatorSets.get(String(placement.locatorSetName ?? "")) ?? [],
    context,
    layoutPlan,
    path
  ))
  {
    skip(context, layoutPlan, path, placement, "invalid-distribution");
    return;
  }

  const extensionDna = new EveSOFDNA();
  extensionDna.Setup(layout.name, placement.descriptor, dna, dna.dataMgr);
  if (placement.isInstanced) extensionDna.DisableAnimation();
  if (!extensionDna.IsValid())
  {
    skip(context, layoutPlan, path, placement, "invalid-extension-dna");
    return;
  }
  if (locators.length === 0)
  {
    skip(context, layoutPlan, path, placement, "distribution-removed-all-locators");
    return;
  }

  const batches = placement.descriptor?.layout
    ? locators.map(locator => [locator])
    : [locators];
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++)
  {
    const batchKey = `${layoutPlan.key}:${path.join(".")}:${batchIndex}`;
    const transforms = [];
    let occurrenceIndex = 0;
    for (let offsetIndex = 0; offsetIndex < offsets.length; offsetIndex++)
    {
      for (let locatorIndex = 0; locatorIndex < batches[batchIndex].length; locatorIndex++)
      {
        const locator = batches[batchIndex][locatorIndex];
        const planned = createPlacementOccurrence(
          placement,
          locator,
          offsets[offsetIndex],
          context,
          layoutPlan,
          path,
          batchKey,
          occurrenceIndex++,
          offsetIndex,
          locatorIndex,
          extensionDna
        );
        context.plan.placements.push(planned);
        layoutPlan.placementKeys.push(planned.key);
        transforms.push(planned.transform.slice());
      }
    }
    if (extensionDna.GetLayoutCount() > 0)
    {
      // Carbon's nested SetupLayout call takes seedOverwrite's default zero.
      // JavaScript intentionally propagates the caller's deterministic option
      // through the complete nested plan.
      planDnaLayouts(extensionDna, transforms, context, depth + 1, batchKey);
    }
  }
}

function conditionsPass(placement, path, layoutPlan, dna, context)
{
  const conditions = Array.isArray(placement.placementConditions) ? placement.placementConditions : [];
  for (let index = 0; index < conditions.length; index++)
  {
    const condition = conditions[index];
    switch (Number(condition.distributionType))
    {
      case RANDOM_INCLUCION:
        if (!(Number(condition.triggerChance ?? 0) > context.random.next())) return false;
        break;
      case PARENT_MATCH:
      {
        const descriptor = condition.spaceObjectParentDescriptor ?? {};
        const ignored = ["hull", "pattern", "material1", "material2", "material3", "material4", "layout"]
          .filter(name => String(descriptor[name] ?? "") !== "");
        if (ignored.length)
        {
          context.plan.diagnostics.push({
            code: "parent-match-fields-not-implemented-in-carbon",
            layoutKey: layoutPlan.key,
            placementPath: path.slice(),
            conditionIndex: index,
            fields: ignored
          });
        }
        if (descriptor.faction && descriptor.faction !== dna.GetFactionName()) return false;
        if (descriptor.race && descriptor.race !== dna.GetRaceName()) return false;
        break;
      }
      case DEPLETION_COUNTER:
        context.plan.diagnostics.push({
          code: "depletion-condition-not-implemented-in-carbon",
          layoutKey: layoutPlan.key,
          placementPath: path.slice(),
          conditionIndex: index
        });
        break;
      case GRAPHIC_SETTING_MAP:
        if (!graphicsConditionPasses(Number(condition.displayModifier), context.shaderModel)) return false;
        break;
      default:
        context.plan.diagnostics.push({
          code: "unknown-distribution-condition",
          layoutKey: layoutPlan.key,
          placementPath: path.slice(),
          conditionIndex: index,
          distributionType: Number(condition.distributionType)
        });
        break;
    }
  }
  return true;
}

function graphicsConditionPasses(displayModifier, shaderModel)
{
  switch (displayModifier)
  {
    case 0: return shaderModel === 3;
    case 1: return shaderModel <= 4;
    case 2: return shaderModel === 4;
    case 3: return shaderModel >= 4;
    case 4: return shaderModel === 5;
    case 5: return true;
    case 6: return false;
    default: return false;
  }
}

function distributeLocators(distribution, locators, managed, context, layoutPlan, path)
{
  const completeness = Number(distribution?.completeness);
  const cap = Math.trunc(Number(distribution?.cap));
  if (!Number.isFinite(completeness) || completeness < 0 || completeness > 1 || !Number.isFinite(cap) || cap < 0)
  {
    // Carbon assumes valid distribution input. Reject unsafe values rather than
    // reproducing invalid counts or destructive locator removal.
    context.plan.diagnostics.push({
      code: "unsafe-layout-distribution",
      layoutKey: layoutPlan.key,
      placementPath: path.slice(),
      completeness,
      cap
    });
    return false;
  }
  const preCount = Math.fround(locators.length * Math.fround(1 - completeness));
  const remainder = preCount % 1;
  let count = Math.trunc(preCount) + Math.trunc(remainder + context.random.next());
  if (cap > 0) count = Math.max(count, locators.length - cap);

  if (count > 0)
  {
    // Carbon's std::sort comparators leave equal keys unspecified. sourceOrder
    // is the deliberate deterministic JavaScript tie-break, not a native-order
    // parity claim.
    const ranks = new Map(locators.map(locator => [locator.uniqueID, [0, 0, 0, 0]]));
    const bias = finiteVector(
      distribution.placementBias,
      3,
      [0, 0, 0],
      context.plan.diagnostics,
      `${layoutPlan.key}:${path.join(".")}:placementBias`
    );
    for (let axis = 0; axis < 3; axis++)
    {
      if (bias[axis] === 0) continue;
      locators.sort((a, b) => a.position[axis] - b.position[axis] || a.sourceOrder - b.sourceOrder);
      locators.forEach((locator, index) => { ranks.get(locator.uniqueID)[axis] = index; });
    }
    const centerBias = Number(distribution.centerBias ?? 0);
    if (centerBias !== 0)
    {
      locators.sort((a, b) => squaredLength(a.position) - squaredLength(b.position) || a.sourceOrder - b.sourceOrder);
      locators.forEach((locator, index) => { ranks.get(locator.uniqueID)[3] = index; });
    }
    const biasAmount = Math.hypot(...bias) + Math.abs(centerBias);
    const randomFactor = Math.max(1 - biasAmount, 0);
    for (const locator of locators)
    {
      const rank = ranks.get(locator.uniqueID);
      let power = -(rank[0] * bias[0] + rank[1] * bias[1] + rank[2] * bias[2]);
      power += locators.length * context.random.next() * randomFactor * 4;
      power += centerBias < 0
        ? (locators.length - rank[3]) * Math.abs(centerBias)
        : rank[3] * centerBias;
      rank[0] = Math.fround(power);
    }
    locators.sort((a, b) => ranks.get(a.uniqueID)[0] - ranks.get(b.uniqueID)[0] || a.sourceOrder - b.sourceOrder);
  }
  while (count-- > 0) locators.pop();

  const maxSteps = finiteVector(
    distribution.randomRotationMaxSteps,
    3,
    [0, 0, 0],
    context.plan.diagnostics,
    `${layoutPlan.key}:${path.join(".")}:randomRotationMaxSteps`
  );
  if (squaredLength(maxSteps) > 0)
  {
    const step = quaternionToYawPitchRoll(finiteVector(
      distribution.randomRotationStepSizeYPR,
      4,
      [0, 0, 0, 1],
      context.plan.diagnostics,
      `${layoutPlan.key}:${path.join(".")}:randomRotationStepSizeYPR`
    ));
    for (const locator of locators)
    {
      const yaw = step[0] * Math.floor(maxSteps[0] * context.random.next() + 0.5);
      const pitch = step[1] * Math.floor(maxSteps[1] * context.random.next() + 0.5);
      const roll = step[2] * Math.floor(maxSteps[2] * context.random.next() + 0.5);
      const randomRotation = quat.fromYawPitchRoll(quat.create(), yaw, pitch, roll);
      locator.rotation = Array.from(quat.multiply(quat.create(), randomRotation, locator.rotation));
    }
  }

  if (distribution.occupyLocators !== false)
  {
    for (const locator of locators)
    {
      const index = managed.findIndex(value => value.uniqueID === locator.uniqueID);
      if (index !== -1)
      {
        managed[index] = managed[managed.length - 1];
        managed.pop();
      }
    }
  }
  return true;
}

function createPlacementOccurrence(
  placement,
  locator,
  offset,
  context,
  layoutPlan,
  path,
  batchKey,
  occurrenceIndex,
  offsetIndex,
  locatorIndex,
  extensionDna
)
{
  const scaling = locator.scaling.slice();
  if (placement.hasDistribution)
  {
    const minimum = finiteVector(
      placement.distribution.randomScaleMin,
      3,
      [1, 1, 1],
      context.plan.diagnostics,
      `${layoutPlan.key}:${path.join(".")}:randomScaleMin`
    );
    const maximum = finiteVector(
      placement.distribution.randomScaleMax,
      3,
      [1, 1, 1],
      context.plan.diagnostics,
      `${layoutPlan.key}:${path.join(".")}:randomScaleMax`
    );
    if (placement.distribution.uniformScaling)
    {
      const amount = context.random.next();
      for (let axis = 0; axis < 3; axis++) scaling[axis] *= lerp(minimum[axis], maximum[axis], amount);
    }
    else
    {
      for (let axis = 0; axis < 3; axis++) scaling[axis] *= lerp(minimum[axis], maximum[axis], context.random.next());
    }
  }
  const rotation = Array.from(quat.normalize(quat.create(), locator.rotation));
  const placementOffset = finiteVector(
    placement.offset,
    3,
    [0, 0, 0],
    context.plan.diagnostics,
    `${layoutPlan.key}:${path.join(".")}:offset`
  );
  const transform = mat4.fromTranslation(mat4.create(), placementOffset);
  const locatorTransform = mat4.fromRotationTranslationScale(
    mat4.create(),
    rotation,
    locator.position,
    scaling
  );
  mat4.multiply(transform, locatorTransform, transform);
  mat4.multiply(transform, offset, transform);
  const id = context.nextPlacementId++;
  return {
    key: `${batchKey}:${occurrenceIndex}`,
    id,
    batchKey,
    layoutKey: layoutPlan.key,
    layoutIndex: layoutPlan.index,
    placementPath: path.slice(),
    name: String(placement.name ?? ""),
    locatorSetName: String(placement.locatorSetName ?? ""),
    descriptor: cloneDescriptor(placement.descriptor),
    dna: extensionDna.GetDnaString(),
    nestedLayoutNames: extensionDna.layoutData.map(value => value.name),
    isInstanced: placement.isInstanced === true,
    isShared: placement.isShared === true,
    extendsBoundingSphere: placement.extendsBoundingSphere !== false,
    extendsShieldEllipsoid: placement.extendsShieldEllipsoid !== false,
    buildFlags: placement.isInstanced ? 4 : 2,
    offsetIndex,
    locatorIndex,
    locator: {
      hullIndex: locator.hullIndex,
      uniqueID: locator.uniqueID,
      key: `${locator.hullIndex}:${locator.uniqueID}`,
      position: locator.position.slice(),
      rotation: locator.rotation.slice(),
      scaling: locator.scaling.slice(),
      boneIndex: locator.boneIndex
    },
    placementOffset,
    randomizedScaling: scaling,
    rotation,
    transform: Array.from(transform)
  };
}

function buildManagedLocatorSets(dna, context, invocationId)
{
  const result = new Map();
  let sourceOrder = 0;
  for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
  {
    for (const name of dna.GetHullLocatorSetNames(hullIndex))
    {
      const values = (dna.GetHullLocators(name, hullIndex) ?? []).map(value => ({
        uniqueID: Number(value.uniqueID ?? 0) | 0,
        sourceOrder: sourceOrder++
      }));
      if (!result.has(name)) result.set(name, values);
      else result.get(name).push(...values);
    }
  }
  if (sourceOrder === 0 && dna.GetLayoutCount() > 0)
  {
    context.plan.diagnostics.push({ code: "layout-invocation-has-no-locators", invocationId });
  }
  return result;
}

function collectPlacementLocators(dna, setName, managedLocatorSets, context, path)
{
  const result = [];
  const managed = managedLocatorSets.get(String(setName ?? "")) ?? [];
  const hullOffset = [0, 0, 0];
  let sourceOrder = 0;
  for (let hullIndex = 0; hullIndex < dna.GetMultiHullCount(); hullIndex++)
  {
    const values = (dna.GetPlacementLocators(hullIndex, setName) ?? [])
      .map(value => cloneLocator(value, hullIndex, hullOffset, sourceOrder++, context, path));
    for (let index = 0; index < values.length; index++)
    {
      if (managed.some(item => item.uniqueID === values[index].uniqueID)) continue;
      values[index] = values[values.length - 1];
      values.pop();
      index--;
    }
    result.push(...values);
    addVector(hullOffset, dna.GetHullNextSubsystemOffset(hullIndex));
  }
  return result;
}

function cloneLocator(value, hullIndex, hullOffset, sourceOrder, context, path)
{
  const position = finiteVector(
    value?.position,
    3,
    [0, 0, 0],
    context.plan.diagnostics,
    `locator:${path.join(".")}:position`
  );
  addVector(position, hullOffset);
  return {
    hullIndex,
    uniqueID: Number(value?.uniqueID ?? 0) | 0,
    position,
    rotation: finiteVector(
      value?.rotation,
      4,
      [0, 0, 0, 1],
      context.plan.diagnostics,
      `locator:${path.join(".")}:rotation`
    ),
    scaling: finiteVector(
      value?.scaling,
      3,
      [1, 1, 1],
      context.plan.diagnostics,
      `locator:${path.join(".")}:scaling`
    ),
    boneIndex: Number(value?.boneIndex ?? -1) | 0,
    sourceOrder
  };
}

function quaternionToYawPitchRoll(value)
{
  let y = 2 * (value[0] * value[3] - value[2] * value[1]);
  const w = Math.sqrt(Math.max(1 - y * y, 0));
  const gamma = Math.SQRT1_2 / Math.sqrt(w + 1);
  y = Math.max(-1, Math.min(1, y));
  const pitch = Math.asin(y);
  const qPitch = [y * gamma, 0, 0, (w + 1) * gamma];
  if (Math.abs(Math.abs(y) - 1) < 0.00001)
  {
    const combined = quat.multiply(quat.create(), quat.conjugate(quat.create(), qPitch), value);
    let roll = 2 * Math.acos(Math.max(-1, Math.min(1, combined[3])));
    if (roll > Math.PI) roll -= Math.PI * 2;
    if (combined[2] > 0) roll = -roll;
    return [0, pitch, -roll];
  }
  const denominator = 1 / (qPitch[0] * qPitch[0] - qPitch[3] * qPitch[3]);
  const yawRoll = [
    (value[3] * qPitch[0] - value[0] * qPitch[3]) * denominator,
    -(value[2] * qPitch[0] + value[1] * qPitch[3]) * denominator,
    -(value[2] * qPitch[3] + value[1] * qPitch[0]) * denominator,
    (value[0] * qPitch[0] - value[3] * qPitch[3]) * denominator
  ];
  const divisor = Math.sqrt(yawRoll[3] * yawRoll[3] + yawRoll[2] * yawRoll[2]);
  const rollGamma = divisor === 0 ? 0 : 1 / divisor;
  const rollConW = Math.max(-1, Math.min(1, yawRoll[3] * rollGamma));
  let roll = 2 * Math.acos(rollConW);
  if (roll > Math.PI) roll -= Math.PI * 2;
  if (yawRoll[2] < 0) roll = -roll;
  yawRoll[1] = (yawRoll[0] * yawRoll[2] + yawRoll[1] * yawRoll[3]) * rollGamma;
  yawRoll[3] = (yawRoll[2] * yawRoll[2] + yawRoll[3] * yawRoll[3]) * rollGamma;
  let yaw = Math.asin(Math.max(-1, Math.min(1, yawRoll[1])));
  if (yawRoll[3] < 0) yaw = Math.PI - yaw;
  if (yaw < 0) yaw += Math.PI;
  return [yaw * 2, pitch, roll];
}

function cloneDescriptor(value)
{
  return {
    hull: String(value?.hull ?? ""),
    faction: String(value?.faction ?? ""),
    race: String(value?.race ?? ""),
    pattern: String(value?.pattern ?? ""),
    material1: String(value?.material1 ?? ""),
    material2: String(value?.material2 ?? ""),
    material3: String(value?.material3 ?? ""),
    material4: String(value?.material4 ?? ""),
    layout: String(value?.layout ?? ""),
    seed: String(value?.seed ?? "")
  };
}

function skip(context, layoutPlan, path, placement, reason)
{
  context.plan.skipped.push({
    layoutKey: layoutPlan.key,
    placementPath: path.slice(),
    name: String(placement?.name ?? ""),
    reason
  });
}

function finiteVector(value, length, fallback, diagnostics, label)
{
  if (value && typeof value.length === "number" && value.length === length)
  {
    const result = Array.from(value, Number);
    if (result.every(Number.isFinite)) return result;
  }
  diagnostics.push({ code: "invalid-numeric-vector", field: label, fallback: fallback.slice() });
  return fallback.slice();
}

function addVector(target, value)
{
  if (!value) return;
  for (let index = 0; index < 3; index++) target[index] += Number(value[index] ?? 0);
}

function squaredLength(value)
{
  return value.reduce((total, component) => total + component * component, 0);
}

function lerp(from, to, amount)
{
  return from + (to - from) * amount;
}

function identityMatrix()
{
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}
