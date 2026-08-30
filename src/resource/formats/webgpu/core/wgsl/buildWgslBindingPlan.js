import { lowerBindingLayout } from "./lowerBindingLayout.js";
import { normalizeResourceTransformPlan } from "./buildResourceTransformPlan.js";
import { compareUtf8 } from "../../../../format/compareUtf8.js";
import {
    particleClearSignedAtomicLayoutPolicy
} from "./lowerParticleClearComputePrograms.js";
import {
    particleEmitSignedAtomicLayoutPolicy
} from "./lowerParticleEmitComputeProgram.js";

const KIND_ORDER = Object.freeze({
    "uniform-buffer": 0,
    "sampled-resource": 1,
    sampler: 2,
    "storage-resource": 3
});

const STAGE_VISIBILITY = Object.freeze({ vertex: "vertex", pixel: "fragment", compute: "compute" });
const STAGE_ORDER = Object.freeze({ vertex: 0, fragment: 1, compute: 2 });
const IDENTITY_PATTERN = /^(uniform-buffer|sampled-resource|sampler|storage-resource):\d+:\d+$/u;

function identity(binding)
{
    return `${binding.resourceKind}:${binding.registerSpace}:${binding.registerIndex}`;
}

function portableBinding(binding)
{
    const d3dIdentity = identity(binding);
    return {
        identity: d3dIdentity,
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerSpace: binding.registerSpace,
        registerIndex: binding.registerIndex,
        type: binding.type,
        ...(typeof binding.transformId === "string"
            ? {
                transformId: binding.transformId,
                arrayLayerCount: binding.arrayLayerCount
            }
            : {}),
        ...(Number.isInteger(binding.structureStride) ? { structureStride: binding.structureStride } : {}),
        ...(binding.buffer ? { buffer: binding.buffer } : {}),
        ...(binding.texture ? { texture: binding.texture } : {}),
        ...(binding.sampler ? { sampler: binding.sampler } : {})
    };
}

function fingerprint(binding)
{
    return JSON.stringify(binding);
}

/**
 * Builds one deterministic numeric binding plan for all shader stages in a
 * pass. Unshared D3D tuples remain stage-scoped unless the caller explicitly
 * confirms that compatible declarations describe one shared resource.
 *
 * @param {object[]} programs Complete CJS shader IR stage set for one effect pass.
 * @param {object} [options] Explicit pass-level identity policy.
 * @param {string[]} [options.sharedIdentities] D3D identities confirmed by
 * pass metadata/CjsLibrary to represent one resource across stages.
 * @param {object|null} [options.effectProfileProof] Opaque exact-effect proof.
 * @returns {object} Frozen pass-global binding plan.
 */
export function buildWgslBindingPlan(programs, options = {})
{
    if (!Array.isArray(programs) || !programs.length)
    {
        throw new TypeError("BuildWgslBindingPlan expects at least one CJS shader IR program");
    }
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
        throw new TypeError("BuildWgslBindingPlan options must be an object");
    }
    const requestedShared = options.sharedIdentities === undefined ? [] : options.sharedIdentities;
    if (!Array.isArray(requestedShared)
        || requestedShared.some((entry) => typeof entry !== "string" || !IDENTITY_PATTERN.test(entry))
        || new Set(requestedShared).size !== requestedShared.length)
    {
        throw new TypeError("BuildWgslBindingPlan sharedIdentities must contain unique D3D resource identities");
    }
    const sharedIdentities = new Set(requestedShared);
    const resourceTransformPlan = normalizeResourceTransformPlan(
        options.resourceTransformPlan
    );
    const identities = new Map();
    const programStages = new Set();
    for (const [ index, program ] of programs.entries())
    {
        if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1)
        {
            throw new TypeError(`BuildWgslBindingPlan program ${index} is not CJS_SHADER_IR version 1`);
        }
        const stage = STAGE_VISIBILITY[program.stage];
        if (!stage)
        {
            throw new Error(`BuildWgslBindingPlan program ${index} has unsupported stage ${program.stage || "unknown"}`);
        }
        if (programStages.has(stage))
        {
            throw new Error(`BuildWgslBindingPlan contains multiple ${stage} programs for one pass`);
        }
        programStages.add(stage);
        const layoutPolicy = particleClearSignedAtomicLayoutPolicy(
            program,
            options.effectProfileProof ?? null
        ) ?? particleEmitSignedAtomicLayoutPolicy(program);
        for (const binding of lowerBindingLayout(
            program,
            null,
            layoutPolicy,
            resourceTransformPlan
        ))
        {
            const key = identity(binding);
            const entry = portableBinding(binding);
            if (!identities.has(key)) identities.set(key, []);
            identities.get(key).push({ binding: entry, stage });
        }
    }
    if (programStages.has("compute") && programStages.size !== 1)
    {
        throw new Error("BuildWgslBindingPlan cannot mix compute and render programs in one pass");
    }

    const bindings = [];
    for (const [ key, occurrences ] of identities)
    {
        const stages = occurrences.map((entry) => entry.stage)
            .sort((left, right) => STAGE_ORDER[left] - STAGE_ORDER[right]);
        if (sharedIdentities.has(key))
        {
            if (occurrences.length < 2)
            {
                throw new Error(`WGSL shared identity ${key} does not occur in multiple stages`);
            }
            const expected = fingerprint(occurrences[0].binding);
            if (occurrences.some((entry) => fingerprint(entry.binding) !== expected))
            {
                throw new Error(`WGSL shared identity ${key} has incompatible stage declarations`);
            }
            bindings.push({ ...occurrences[0].binding, scopeIdentity: key, stages });
            continue;
        }
        for (const occurrence of occurrences)
        {
            bindings.push({
                ...occurrence.binding,
                scopeIdentity: `${key}@${occurrence.stage}`,
                stages: [ occurrence.stage ]
            });
        }
    }
    for (const key of sharedIdentities)
    {
        if (!identities.has(key)) throw new Error(`WGSL shared identity ${key} does not occur in the pass`);
    }

    bindings.sort((left, right) =>
        left.registerSpace - right.registerSpace
        || (KIND_ORDER[left.resourceKind] ?? 99) - (KIND_ORDER[right.resourceKind] ?? 99)
        || left.registerIndex - right.registerIndex
        || (STAGE_ORDER[left.stages[0]] ?? 99) - (STAGE_ORDER[right.stages[0]] ?? 99)
        || compareUtf8(left.generatedSymbol, right.generatedSymbol)
        || compareUtf8(left.scopeIdentity, right.scopeIdentity));
    const plannedBindings = bindings
        .map((binding, bindingIndex) => ({ ...binding, group: 0, binding: bindingIndex }));

    // WebGPU pipeline creation requires the vertex output and fragment input
    // interpolation attributes at one location to MATCH, and interpolation is
    // declared only on the fragment side in DXBC (dcl_input_ps). Record the
    // non-default modes here so the vertex module can mirror them.
    const varyingInterpolation = {};
    for (const program of programs)
    {
        if (program.stage !== "pixel") continue;
        for (const declaration of program.declarations || [])
        {
            if (declaration.opcodeName !== "dcl_input_ps") continue;
            if (declaration.data?.interpolationModeName === "linear_noperspective")
            {
                varyingInterpolation[declaration.data.registerIndex] = "linear";
            }
        }
    }

    return {
        format: "CJS_WGSL_BINDING_PLAN",
        formatVersion: resourceTransformPlan ? 3 : 2,
        ...(sharedIdentities.size ? { sharedIdentities: Object.freeze([ ...sharedIdentities ].sort()) } : {}),
        ...(Object.keys(varyingInterpolation).length ? { varyingInterpolation } : {}),
        ...(resourceTransformPlan
            ? { resourceTransforms: resourceTransformPlan.resourceTransforms }
            : {}),
        bindings: plannedBindings
    };
}
