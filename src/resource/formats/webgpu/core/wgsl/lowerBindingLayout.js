import { normalizeResourceTransformPlan } from "./buildResourceTransformPlan.js";

const KIND_ORDER = Object.freeze({
    "uniform-buffer": 0,
    "sampled-resource": 1,
    sampler: 2,
    "storage-resource": 3
});

const KIND_PREFIX = Object.freeze({
    "uniform-buffer": "cb",
    "sampled-resource": "t",
    sampler: "s",
    "storage-resource": "u"
});

const STAGE_VISIBILITY = Object.freeze({ vertex: "vertex", pixel: "fragment", compute: "compute" });
const STAGES = Object.freeze([ "vertex", "fragment", "compute" ]);
const LEGACY_SHARED_STAGES = Object.freeze([ "vertex", "fragment" ]);
const IDENTITY_PATTERN = /^(uniform-buffer|sampled-resource|sampler|storage-resource):\d+:\d+$/u;

function bindingRegister(binding)
{
    return binding.range?.lowerBound ?? binding.registerIndex;
}

function bindingSpace(binding)
{
    return binding.range?.registerSpace ?? 0;
}

function bindingIdentity(binding)
{
    return `${binding.resourceKind}:${bindingSpace(binding)}:${bindingRegister(binding)}`;
}

function validateScopeIdentity(identity, scopeIdentity, stages)
{
    if (scopeIdentity === identity) return;
    if (stages.length !== 1 || scopeIdentity !== `${identity}@${stages[0]}`)
    {
        throw new Error(`WGSL binding plan contains invalid scope identity ${scopeIdentity || "<empty>"}`);
    }
}

function bindingFingerprint(binding)
{
    return JSON.stringify({
        resourceKind: binding.resourceKind,
        generatedSymbol: binding.generatedSymbol,
        registerSpace: binding.registerSpace,
        registerIndex: binding.registerIndex,
        type: binding.type,
        transformId: binding.transformId ?? null,
        arrayLayerCount: binding.arrayLayerCount ?? null,
        structureStride: binding.structureStride ?? null,
        buffer: binding.buffer || null,
        texture: binding.texture || null,
        sampler: binding.sampler || null
    });
}

function declarationFor(program, binding)
{
    return program.declarations.find((entry) => entry.dxbcOffset === binding.declarationOffset) || null;
}

function uniformLayout(program, binding)
{
    const declaration = declarationFor(program, binding);
    const sizeInVec4 = declaration?.data?.sizeInVec4;
    if (!Number.isInteger(sizeInVec4) || sizeInVec4 < 1)
    {
        throw new Error(`WGSL uniform ${binding.id} has no positive vec4 size`);
    }
    if (binding.accessPattern !== "immediate_indexed" && binding.accessPattern !== "dynamic_indexed")
    {
        throw new Error(`WGSL uniform ${binding.id} requires unsupported ${binding.accessPattern || "unknown"} indexing`);
    }
    return {
        declaration: `var<uniform>`,
        type: `array<vec4<f32>, ${sizeInVec4}>`,
        buffer: {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: sizeInVec4 * 16
        }
    };
}

const TEXTURE_DIMENSIONS = Object.freeze({
    texture2d: { type: "texture_2d<f32>", viewDimension: "2d" },
    texturecube: { type: "texture_cube<f32>", viewDimension: "cube" },
    texture3d: { type: "texture_3d<f32>", viewDimension: "3d" },
    texture2darray: { type: "texture_2d_array<f32>", viewDimension: "2d-array" }
});

function textureLayout(binding)
{
    const dimension = TEXTURE_DIMENSIONS[binding.resourceDimension];
    if (!dimension)
    {
        throw new Error(`WGSL sampled resource ${binding.id} has unsupported dimension ${binding.resourceDimension}`);
    }
    const returns = binding.returnType?.returnTypeNames || [];
    if (returns.length !== 4 || returns.some((entry) => entry !== "float"))
    {
        throw new Error(`WGSL sampled resource ${binding.id} requires a float4 return type`);
    }
    return {
        declaration: "var",
        type: dimension.type,
        texture: {
            sampleType: "float",
            viewDimension: dimension.viewDimension,
            multisampled: false
        }
    };
}

function structuredBufferLayout(binding)
{
    const stride = binding.structureStride;
    if (!Number.isInteger(stride) || stride < 4 || stride % 4 !== 0)
    {
        throw new Error(`WGSL structured resource ${binding.id} requires a positive DWORD-aligned stride`);
    }
    if (binding.resourceDimension !== null || binding.returnType !== null)
    {
        throw new Error(`WGSL structured resource ${binding.id} has unexpected typed-resource metadata`);
    }
    return {
        declaration: "var<storage, read>",
        type: "array<u32>",
        structureStride: stride,
        buffer: {
            type: "read-only-storage",
            hasDynamicOffset: false,
            minBindingSize: stride
        }
    };
}

function typedBufferLayout(program, binding)
{
    if (binding.structureStride !== null && binding.structureStride !== undefined)
    {
        throw new Error(`WGSL typed buffer resource ${binding.id} has unexpected structured-resource metadata`);
    }
    const returns = binding.returnType?.returnTypeNames || [];
    if (program.stage === "compute")
    {
        const component = returns.length === 4 && returns.every((entry) => entry === returns[0])
            ? { sint: "i32", uint: "u32" }[returns[0]]
            : null;
        if (!component)
        {
            throw new Error(`WGSL compute typed buffer resource ${binding.id} return type is not supported; bounded scalar-word profiles require uniform sint or uint components`);
        }
        return {
            declaration: "var<storage, read>",
            type: `array<${component}>`,
            buffer: {
                type: "read-only-storage",
                hasDynamicOffset: false,
                minBindingSize: 4
            }
        };
    }
    throw new Error(`WGSL typed buffer resource ${binding.id} is not supported in the ${program.stage} stage without explicit bound-view format metadata`);
}

function sampledResourceLayout(program, binding)
{
    if (binding.resourceDimension === "buffer") return typedBufferLayout(program, binding);
    return binding.structureStride === null || binding.structureStride === undefined
        ? textureLayout(binding)
        : structuredBufferLayout(binding);
}

function uavBufferLayout(program, binding, policy)
{
    // Writable storage is admitted for fragment and compute shaders. Vertex
    // storage writes remain outside the current portability contract.
    if (program.stage !== "pixel" && program.stage !== "compute")
    {
        throw new Error(`WGSL storage resource ${binding.id} is not supported in the ${program.stage} stage`);
    }
    if (binding.structureStride !== null && binding.structureStride !== undefined)
    {
        const stride = binding.structureStride;
        if (program.stage !== "compute")
        {
            throw new Error(`WGSL structured storage resource ${binding.id} is not supported in the ${program.stage} stage`);
        }
        if (!Number.isInteger(stride) || stride < 4 || stride % 4 !== 0)
        {
            throw new Error(`WGSL structured storage resource ${binding.id} requires a positive DWORD-aligned stride`);
        }
        if (binding.resourceDimension !== null || binding.returnType !== null)
        {
            throw new Error(`WGSL structured storage resource ${binding.id} has unexpected typed-resource metadata`);
        }
        return {
            declaration: "var<storage, read_write>",
            type: "array<u32>",
            structureStride: stride,
            buffer: {
                type: "storage",
                hasDynamicOffset: false,
                minBindingSize: stride
            }
        };
    }
    const returns = binding.returnType?.returnTypeNames || [];
    const identity = `storage-resource:${bindingSpace(binding)}:${bindingRegister(binding)}`;
    const signedAtomic = policy.signedAtomicI32Identities.has(identity);
    const scalar = signedAtomic ? "sint" : "uint";
    if (binding.resourceDimension !== "buffer"
        || returns.length !== 4 || returns.some((entry) => entry !== scalar))
    {
        throw new Error(
            `WGSL storage resource ${binding.id} shape is not supported; `
            + (signedAtomic
                ? "the exact profile requires a uniform sint typed buffer UAV"
                : "only typed uint buffer UAVs are supported")
        );
    }
    return {
        declaration: "var<storage, read_write>",
        type: `array<atomic<${signedAtomic ? "i32" : "u32"}>>`,
        buffer: {
            type: "storage",
            hasDynamicOffset: false,
            minBindingSize: 4
        }
    };
}

function samplerLayout(program, binding)
{
    const declaration = declarationFor(program, binding);
    const mode = declaration?.data?.samplerModeName;
    if (mode && mode !== "default")
    {
        throw new Error(`WGSL sampler ${binding.id} has unsupported mode ${mode}`);
    }
    return {
        declaration: "var",
        type: "sampler",
        sampler: { type: "filtering" }
    };
}

function lowerOne(program, binding, bindingIndex, policy)
{
    const registerIndex = bindingRegister(binding);
    const registerSpace = bindingSpace(binding);
    if (!Number.isInteger(registerIndex) || registerIndex < 0
        || !Number.isInteger(registerSpace) || registerSpace < 0)
    {
        throw new Error(`WGSL binding ${binding.id} has an unresolved register identity`);
    }
    if (binding.range?.unbounded || binding.range?.registerCount !== 1)
    {
        throw new Error(`WGSL binding ${binding.id} requires an unsupported array or unbounded range`);
    }
    let layout;
    if (binding.resourceKind === "uniform-buffer") layout = uniformLayout(program, binding);
    else if (binding.resourceKind === "sampled-resource") layout = sampledResourceLayout(program, binding);
    else if (binding.resourceKind === "sampler") layout = samplerLayout(program, binding);
    else if (binding.resourceKind === "storage-resource")
    {
        layout = uavBufferLayout(program, binding, policy);
    }
    else throw new Error(`WGSL binding ${binding.id} has unsupported kind ${binding.resourceKind}`);
    const identity = `${binding.resourceKind}:${registerSpace}:${registerIndex}`;
    const visibility = STAGE_VISIBILITY[program.stage];
    if (!visibility) throw new Error(`WGSL binding ${binding.id} has unsupported stage ${program.stage || "unknown"}`);
    return {
        kind: "wgsl-binding",
        id: binding.id,
        identity,
        scopeIdentity: `${identity}@${visibility}`,
        resourceKind: binding.resourceKind,
        generatedSymbol: `${KIND_PREFIX[binding.resourceKind]}${registerIndex}${registerSpace ? `_space${registerSpace}` : ""}`,
        registerSpace,
        registerIndex,
        rangeId: binding.range?.rangeId ?? null,
        group: 0,
        binding: bindingIndex,
        visibility,
        declarationOffset: binding.declarationOffset,
        ...(typeof binding.transformId === "string"
            ? {
                transformId: binding.transformId,
                arrayLayerCount: binding.arrayLayerCount
            }
            : {}),
        ...layout
    };
}

function normalizeBindingPlan(plan, stage)
{
    if (plan === null || plan === undefined) return null;
    if (plan?.format !== "CJS_WGSL_BINDING_PLAN"
        || ![ 1, 2, 3 ].includes(plan.formatVersion)
        || !Array.isArray(plan.bindings))
    {
        throw new TypeError("WGSL binding plan must be a CJS_WGSL_BINDING_PLAN version 1, 2, or 3 document");
    }
    const resourceTransformPlan = plan.resourceTransforms === undefined
        ? null
        : normalizeResourceTransformPlan({
            format: "CJS_WGSL_RESOURCE_TRANSFORM_PLAN",
            formatVersion: 1,
            resourceTransforms: plan.resourceTransforms
        });
    if ((plan.formatVersion === 3) !== Boolean(resourceTransformPlan))
    {
        throw new Error("WGSL binding plan version 3 requires resource transforms, and earlier versions cannot contain them");
    }
    const visibility = STAGE_VISIBILITY[stage];
    if (!visibility) throw new Error(`WGSL binding plan cannot target unsupported stage ${stage || "unknown"}`);
    const requestedShared = plan.sharedIdentities === undefined ? [] : plan.sharedIdentities;
    if (!Array.isArray(requestedShared)
        || requestedShared.some((entry) => typeof entry !== "string" || !IDENTITY_PATTERN.test(entry))
        || new Set(requestedShared).size !== requestedShared.length)
    {
        throw new Error("WGSL binding plan contains invalid shared identities");
    }
    const sharedIdentities = new Set(requestedShared);
    const confirmedShared = new Set();
    const identities = new Map(STAGES.map((name) => [ name, new Map() ]));
    const scopeIdentities = new Set();
    const slots = new Map();
    for (const entry of plan.bindings)
    {
        const identity = bindingIdentity(entry);
        const stages = plan.formatVersion === 1
            ? (sharedIdentities.has(identity) ? LEGACY_SHARED_STAGES : [ visibility ])
            : entry.stages;
        const scopeIdentity = plan.formatVersion === 1
            ? (sharedIdentities.has(identity) ? identity : `${identity}@${visibility}`)
            : entry.scopeIdentity;
        if (!IDENTITY_PATTERN.test(identity)
            || entry.identity !== identity
            || !Array.isArray(stages) || !stages.length
            || stages.some((name) => !STAGES.includes(name))
            || new Set(stages).size !== stages.length
            || !Number.isInteger(entry.group) || entry.group < 0
            || !Number.isInteger(entry.binding) || entry.binding < 0)
        {
            throw new Error(`WGSL binding plan contains an invalid entry ${entry.identity || identity}`);
        }
        validateScopeIdentity(identity, scopeIdentity, stages);
        if (stages.length > 1)
        {
            if (scopeIdentity !== identity || !sharedIdentities.has(identity))
            {
                throw new Error(`WGSL binding plan shares unconfirmed identity ${identity}`);
            }
            confirmedShared.add(identity);
        }
        else if (sharedIdentities.has(identity))
        {
            throw new Error(`WGSL shared identity ${identity} does not cover multiple stages`);
        }
        else if (plan.formatVersion >= 2 && scopeIdentity === identity)
        {
            throw new Error(`WGSL binding plan uses unshared base identity ${identity}`);
        }
        if (scopeIdentities.has(scopeIdentity))
        {
            throw new Error(`WGSL binding plan contains duplicate scope identity ${scopeIdentity}`);
        }
        scopeIdentities.add(scopeIdentity);
        const normalizedEntry = plan.formatVersion === 1
            ? { ...entry, identity, scopeIdentity }
            : entry;
        for (const name of stages)
        {
            if (identities.get(name).has(identity))
            {
                throw new Error(`WGSL binding plan contains overlapping ${name} identity ${identity}`);
            }
            identities.get(name).set(identity, normalizedEntry);
        }
        const slot = `${entry.group}:${entry.binding}`;
        if (slots.has(slot)) throw new Error(`WGSL binding plan assigns ${slot} to multiple scope identities`);
        slots.set(slot, scopeIdentity);
    }
    for (const identity of sharedIdentities)
    {
        if (!confirmedShared.has(identity)) throw new Error(`WGSL binding plan does not contain shared identity ${identity}`);
    }
    return {
        bindings: identities.get(visibility),
        exactStageCoverage: plan.formatVersion >= 2,
        resourceTransformPlan
    };
}

function transformBindings(bindings, plan, stage)
{
    if (!plan) return bindings;
    const transforms = plan.resourceTransforms.filter((transform) =>
        transform.stage === stage);
    if (!transforms.length) return bindings;
    const byIdentity = new Map(bindings.map((binding) => [ bindingIdentity(binding), binding ]));
    const inputs = new Map();
    for (const transform of transforms)
    {
        for (const input of transform.inputs)
        {
            if (inputs.has(input.identity))
            {
                throw new Error(`WGSL resource transforms overlap ${input.identity}`);
            }
            if (!byIdentity.has(input.identity))
            {
                throw new Error(`WGSL resource transform ${transform.id} references missing ${input.identity}`);
            }
            inputs.set(input.identity, { transform, input });
        }
    }
    const output = [];
    for (const binding of bindings)
    {
        const identity = bindingIdentity(binding);
        const mapped = inputs.get(identity);
        if (!mapped)
        {
            output.push(binding);
            continue;
        }
        if (mapped.input.layer !== 0) continue;
        const { transform } = mapped;
        if (transform.output.identity !== identity
            || binding.resourceKind !== "sampled-resource"
            || binding.resourceDimension !== "texture2d"
            || binding.structureStride !== null)
        {
            throw new Error(`WGSL resource transform ${transform.id} cannot replace ${identity}`);
        }
        output.push({
            ...binding,
            resourceDimension: "texture2darray",
            transformId: transform.id,
            arrayLayerCount: transform.output.layerCount
        });
    }
    return output;
}

function normalizeLayoutPolicy(value)
{
    if (value === undefined || value === null)
    {
        return { signedAtomicI32Identities: new Set() };
    }
    if (!value || typeof value !== "object" || Array.isArray(value)
        || Object.keys(value).length !== 1
        || !Array.isArray(value.signedAtomicI32Identities)
        || value.signedAtomicI32Identities.some((identity) =>
            typeof identity !== "string"
            || !/^storage-resource:\d+:\d+$/u.test(identity))
        || new Set(value.signedAtomicI32Identities).size
            !== value.signedAtomicI32Identities.length)
    {
        throw new TypeError(
            "WGSL binding layout profile policy must contain unique signedAtomicI32Identities"
        );
    }
    return {
        signedAtomicI32Identities: new Set(value.signedAtomicI32Identities)
    };
}

/**
 * Converts D3D register declarations to one deterministic WebGPU bind group.
 * Register spaces participate in ordering and identity; SM 5.1 range ids are
 * deliberately not treated as globally unique bindings.
 *
 * @param {object} program Frozen CJS shader IR.
 * @param {object|null} [bindingPlan] Optional pass-global canonical binding plan.
 * @param {object|null} [layoutPolicy] Exact-profile-only typed-layout policy.
 * @param {object|null} [resourceTransformPlan] Validated physical-resource overlay.
 * @returns {object[]} Frozen WebGPU binding records.
 */
export function lowerBindingLayout(
    program,
    bindingPlan = null,
    layoutPolicy = null,
    resourceTransformPlan = null
)
{
    if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1)
    {
        throw new TypeError("WGSL binding lowering expects CJS_SHADER_IR version 1 input");
    }
    const policy = normalizeLayoutPolicy(layoutPolicy);
    const planned = normalizeBindingPlan(bindingPlan, program.stage);
    const explicitTransforms = normalizeResourceTransformPlan(resourceTransformPlan);
    if (planned?.resourceTransformPlan && explicitTransforms
        && JSON.stringify(planned.resourceTransformPlan) !== JSON.stringify(explicitTransforms))
    {
        throw new Error("WGSL binding plan and explicit resource transform plan disagree");
    }
    const transforms = planned?.resourceTransformPlan || explicitTransforms;
    const sorted = transformBindings(Array.from(program.bindings).sort((left, right) =>
        bindingSpace(left) - bindingSpace(right)
        || (KIND_ORDER[left.resourceKind] ?? 99) - (KIND_ORDER[right.resourceKind] ?? 99)
        || bindingRegister(left) - bindingRegister(right)
        || left.declarationOffset - right.declarationOffset), transforms, STAGE_VISIBILITY[program.stage]);
    const identities = new Set();
    for (const binding of sorted)
    {
        const identity = `${binding.resourceKind}:${bindingSpace(binding)}:${bindingRegister(binding)}`;
        if (identities.has(identity)) throw new Error(`WGSL binding layout contains duplicate ${identity}`);
        identities.add(identity);
    }
    const lowered = sorted.map((binding, index) =>
        lowerOne(program, binding, index, policy));
    const symbols = new Map();
    for (const binding of lowered)
    {
        const identity = bindingIdentity(binding);
        if (symbols.has(binding.generatedSymbol) && symbols.get(binding.generatedSymbol) !== identity)
        {
            throw new Error(`WGSL binding layout uses ${binding.generatedSymbol} for multiple identities`);
        }
        symbols.set(binding.generatedSymbol, identity);
    }
    if (!planned) return lowered;
    if (planned.exactStageCoverage && planned.bindings.size !== lowered.length)
    {
        const declared = new Set(lowered.map(bindingIdentity));
        const unexpected = Array.from(planned.bindings.keys()).find((identity) => !declared.has(identity));
        throw new Error(`WGSL binding plan contains unexpected ${lowered[0]?.visibility || STAGE_VISIBILITY[program.stage]} identity ${unexpected || "unknown"}`);
    }
    return lowered.map((binding) =>
    {
        const identity = bindingIdentity(binding);
        const entry = planned.bindings.get(identity);
        if (!entry) throw new Error(`WGSL binding plan does not contain ${identity}`);
        if (bindingFingerprint(entry) !== bindingFingerprint(binding))
        {
            throw new Error(`WGSL binding plan layout for ${identity} does not match the shader declaration`);
        }
        return {
            ...binding,
            identity,
            scopeIdentity: entry.scopeIdentity || identity,
            group: entry.group,
            binding: entry.binding
        };
    });
}
