import { cloneJson, deepFreeze } from "./freeze.js";

const REQUIRED_IDENTITIES = Object.freeze(new Map([
  [ "uniform-buffer:0:0", "buffer" ],
  [ "sampled-resource:0:0", "texture" ],
  [ "sampler:0:0", "sampler" ]
]));
const COPYBLIT_BLEND_STATES = Object.freeze(new Map([
  [ 19, 2 ],
  [ 20, 1 ],
  [ 27, 1 ],
  [ 171, 1 ],
  [ 206, 1 ],
  [ 207, 2 ],
  [ 208, 1 ],
  [ 209, 1 ]
]));

function fail(message)
{
  throw new Error(`Carbon WebGPU copyblit draw: ${message}`);
}

function shaderFor(pipeline, stageName)
{
  const matches = pipeline.shaderModules.filter((entry) => entry?.stageName === stageName);
  if (matches.length !== 1) fail(`requires exactly one ${stageName} shader module`);
  const shader = matches[0];
  if (typeof shader.wgsl !== "string" || !shader.wgsl) fail(`${stageName} shader has no WGSL`);
  if (typeof shader.entryPoint !== "string" || !shader.entryPoint) fail(`${stageName} shader has no entry point`);
  return {
    key: String(shader.key || ""),
    stage: stageName === "pixel" ? "fragment" : "vertex",
    entryPoint: shader.entryPoint,
    code: shader.wgsl,
    sourceMap: cloneJson(shader.sourceMap || [])
  };
}

function layoutKind(binding, identity)
{
  const layout = binding.layout;
  if (!layout || typeof layout !== "object") fail(`${identity} has no canonical layout`);
  const present = [ "buffer", "texture", "sampler" ].filter((key) => layout[key]);
  const expected = REQUIRED_IDENTITIES.get(identity);
  if (present.length !== 1 || present[0] !== expected) fail(`${identity} has an unsupported layout kind`);

  if (expected === "buffer")
  {
    if (layout.buffer.type !== "uniform" || layout.buffer.hasDynamicOffset !== false
      || layout.buffer.minBindingSize !== 48)
    {
      fail(`${identity} requires an exact non-dynamic 48-byte uniform buffer`);
    }
  }
  else if (expected === "texture"
    && (layout.texture.sampleType !== "float" || layout.texture.viewDimension !== "2d"
      || layout.texture.multisampled !== false))
  {
    fail(`${identity} requires a non-multisampled float 2d texture`);
  }
  else if (expected === "sampler" && layout.sampler.type !== "filtering")
  {
    fail(`${identity} requires a filtering sampler`);
  }
  return expected;
}

function normalizeBinding(binding, group, slots, identities)
{
  if (binding?.sourceTruth !== "wgsl-layout") fail("all bindings must come from the WGSL layout");
  if (binding.group !== group || !Number.isInteger(binding.binding) || binding.binding < 0)
  {
    fail(`group ${group} has an invalid binding slot`);
  }
  const slot = `${group}:${binding.binding}`;
  if (slots.has(slot)) fail(`duplicates binding slot ${slot}`);
  slots.add(slot);

  const identity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
  if (!REQUIRED_IDENTITIES.has(identity)) fail(`has unsupported fixture identity ${identity}`);
  if (identities.has(identity)) fail(`duplicates fixture identity ${identity}`);
  identities.add(identity);
  if (binding.dynamic) fail(`${identity} cannot use dynamic offsets`);

  const visibility = Array.isArray(binding.visibility) ? Array.from(new Set(binding.visibility)) : [];
  if (visibility.length !== 1 || visibility[0] !== "fragment")
  {
    fail(`${identity} requires fragment-only shader visibility`);
  }
  const kind = layoutKind(binding, identity);
  return {
    binding: binding.binding,
    identity,
    resourceKind: binding.resourceKind,
    visibility,
    layout: { [kind]: cloneJson(binding.layout[kind]) }
  };
}

function translateBlend(pipeline)
{
  const states = Array.isArray(pipeline.states) ? pipeline.states : [];
  if (pipeline.renderStates === 0 && states.length === 0) return null;
  if (!Number.isInteger(pipeline.renderStates) || pipeline.renderStates < 1
    || states.length !== COPYBLIT_BLEND_STATES.size)
  {
    fail("has unsupported render states");
  }
  const seen = new Set();
  for (const entry of states)
  {
    if (!COPYBLIT_BLEND_STATES.has(entry?.state)
      || COPYBLIT_BLEND_STATES.get(entry.state) !== entry.value
      || seen.has(entry.state))
    {
      fail(`has unsupported render state ${entry?.state}:${entry?.value}`);
    }
    seen.add(entry.state);
  }
  return {
    color: { operation: "add", srcFactor: "one", dstFactor: "zero" },
    alpha: { operation: "add", srcFactor: "one", dstFactor: "zero" }
  };
}

/**
 * Validate and normalize the bounded package-driven copyblit draw contract.
 * The result is browser-safe JSON; numeric slots are preserved verbatim.
 *
 * @param {object} pipeline CjsWebgpuPipeline.ToJSON() output.
 * @returns {object} Frozen package draw descriptor.
 */
export function buildCopyblitDrawDescriptor(pipeline)
{
  if (!pipeline || typeof pipeline !== "object") throw new TypeError("Carbon WebGPU copyblit draw requires a pipeline descriptor");
  if (!Array.isArray(pipeline.shaderModules) || pipeline.shaderModules.length !== 2)
  {
    fail("requires exactly vertex and pixel shader modules");
  }

  const slots = new Set();
  const identities = new Set();
  const groups = Array.isArray(pipeline.bindGroups) ? pipeline.bindGroups.slice() : [];
  if (groups.length !== 1) fail("requires exactly bind group 0");
  groups.sort((left, right) => left.group - right.group);
  const bindGroups = groups.map((group, index) =>
  {
    if (group?.group !== index) fail("bind groups must be contiguous from group 0");
    const bindings = Array.isArray(group.bindings) ? group.bindings : [];
    return {
      group: group.group,
      bindings: bindings.map((binding) => normalizeBinding(binding, group.group, slots, identities))
        .sort((left, right) => left.binding - right.binding)
    };
  });
  for (const identity of REQUIRED_IDENTITIES.keys())
  {
    if (!identities.has(identity)) fail(`is missing fixture identity ${identity}`);
  }
  if (identities.size !== REQUIRED_IDENTITIES.size) fail("contains unexpected fixture resources");

  return deepFreeze({
    key: String(pipeline.key || ""),
    techniqueName: String(pipeline.techniqueName || ""),
    passIndex: Number.isInteger(pipeline.passIndex) ? pipeline.passIndex : 0,
    blend: translateBlend(pipeline),
    shaders: [ shaderFor(pipeline, "vertex"), shaderFor(pipeline, "pixel") ],
    bindGroups
  });
}
