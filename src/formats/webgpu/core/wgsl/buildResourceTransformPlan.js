import { compareUtf8 } from "../../../../format/compareUtf8.js";

const RESOURCE_IDENTITY = /^sampled-resource:(\d+):(\d+)$/u;
const DETAIL_PARAMETER = /^Detail(\d+)Map$/u;
const SAMPLE_OPCODES = new Set([ "sample_b" ]);

function deepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const entry of Object.values(value)) deepFreeze(entry);
    return Object.freeze(value);
}

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

function scopeIdentity(identity, stage)
{
    return `${identity}@${stage}`;
}

function normalizeInput(input, transformId, index)
{
    const parameter = input?.parameter;
    const layer = input?.layer;
    const identity = input?.identity;
    const scoped = input?.scopeIdentity;
    if (typeof parameter !== "string" || !parameter
        || !Number.isInteger(layer) || layer !== index
        || typeof identity !== "string" || !RESOURCE_IDENTITY.test(identity)
        || scoped !== `${identity}@fragment`)
    {
        throw new Error(`WGSL resource transform ${transformId} has an invalid input at layer ${index}`);
    }
    return { parameter, layer, identity, scopeIdentity: scoped };
}

function normalizeTransform(transform)
{
    const id = transform?.id;
    if (typeof id !== "string" || !id
        || transform.version !== 1
        || transform.kind !== "texture-2d-array"
        || typeof transform.layoutKey !== "string" || !transform.layoutKey
        || transform.stage !== "fragment"
        || !Array.isArray(transform.inputs)
        || transform.inputs.length < 2)
    {
        throw new Error(`WGSL resource transform ${id || "<unknown>"} has an invalid texture-array contract`);
    }
    const inputs = transform.inputs.map((input, index) => normalizeInput(input, id, index));
    const inputParameters = new Set(inputs.map((input) => input.parameter));
    const inputIdentities = new Set(inputs.map((input) => input.identity));
    if (inputParameters.size !== inputs.length || inputIdentities.size !== inputs.length)
    {
        throw new Error(`WGSL resource transform ${id} contains duplicate inputs`);
    }
    const output = transform.output;
    if (typeof output?.name !== "string" || !output.name
        || output.identity !== inputs[0].identity
        || output.scopeIdentity !== inputs[0].scopeIdentity
        || output.viewDimension !== "2d-array"
        || output.layerCount !== inputs.length
        || transform.representation !== "native-or-rgba8"
        || transform.missingLayer !== "reject")
    {
        throw new Error(`WGSL resource transform ${id} has an invalid output contract`);
    }
    return {
        id,
        version: 1,
        kind: "texture-2d-array",
        layoutKey: transform.layoutKey,
        stage: "fragment",
        inputs,
        output: {
            name: output.name,
            identity: output.identity,
            scopeIdentity: output.scopeIdentity,
            viewDimension: "2d-array",
            layerCount: output.layerCount
        },
        representation: "native-or-rgba8",
        missingLayer: "reject"
    };
}

/**
 * Validates and freezes the compiler-owned resource-transform plan.
 *
 * @param {object|null|undefined} value Candidate plan.
 * @param {string|null} [layoutKey] Optional expected pass layout key.
 * @returns {object|null} Canonical frozen plan, or null.
 */
export function normalizeResourceTransformPlan(value, layoutKey = null)
{
    if (value === undefined || value === null) return null;
    if (value?.format !== "CJS_WGSL_RESOURCE_TRANSFORM_PLAN"
        || value.formatVersion !== 1
        || !Array.isArray(value.resourceTransforms)
        || !value.resourceTransforms.length)
    {
        throw new TypeError("WGSL resource transform plan must be a non-empty version-1 document");
    }
    const resourceTransforms = value.resourceTransforms.map(normalizeTransform)
        .sort((left, right) => compareUtf8(left.id, right.id));
    const ids = new Set();
    for (const transform of resourceTransforms)
    {
        if (ids.has(transform.id))
        {
            throw new Error(`WGSL resource transform plan contains duplicate id ${transform.id}`);
        }
        ids.add(transform.id);
        if (layoutKey !== null && transform.layoutKey !== layoutKey)
        {
            throw new Error(`WGSL resource transform ${transform.id} targets ${transform.layoutKey}, expected ${layoutKey}`);
        }
    }
    return deepFreeze({
        format: "CJS_WGSL_RESOURCE_TRANSFORM_PLAN",
        formatVersion: 1,
        resourceTransforms
    });
}

function bindingMatchesForOperand(program, resourceKind, operand)
{
    const candidates = program.bindings.filter((binding) =>
        binding.resourceKind === resourceKind);
    const rangeId = operand?.resourceReference?.rangeId;
    return Number.isInteger(rangeId)
        ? candidates.filter((binding) => binding.range?.rangeId === rangeId)
        : candidates.filter((binding) => bindingRegister(binding) === operand?.registerIndex);
}

function resolveBindingForOperand(program, resourceKind, operand)
{
    const matches = bindingMatchesForOperand(program, resourceKind, operand);
    if (matches.length !== 1) return null;
    const binding = matches[0];
    const absolute = operand?.resourceReference?.absoluteIndex;
    if (operand?.typeName !== (resourceKind === "sampler" ? "sampler" : "resource")
        || (operand.modifierName ?? "none") !== "none"
        || (operand.minPrecisionName ?? "default") !== "default"
        || operand.nonUniform
        || operand.indices?.some((index) => index?.relative)
        || operand.resourceReference?.nonUniform
        || absolute?.relative
        || (absolute !== undefined
            && (absolute?.values?.length !== 1
                || absolute.values[0] !== bindingRegister(binding))))
    {
        return null;
    }
    return binding;
}

function operandFingerprint(operand)
{
    return JSON.stringify({
        typeName: operand?.typeName ?? null,
        selectionModeName: operand?.selectionModeName ?? null,
        mask: operand?.mask ?? "",
        swizzle: operand?.swizzle ?? "",
        selected: operand?.selected ?? "",
        modifierName: operand?.modifierName ?? "none",
        minPrecisionName: operand?.minPrecisionName ?? "default",
        registerIndex: operand?.registerIndex ?? null,
        indices: (operand?.indices || []).map((index) => ({
            values: index?.values || [],
            relative: index?.relative ?? null
        })),
        immediateValues: (operand?.immediateValues || []).map((entry) => entry?.uint32)
    });
}

function semanticResource(binding)
{
    if (binding?.kind !== "resource") return null;
    const parameter = binding.metadataName ?? binding.carbon?.name;
    if (typeof parameter !== "string" || !parameter) return null;
    return {
        parameter,
        registerIndex: binding.registerIndex,
        registerSpace: binding.registerSpace ?? 0,
        arrayElements: binding.arrayCount ?? binding.carbon?.arrayElements,
        type: binding.carbon?.type,
        isSRGB: binding.carbon?.isSRGB
    };
}

function rejectCandidate()
{
    return null;
}

/**
 * Recognizes the exact Carbon Detail-map sample family and builds a late
 * physical texture-array overlay. The source IR remains unchanged.
 *
 * @param {Array<{ir: object, semanticBindings: object[]}>} entries Pass stages.
 * @param {object} options Planner options.
 * @param {string} options.layoutKey Canonical pass key.
 * @returns {object|null} Frozen transform plan, or null when proof is absent.
 */
export function buildResourceTransformPlan(entries, options = {})
{
    if (!Array.isArray(entries) || !entries.length)
    {
        throw new TypeError("WGSL resource transform planning expects pass stage entries");
    }
    const layoutKey = options.layoutKey;
    if (typeof layoutKey !== "string" || !layoutKey)
    {
        throw new TypeError("WGSL resource transform planning requires a layoutKey");
    }
    const fragments = entries.filter((entry) => entry?.ir?.stage === "pixel");
    if (fragments.length !== 1) return null;
    const { ir: program } = fragments[0];
    if (program?.format !== "CJS_SHADER_IR" || program.formatVersion !== 1
        || !Array.isArray(fragments[0].semanticBindings))
    {
        throw new TypeError("WGSL resource transform planning requires version-1 IR and semantic bindings");
    }
    const semanticResources = fragments[0].semanticBindings.map(semanticResource).filter(Boolean);
    const detailResources = semanticResources.filter((resource) => DETAIL_PARAMETER.test(resource.parameter));
    if (!detailResources.length) return null;
    const byName = new Map();
    for (const resource of detailResources)
    {
        if (byName.has(resource.parameter)) return rejectCandidate();
        byName.set(resource.parameter, resource);
    }
    const hasThird = byName.has("Detail3Map");
    const parameters = hasThird
        ? [ "Detail1Map", "Detail2Map", "Detail3Map" ]
        : [ "Detail1Map", "Detail2Map" ];
    if (byName.size !== parameters.length
        || parameters.some((parameter) => !byName.has(parameter)))
    {
        return rejectCandidate();
    }

    const sources = [];
    for (const parameter of parameters)
    {
        const semantic = byName.get(parameter);
        if (!Number.isInteger(semantic.registerIndex) || semantic.registerIndex < 0
            || !Number.isInteger(semantic.registerSpace) || semantic.registerSpace < 0
            || semantic.arrayElements !== 1
            || semantic.type !== 2
            || semantic.isSRGB !== false)
        {
            return rejectCandidate();
        }
        const matches = program.bindings.filter((binding) =>
            binding.resourceKind === "sampled-resource"
            && bindingSpace(binding) === semantic.registerSpace
            && bindingRegister(binding) === semantic.registerIndex);
        if (matches.length !== 1) return rejectCandidate();
        const binding = matches[0];
        const returns = binding.returnType?.returnTypeNames || [];
        if (binding.resourceDimension !== "texture2d"
            || binding.structureStride !== null
            || binding.range?.unbounded
            || binding.range?.registerCount !== 1
            || returns.length !== 4
            || returns.some((entry) => entry !== "float"))
        {
            return rejectCandidate();
        }
        sources.push({ parameter, semantic, binding, identity: bindingIdentity(binding) });
    }
    if (sources.some((source, index) =>
        index > 0
        && (source.semantic.registerSpace !== sources[0].semantic.registerSpace
            || source.semantic.registerIndex <= sources[index - 1].semantic.registerIndex)))
    {
        return rejectCandidate();
    }

    const sourceByIdentity = new Map(sources.map((source) => [ source.identity, source ]));
    const uses = new Map(sources.map((source) => [ source.identity, 0 ]));
    let samplerIdentity = null;
    let biasFingerprint = null;
    for (const instruction of program.instructions)
    {
        for (let operandIndex = 0; operandIndex < instruction.operands.length; operandIndex += 1)
        {
            const operand = instruction.operands[operandIndex];
            if (operand?.typeName !== "resource") continue;
            const binding = resolveBindingForOperand(program, "sampled-resource", operand);
            if (!binding)
            {
                const unresolvedCandidate = bindingMatchesForOperand(
                    program,
                    "sampled-resource",
                    operand
                ).some((candidate) =>
                    sourceByIdentity.has(bindingIdentity(candidate)));
                if (unresolvedCandidate) return rejectCandidate();
                continue;
            }
            const identity = bindingIdentity(binding);
            if (!sourceByIdentity.has(identity)) continue;
            if (!SAMPLE_OPCODES.has(instruction.opcodeName)
                || operandIndex !== 2
                || instruction.extensions?.some((extension) =>
                    extension.typeName === "sample_controls")
                || instruction.operands.length !== 5)
            {
                return rejectCandidate();
            }
            const sampler = resolveBindingForOperand(program, "sampler", instruction.operands[3]);
            if (!sampler) return rejectCandidate();
            const currentSamplerIdentity = bindingIdentity(sampler);
            const currentBiasFingerprint = operandFingerprint(instruction.operands[4]);
            if ((samplerIdentity !== null && samplerIdentity !== currentSamplerIdentity)
                || (biasFingerprint !== null && biasFingerprint !== currentBiasFingerprint))
            {
                return rejectCandidate();
            }
            samplerIdentity = currentSamplerIdentity;
            biasFingerprint = currentBiasFingerprint;
            uses.set(identity, uses.get(identity) + 1);
        }
    }
    if (samplerIdentity === null || Array.from(uses.values()).some((count) => count < 1))
    {
        return rejectCandidate();
    }

    const inputs = sources.map((source, layer) => ({
        parameter: source.parameter,
        layer,
        identity: source.identity,
        scopeIdentity: scopeIdentity(source.identity, "fragment")
    }));
    const first = inputs[0];
    const id = `${layoutKey}:detail-map-array:${first.identity}`;
    return normalizeResourceTransformPlan({
        format: "CJS_WGSL_RESOURCE_TRANSFORM_PLAN",
        formatVersion: 1,
        resourceTransforms: [ {
            id,
            version: 1,
            kind: "texture-2d-array",
            layoutKey,
            stage: "fragment",
            inputs,
            output: {
                name: "DetailMapArray",
                identity: first.identity,
                scopeIdentity: first.scopeIdentity,
                viewDimension: "2d-array",
                layerCount: inputs.length
            },
            representation: "native-or-rgba8",
            missingLayer: "reject"
        } ]
    }, layoutKey);
}
