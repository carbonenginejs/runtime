import { clonePlain } from "#utils/object";
import { normalizeResourceTransformPlan } from "./buildResourceTransformPlan.js";
import { compareUtf8 } from "../../../../format/compareUtf8.js";

export const WGSL_SET_VERSION = 3;

const KEY_PATTERN = /^(.*)\.pass([0-9]+)\.(vertex|pixel|compute)$/;
const KEY_STAGE = Object.freeze({ vertex: "vertex", pixel: "fragment", compute: "compute" });
const STAGE_TYPES = Object.freeze({ vertex: 0, pixel: 1, compute: 2 });
const STAGE_NAME_ORDER = Object.freeze([ "vertex", "pixel", "compute" ]);

const VISIBILITY_ORDER = Object.freeze([ "vertex", "fragment", "compute" ]);

function normalizeEntry(entry, index)
{
    const shader = entry?.shader;
    if (shader?.format !== "CJS_WGSL_SHADER" || shader.formatVersion !== 1
        || typeof shader.code !== "string" || !shader.code
        || typeof shader.entryPoint !== "string" || !shader.entryPoint
        || !Array.isArray(shader.sourceMap)
        || shader.program?.format !== "CJS_TYPED_SHADER")
    {
        throw new TypeError(`WGSL set entry ${index} requires a CJS_WGSL_SHADER descriptor`);
    }
    const key = typeof entry.key === "string" ? entry.key : "";
    const match = KEY_PATTERN.exec(key);
    if (!match || !match[1]) throw new Error(`WGSL set entry ${index} has malformed key ${key || "<empty>"}`);
    const techniqueName = match[1];
    const passIndex = Number(match[2]);
    const stageName = match[3];
    if (shader.stage !== KEY_STAGE[stageName])
    {
        throw new Error(`WGSL set key ${key} does not match shader stage ${shader.stage}`);
    }
    let threadGroupSize = null;
    if (stageName === "compute")
    {
        threadGroupSize = shader.threadGroupSize;
        if (!Array.isArray(threadGroupSize) || threadGroupSize.length !== 3
            || threadGroupSize.some((value) => !Number.isSafeInteger(value) || value < 1))
        {
            throw new Error(`WGSL compute shader ${key} requires a positive three-dimensional threadGroupSize`);
        }
    }
    else if (shader.threadGroupSize !== undefined && shader.threadGroupSize !== null)
    {
        throw new Error(`WGSL render shader ${key} cannot declare threadGroupSize`);
    }
    return {
        shader,
        stage: shader.stage,
        techniqueName,
        passIndex,
        stageName,
        stageType: STAGE_TYPES[stageName],
        ...(threadGroupSize ? { threadGroupSize: clonePlain(threadGroupSize) } : {}),
        key
    };
}

function portableBinding(binding, visibility)
{
    if (!Number.isInteger(binding.group) || binding.group < 0
        || !Number.isInteger(binding.binding) || binding.binding < 0
        || !Number.isInteger(binding.registerSpace) || binding.registerSpace < 0
        || !Number.isInteger(binding.registerIndex) || binding.registerIndex < 0
        || typeof binding.resourceKind !== "string" || !binding.resourceKind
        || typeof binding.generatedSymbol !== "string" || !binding.generatedSymbol
        || typeof binding.type !== "string" || !binding.type)
    {
        throw new Error(`WGSL binding ${binding.id || binding.generatedSymbol || "unknown"} has an invalid portable identity`);
    }
    const identity = `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
    if (binding.scopeIdentity !== undefined
        && (typeof binding.scopeIdentity !== "string" || !binding.scopeIdentity))
    {
        throw new Error(`WGSL binding ${binding.generatedSymbol} has invalid scope identity ${binding.scopeIdentity || "<empty>"}`);
    }
    const scopeIdentity = binding.scopeIdentity === undefined
        ? `${identity}@${visibility}`
        : binding.scopeIdentity;
    if (binding.identity !== undefined && binding.identity !== identity)
    {
        throw new Error(`WGSL binding ${binding.generatedSymbol} has inconsistent D3D identity ${binding.identity}`);
    }
    const hasTransform = binding.transformId !== undefined
        || binding.arrayLayerCount !== undefined;
    if (hasTransform
        && (binding.resourceKind !== "sampled-resource"
            || typeof binding.transformId !== "string" || !binding.transformId
            || !Number.isInteger(binding.arrayLayerCount) || binding.arrayLayerCount < 2
            || binding.type !== "texture_2d_array<f32>"
            || binding.texture?.viewDimension !== "2d-array"))
    {
        throw new Error(`WGSL binding ${binding.generatedSymbol} has invalid resource transform metadata`);
    }
    if (scopeIdentity !== identity && scopeIdentity !== `${identity}@${visibility}`)
    {
        throw new Error(`WGSL binding ${binding.generatedSymbol} has invalid scope identity ${scopeIdentity}`);
    }
    const descriptorKeys = [ "buffer", "texture", "sampler" ].filter((key) => binding[key]);
    const expectedDescriptors = {
        "uniform-buffer": [ "buffer" ],
        "sampled-resource": [ "buffer", "texture" ],
        "storage-resource": [ "buffer" ],
        sampler: [ "sampler" ]
    }[binding.resourceKind];
    if (!expectedDescriptors || descriptorKeys.length !== 1 || !expectedDescriptors.includes(descriptorKeys[0]))
    {
        throw new Error(`WGSL binding ${binding.generatedSymbol} has an invalid ${binding.resourceKind} layout descriptor`);
    }
    return {
        identity,
        scopeIdentity,
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerSpace: binding.registerSpace,
        registerIndex: binding.registerIndex,
        group: binding.group,
        binding: binding.binding,
        visibility: [ visibility ],
        type: binding.type,
        ...(hasTransform
            ? {
                transformId: binding.transformId,
                arrayLayerCount: binding.arrayLayerCount
            }
            : {}),
        ...(Number.isInteger(binding.structureStride) ? { structureStride: binding.structureStride } : {}),
        ...(binding.buffer ? { buffer: clonePlain(binding.buffer) } : {}),
        ...(binding.texture ? { texture: clonePlain(binding.texture) } : {}),
        ...(binding.sampler ? { sampler: clonePlain(binding.sampler) } : {})
    };
}

function bindingIdentity(binding)
{
    return binding.scopeIdentity || `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
}

function bindingFingerprint(binding)
{
    return JSON.stringify({
        resourceKind: binding.resourceKind,
        identity: binding.identity,
        scopeIdentity: binding.scopeIdentity,
        generatedSymbol: binding.generatedSymbol,
        registerSpace: binding.registerSpace,
        registerIndex: binding.registerIndex,
        group: binding.group,
        binding: binding.binding,
        type: binding.type,
        transformId: binding.transformId ?? null,
        arrayLayerCount: binding.arrayLayerCount ?? null,
        structureStride: binding.structureStride ?? null,
        buffer: binding.buffer || null,
        texture: binding.texture || null,
        sampler: binding.sampler || null
    });
}

function buildLayouts(entries)
{
    const passes = new Map();
    for (const entry of entries)
    {
        const passKey = `${entry.techniqueName}.pass${entry.passIndex}`;
        if (!passes.has(passKey))
        {
            passes.set(passKey, { identities: new Map(), baseScopes: new Map(), slots: new Map() });
        }
        const pass = passes.get(passKey);
        const symbols = new Map();
        const d3dIdentities = new Set();
        for (const source of entry.shader.program.bindings || [])
        {
            const binding = portableBinding(source, entry.stage);
            const identity = bindingIdentity(binding);
            if (d3dIdentities.has(binding.identity))
            {
                throw new Error(`WGSL shader ${entry.key} contains duplicate D3D identity ${binding.identity}`);
            }
            d3dIdentities.add(binding.identity);
            if (!pass.baseScopes.has(binding.identity)) pass.baseScopes.set(binding.identity, new Set());
            const baseScopes = pass.baseScopes.get(binding.identity);
            if ((identity === binding.identity && Array.from(baseScopes).some((scope) => scope !== binding.identity))
                || (identity !== binding.identity && baseScopes.has(binding.identity)))
            {
                throw new Error(`WGSL set ${passKey} mixes shared and stage-scoped forms for ${binding.identity}`);
            }
            baseScopes.add(identity);
            if (symbols.has(binding.generatedSymbol))
            {
                throw new Error(`WGSL shader ${entry.key} contains duplicate generated symbol ${binding.generatedSymbol}`);
            }
            symbols.set(binding.generatedSymbol, identity);
            const slot = `${binding.group}:${binding.binding}`;
            const existingSlot = pass.slots.get(slot);
            if (existingSlot && existingSlot !== identity)
            {
                throw new Error(`WGSL set ${passKey} assigns ${slot} to both ${existingSlot} and ${identity}`);
            }
            pass.slots.set(slot, identity);
            const existing = pass.identities.get(identity);
            if (!existing)
            {
                pass.identities.set(identity, binding);
                continue;
            }
            if (bindingFingerprint(existing) !== bindingFingerprint(binding))
            {
                throw new Error(`WGSL set ${passKey} has conflicting layouts for ${identity}`);
            }
            existing.visibility = Array.from(new Set([ ...existing.visibility, ...binding.visibility ]))
                .sort((left, right) => VISIBILITY_ORDER.indexOf(left) - VISIBILITY_ORDER.indexOf(right));
        }
    }
    return Array.from(passes, ([ key, pass ]) =>
    {
        for (const [ identity, scopes ] of pass.baseScopes)
        {
            if (scopes.has(identity) && pass.identities.get(identity)?.visibility.length < 2)
            {
                throw new Error(`WGSL set ${key} shared identity ${identity} does not cover multiple stages`);
            }
        }
        const groups = new Map();
        for (const binding of pass.identities.values())
        {
            if (!groups.has(binding.group)) groups.set(binding.group, []);
            groups.get(binding.group).push(binding);
        }
        return {
            key,
            techniqueName: key.slice(0, key.lastIndexOf(".pass")),
            passIndex: Number(/\.pass([0-9]+)$/.exec(key)?.[1]),
            bindGroups: Array.from(groups, ([ group, bindings ]) => ({
                group,
                bindings: bindings.sort((left, right) => left.binding - right.binding)
            })).sort((left, right) => left.group - right.group)
        };
    }).sort((left, right) =>
        compareUtf8(left.techniqueName, right.techniqueName)
        || left.passIndex - right.passIndex);
}

function validatePassTopologies(entries)
{
    const stagesByPass = new Map();
    for (const entry of entries)
    {
        const passKey = `${entry.techniqueName}.pass${entry.passIndex}`;
        if (!stagesByPass.has(passKey)) stagesByPass.set(passKey, []);
        stagesByPass.get(passKey).push(entry.stageName);
    }
    for (const [ passKey, stages ] of stagesByPass)
    {
        if (stages.includes("compute") && (stages.length !== 1 || stages[0] !== "compute"))
        {
            throw new Error(`WGSL set ${passKey} cannot mix compute and render shader stages`);
        }
    }
}

function buildResourceTransforms(entries, layouts)
{
    const raw = entries.flatMap((entry) => entry.shader.program.resourceTransforms || []);
    const transformedBindings = layouts.flatMap((layout) =>
        layout.bindGroups.flatMap((group) =>
            group.bindings.filter((binding) => binding.transformId)
                .map((binding) => ({ layoutKey: layout.key, binding }))));
    if (!raw.length)
    {
        if (transformedBindings.length)
        {
            throw new Error("WGSL set has transformed bindings without resource recipes");
        }
        return [];
    }
    const plan = normalizeResourceTransformPlan({
        format: "CJS_WGSL_RESOURCE_TRANSFORM_PLAN",
        formatVersion: 1,
        resourceTransforms: raw
    });
    const ids = new Set(plan.resourceTransforms.map((transform) => transform.id));
    for (const { binding } of transformedBindings)
    {
        if (!ids.has(binding.transformId))
        {
            throw new Error(`WGSL binding ${binding.generatedSymbol} references missing transform ${binding.transformId}`);
        }
    }
    for (const transform of plan.resourceTransforms)
    {
        const stageKey = `${transform.layoutKey}.pixel`;
        if (!entries.some((entry) => entry.key === stageKey))
        {
            throw new Error(`WGSL resource transform ${transform.id} has no fragment shader ${stageKey}`);
        }
        const links = transformedBindings.filter(({ layoutKey, binding }) =>
            layoutKey === transform.layoutKey
            && binding.transformId === transform.id);
        if (links.length !== 1)
        {
            throw new Error(`WGSL resource transform ${transform.id} must link exactly one physical binding`);
        }
        const binding = links[0].binding;
        if (binding.identity !== transform.output.identity
            || binding.scopeIdentity !== transform.output.scopeIdentity
            || binding.texture?.viewDimension !== transform.output.viewDimension
            || binding.arrayLayerCount !== transform.output.layerCount)
        {
            throw new Error(`WGSL resource transform ${transform.id} does not match its physical binding`);
        }
        const transformLayout = layouts.find((layout) =>
            layout.key === transform.layoutKey);
        const physicalScopes = new Set((transformLayout?.bindGroups || []).flatMap((group) =>
            group.bindings.map((entry) => entry.scopeIdentity)));
        for (const input of transform.inputs.slice(1))
        {
            if (physicalScopes.has(input.scopeIdentity))
            {
                throw new Error(`WGSL resource transform ${transform.id} retains removed input ${input.scopeIdentity}`);
            }
        }
    }
    return plan.resourceTransforms;
}

/**
 * Builds the portable JSON document stored in a Carbon WebGPU `WGSL` chunk.
 * Existing numeric bindings are validated and never reassigned.
 *
 * @param {Array<object>} input Wrapped emitted shader descriptors.
 * @returns {object} Frozen CJS_WGSL_SET document.
 */
export function buildWgslSet(input)
{
    if (!Array.isArray(input) || !input.length) throw new TypeError("BuildWgslSet expects a non-empty shader entry array");
    const entries = input.map(normalizeEntry);
    const keys = new Set();
    const shaders = entries.map((entry) =>
    {
        if (keys.has(entry.key)) throw new Error(`WGSL set contains duplicate shader key ${entry.key}`);
        keys.add(entry.key);
        return {
            key: entry.key,
            techniqueName: entry.techniqueName,
            passIndex: entry.passIndex,
            stageName: entry.stageName,
            stage: entry.stage,
            stageType: entry.stageType,
            entryPoint: entry.shader.entryPoint,
            code: entry.shader.code,
            sourceMap: clonePlain(entry.shader.sourceMap || []),
            ...(entry.threadGroupSize ? { threadGroupSize: clonePlain(entry.threadGroupSize) } : {})
        };
    }).sort((left, right) =>
        compareUtf8(left.techniqueName, right.techniqueName)
        || left.passIndex - right.passIndex
        || STAGE_NAME_ORDER.indexOf(left.stageName) - STAGE_NAME_ORDER.indexOf(right.stageName));
    validatePassTopologies(entries);
    const layouts = buildLayouts(entries);
    const resourceTransforms = buildResourceTransforms(entries, layouts);
    return {
        format: "CJS_WGSL_SET",
        formatVersion: WGSL_SET_VERSION,
        shaders,
        layouts,
        ...(resourceTransforms.length ? { resourceTransforms } : {})
    };
}
