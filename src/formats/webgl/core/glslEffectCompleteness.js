import { LOCAL_LIGHT_RESOURCE_NAMES } from "../../hlsl/core/localLightFamily.js";

/**
 * Light-record fields naming the Carbon registers a lowering replaced.
 *
 * A lowered family declares one synthesised uniform, so its own `registerIndex`
 * covers only one of the sources; the record carries the rest.
 */
/** Transform stage names, in the shared codec's vocabulary, as WebGL names them. */
const TRANSFORM_STAGE_NAMES = Object.freeze({
  vertex: "vertex",
  fragment: "pixel",
  compute: "compute"
});

const LOCAL_LIGHT_RECORD_REGISTERS = Object.freeze([
  "lightIndexRegister",
  "lightDataRegister",
  "lightProfileRegister"
]);

/**
 * Inspects Carbon WebGL stage records for complete WebGL2 raster passes.
 *
 * Geometry and compute stages are not raster-pair members. A raster pass is
 * complete only when both its vertex and pixel records exist and their shared
 * shader records contain successful translated source.
 *
 * Stages reference shaders by key. The older shape that inlined the shader into
 * the stage record has no producer left — both callers pass a shader table, and
 * the container decoder always builds one — so the branch that supported it is
 * gone rather than kept as an untested path.
 *
 * @param {object[]} stages Stage records.
 * @param {object[]} shaders Translated shader records.
 * @returns {{ expectedPassCount: number, completePassCount: number, incompletePasses: object[] }}
 */
export function inspectRasterCompleteness(stages, shaders)
{
    const shaderMap = new Map((shaders || []).map((shader) => [ shader.key, shader ]));
    const groups = new Map();

    for (const stage of stages || [])
    {
        if (stage.stageName !== "vertex" && stage.stageName !== "pixel") continue;

        const key = [
            stage.bodyKey || "selected",
            stage.techniqueName || "Main",
            Number.isInteger(stage.passIndex) ? stage.passIndex : 0
        ].join(":");
        let group = groups.get(key);
        if (!group)
        {
            group = {
                key,
                bodyKey: stage.bodyKey || "selected",
                techniqueName: stage.techniqueName || "Main",
                passIndex: Number.isInteger(stage.passIndex) ? stage.passIndex : 0,
                vertex: null,
                pixel: null,
                duplicateStages: []
            };
            groups.set(key, group);
        }
        if (group[stage.stageName])
        {
            group.duplicateStages.push(stage.stageName);
        }
        group[stage.stageName] = stage;
    }

    const incompletePasses = [];
    let completePassCount = 0;

    for (const group of groups.values())
    {
        const missingStages = [];
        const unavailableStages = [];

        for (const stageName of [ "vertex", "pixel" ])
        {
            const stage = group[stageName];
            if (!stage)
            {
                missingStages.push(stageName);
                continue;
            }

            const shader = shaderMap.get(stage.shaderKey);
            if (!shader?.hlsl2webgl?.ok || !shader.source)
            {
                unavailableStages.push({
                    stageName,
                    stageKey: stage.key,
                    shaderKey: stage.shaderKey,
                    excluded: shader?.excluded || null,
                    reason: shader?.hlsl2webgl?.validationError
            || shader?.hlsl2webgl?.reason
            || shader?.hlsl2webgl?.error
            || shader?.excluded?.reason
            || "translated source is unavailable"
                });
            }
        }

        if (!missingStages.length && !unavailableStages.length && !group.duplicateStages.length)
        {
            completePassCount += 1;
            continue;
        }

        incompletePasses.push({
            key: group.key,
            bodyKey: group.bodyKey,
            techniqueName: group.techniqueName,
            passIndex: group.passIndex,
            missingStages,
            unavailableStages,
            duplicateStages: [ ...new Set(group.duplicateStages) ].sort()
        });
    }

    return {
        expectedPassCount: groups.size,
        completePassCount,
        incompletePasses
    };
}

/**
 * Checks the host-side routing contract emitted for compute-as-fragment
 * programs. A boolean marker is insufficient: the runtime needs the original
 * dispatch shape, dispatch-origin uniform, and every UAV render-target route.
 */
export function isComputeFragmentContract(value)
{
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (!Array.isArray(value.threadGroup)
    || value.threadGroup.length !== 3
    || value.threadGroup.some((item) => !Number.isSafeInteger(item) || item < 1))
    {
        return false;
    }
    if (value.dispatchOriginUniform !== null
    && (typeof value.dispatchOriginUniform !== "string" || !value.dispatchOriginUniform)) return false;
    if (!Array.isArray(value.uavOutputs) || !value.uavOutputs.length) return false;

    const locations = new Set();
    const names = new Set();
    const routes = new Set();
    for (const output of value.uavOutputs)
    {
        if (!output || typeof output !== "object") return false;
        if (!Number.isSafeInteger(output.register) || output.register < 0) return false;
        if (output.slice !== null && (!Number.isSafeInteger(output.slice) || output.slice < 0)) return false;
        if (!Number.isSafeInteger(output.location) || output.location < 0 || locations.has(output.location)) return false;
        if (typeof output.glslName !== "string" || !output.glslName || names.has(output.glslName)) return false;
        const route = `${output.register}:${output.slice === null ? "dynamic" : output.slice}`;
        if (routes.has(route)) return false;
        locations.add(output.location);
        names.add(output.glslName);
        routes.add(route);
    }
    return true;
}

/**
 * Checks a declared resource transform against the bindings it claims to have
 * rewritten.
 *
 * A transform says N described resources became one array binding. That claim is
 * only meaningful if the shader agrees: the carrier - layer 0's register, whose
 * slot the array occupies - must be declared, and every merged-away input must
 * not be. A transform naming registers the shader still binds separately has not
 * happened; a carrier the shader never declares cannot be bound.
 *
 * engine-webgpu makes equivalent checks when it realizes a package, and they are
 * mostly about the emitted artefacts rather than the device. WebGL has no engine
 * to make them, so a container can currently ship a transform nothing agrees
 * with. Checking here covers both, and covers WebGL at the only point that
 * exists.
 *
 * @param {object} stage Decoded stage record.
 * @param {object} shader Decoded shader record.
 * @param {object[]} errors Collected integrity errors.
 */
function checkResourceTransforms(stage, shader, errors)
{
    const all = Array.isArray(stage.transforms) ? stage.transforms : [];
    // A transform belongs to a pass but rewrites one stage. The record names that
    // stage in WGSL's vocabulary, where WebGL's is "pixel" - the block codec is
    // shared between the backends and restores the field from one set of
    // defaults. Checking a vertex stage against a fragment transform reports
    // every pass twice and says nothing: measured on a shipped effect, that was
    // 48 carrier-undeclared reports on a container with nothing wrong with it.
    const transforms = all.filter(
        (transform) => TRANSFORM_STAGE_NAMES[transform?.stage] === stage.stageName
    );
    if (!transforms.length) return;

    const declared = new Set(
        (Array.isArray(shader.bindings) ? shader.bindings : [])
            .filter((binding) => Number.isSafeInteger(binding?.registerIndex))
            .map((binding) => binding.registerIndex)
    );

    for (const transform of transforms)
    {
        const inputs = Array.isArray(transform?.inputs) ? transform.inputs : [];

        // Not every transform is a merge. `local-light-profile-neutral` records
        // one resource replaced by a constant, so it has exactly one input and
        // no carrier - the checks below would read that as an underfilled merge
        // whose carrier went missing, which is the opposite of what happened.
        if (transform?.family === "local-light-profile-neutral")
        {
            if (inputs.length !== 1)
            {
                addIntegrityError(
                    errors,
                    "resource_transform_neutral_arity",
                    `Stage ${stage.key} transform ${transform?.id || "<missing>"} neutralises ${inputs.length} resource(s); exactly one is expected`,
                    { stageKey: stage.key, transformId: transform?.id || null }
                );
                continue;
            }

            const [ neutralised ] = inputs;
            if (Number.isSafeInteger(neutralised.registerIndex)
                && declared.has(neutralised.registerIndex))
            {
                addIntegrityError(
                    errors,
                    "resource_transform_neutral_still_bound",
                    `Stage ${stage.key} transform ${transform.id} neutralised register ${neutralised.registerIndex}, but the shader still declares it`,
                    {
                        stageKey: stage.key,
                        transformId: transform.id,
                        register: neutralised.registerIndex
                    }
                );
            }
            continue;
        }

        if (inputs.length < 2)
        {
            addIntegrityError(
                errors,
                "resource_transform_underfilled",
                `Stage ${stage.key} declares transform ${transform?.id || "<missing>"} with ${inputs.length} input(s); a merge needs at least two`,
                { stageKey: stage.key, transformId: transform?.id || null }
            );
            continue;
        }

        // Layers address array slices, so they must be the whole range 0..n-1.
        const layers = inputs.map((input) => input.layer);
        if (layers.some((layer, index) => layer !== index))
        {
            addIntegrityError(
                errors,
                "resource_transform_layer_gap",
                `Stage ${stage.key} transform ${transform.id} has layers ${layers.join(", ")} rather than a contiguous range`,
                { stageKey: stage.key, transformId: transform.id, layers }
            );
            continue;
        }

        const [ carrier, ...merged ] = inputs;
        if (Number.isSafeInteger(carrier.registerIndex)
            && !declared.has(carrier.registerIndex))
        {
            addIntegrityError(
                errors,
                "resource_transform_carrier_undeclared",
                `Stage ${stage.key} transform ${transform.id} names carrier register ${carrier.registerIndex}, which the shader does not declare`,
                {
                    stageKey: stage.key,
                    transformId: transform.id,
                    register: carrier.registerIndex
                }
            );
        }

        for (const input of merged)
        {
            if (!Number.isSafeInteger(input.registerIndex)) continue;
            if (!declared.has(input.registerIndex)) continue;

            addIntegrityError(
                errors,
                "resource_transform_input_still_bound",
                `Stage ${stage.key} transform ${transform.id} merged register ${input.registerIndex} away, but the shader still declares it`,
                {
                    stageKey: stage.key,
                    transformId: transform.id,
                    register: input.registerIndex
                }
            );
        }
    }
}

/**
 * Reports a local-light family that the shipped GLSL neither binds nor explains.
 *
 * The container deliberately says two things at once. The Carbon description
 * records are the authored name and register authority and are never rewritten
 * by a lowering; the GLSL declares whatever the lowering actually produced; and
 * the per-pass backend block is the delta that ties one to the other. That only
 * holds while the delta is complete.
 *
 * This cannot be a general "every described resource is declared" rule. Carbon
 * describes resources a shader may simply not use, and the emitter only declares
 * what it samples, so an undeclared resource is ordinary. Measured on a shipped
 * effect, the general form reported 96 such resources on a perfectly good build.
 *
 * What is checkable is a family the packager is known to rewrite. Local lights
 * are two structured buffers plus an optional profile texture; WebGL2 has no
 * structured buffers, so the shader either lowers them - leaving a light record
 * naming the source registers - or it cannot bind lights at all. A described
 * family with no declaration and no record is the one case that is definitely
 * wrong rather than merely unused.
 *
 * `localLights: "drop"` produces exactly that: the emitter removes the
 * declarations *and* their binding records, so nothing reaches the block while
 * the description still lists all three. That mode is a diagnostic aid, not a
 * shipping mode, and this is what says so instead of writing a container that
 * quietly disagrees with itself.
 *
 * @param {object} stage Decoded stage record.
 * @param {object} shader Decoded shader record.
 * @param {object[]} errors Collected integrity errors.
 */
function checkLocalLightFamilyAccounted(stage, shader, errors)
{
    const manifestBindings = Array.isArray(stage.manifest?.bindings)
        ? stage.manifest.bindings
        : [];
    const family = manifestBindings.filter((entry) => entry?.kind === "resource"
        && LOCAL_LIGHT_RESOURCE_NAMES.includes(entry.name));
    if (family.length < 2) return;

    const bindings = Array.isArray(shader.bindings) ? shader.bindings : [];
    const accounted = new Set();
    for (const binding of bindings)
    {
        if (Number.isSafeInteger(binding?.registerIndex))
        {
            accounted.add(binding.registerIndex);
        }
        for (const key of LOCAL_LIGHT_RECORD_REGISTERS)
        {
            if (Number.isSafeInteger(binding?.[key])) accounted.add(binding[key]);
        }
    }

    // A resource transform accounts for a register just as a binding record
    // does. `local-light-profile-neutral` names a resource replaced by a
    // constant: nothing is bound, so no binding can carry it, and the transform
    // is the only place the decision is written down.
    for (const transform of Array.isArray(stage.transforms) ? stage.transforms : [])
    {
        if (transform?.family !== "local-light-profile-neutral") continue;
        for (const input of Array.isArray(transform.inputs) ? transform.inputs : [])
        {
            if (Number.isSafeInteger(input?.registerIndex)) accounted.add(input.registerIndex);
        }
    }

    // Any orphan is a fault, not only a wholly missing family. A lowering that
    // declares its synthesised uniform but forgets to record the other source
    // registers loses them just as completely, and only the record can say where
    // they went.
    const orphans = family
        .filter((entry) => Number.isSafeInteger(entry.registerIndex)
            && !accounted.has(entry.registerIndex))
        .map((entry) => entry.registerIndex);
    if (!orphans.length) return;

    addIntegrityError(
        errors,
        "unlowered_local_light_family",
        `Stage ${stage.key} describes a local-light family at registers ${orphans.join(", ")} that the shader neither declares nor lowers`,
        {
            stageKey: stage.key,
            shaderKey: stage.shaderKey || null,
            registers: orphans
        }
    );
}

/**
 * Inspects a decoded effect container for the contracts a WebGL 2 runtime needs.
 *
 * This replaces `inspectGlslContainerIntegrity`, which took the chunk package's
 * INFO, META and GLSL records. Most of that function was bookkeeping about the
 * chunk format rather than about the effect, and it is not carried across:
 *
 * - **Envelope and kind checks** (`invalid_package_envelope`,
 *   `unsupported_package_kind`) asserted the magic strings `Carbon WebGL` /
 *   `CARBON_WEBGL_GLSL_SET` and a `packageKind` naming the chunk layout. They described
 *   the container they were written in, and that container is gone.
 * - **Declared-count checks** (`invalid_declared_count`, `declared_count_mismatch`,
 *   `declared_partial_package` — twelve fields) compared a header counter against
 *   the graph it summarised. A header can lie about the body; that is why the
 *   check existed. Nothing here declares a count, so there is nothing to lie.
 * - **Cross-copy reconciliation** (`package_mode_mismatch`,
 *   `package_selection_mismatch`, `variant_metadata_mismatch`,
 *   `failed_metadata_body`, `missing_metadata_*`, `orphan_metadata_*`) checked
 *   that META and GLSL agreed. Two independently-encoded copies of one fact can
 *   drift. The container stores one copy, so the bug class is gone rather than
 *   unchecked.
 * - **`missing_glsl_set` / `missing_metadata` / `invalid_core_chunk_cardinality`**
 *   asked whether a chunk was present exactly once. The reader now refuses to
 *   construct at all on a malformed container, which is strictly stronger.
 * - **`orphan_shader` / `duplicate_shader_key`** are unreachable by construction:
 *   the decoder pools shaders by program text and emits a key per pool, so a
 *   shader exists only because a stage referenced it.
 *
 * What survives is everything that describes the translation: which stages a
 * pass may contain, whether a declared stage carries a program, whether a
 * compute stage was adapted to the fragment host, and whether the emitted GLSL
 * actually declares the inputs and samplers the reflection promises. Those are
 * properties of the shader, not of the file it arrived in.
 *
 * @param {{stages:object[], shaders:object[]}} decoded Decoded container graph.
 * @returns {{ok:boolean, errors:object[]}} Integrity report.
 */
export function inspectGlslContainerIntegrity(decoded)
{
    const errors = [];
    const stages = decoded?.stages;
    const shaders = decoded?.shaders;

    if (!Array.isArray(stages) || !Array.isArray(shaders))
    {
        addIntegrityError(
            errors,
            "missing_container_graph",
            "Container integrity requires decoded stage and shader arrays"
        );
        return { ok: false, errors };
    }

    const shaderMap = new Map(shaders.map((shader) => [ shader.key, shader ]));
    const passGroups = new Map();

    for (const stage of stages)
    {
        const passKey = `${stage.bodyKey}.${stage.techniqueName}.pass${stage.passIndex}`;
        if (!passGroups.has(passKey)) passGroups.set(passKey, []);
        passGroups.get(passKey).push(stage);

        const shader = shaderMap.get(stage.shaderKey);

        if (![ "vertex", "pixel", "compute" ].includes(stage.stageName))
        {
            addIntegrityError(
                errors,
                "unsupported_stage",
                `Stage ${stage.key} uses unsupported WebGL2 stage ${stage.stageName}`,
                { stageKey: stage.key, stageName: stage.stageName || null }
            );
            continue;
        }

        if (!shader?.hlsl2webgl?.ok || !shader.source)
        {
            addIntegrityError(
                errors,
                "unavailable_stage_shader",
                `Stage ${stage.key} has no successful translated source`,
                { stageKey: stage.key, shaderKey: stage.shaderKey || null }
            );
            continue;
        }

        if (stage.stageName === "compute")
        {
            const computeIssue = computeFragmentShaderIssue(shader);
            if (computeIssue)
            {
                addIntegrityError(
                    errors,
                    "unadapted_compute_stage",
                    `Compute stage ${stage.key} ${computeIssue}`,
                    { stageKey: stage.key, shaderKey: stage.shaderKey || null }
                );
            }
        }

        if (stage.manifest) validateShaderRuntimeContract(shader, stage, stage.manifest, errors);
    }

    for (const [ passKey, passStages ] of passGroups)
    {
        const counts = { vertex: 0, pixel: 0, compute: 0, other: 0 };
        for (const stage of passStages)
        {
            if (stage.stageName in counts && stage.stageName !== "other") counts[stage.stageName] += 1;
            else counts.other += 1;
        }
        const raster = counts.vertex === 1 && counts.pixel === 1 && counts.compute === 0 && counts.other === 0;
        const compute = counts.vertex === 0 && counts.pixel === 0 && counts.compute === 1 && counts.other === 0;
        if (!raster && !compute)
        {
            const duplicate = Object.values(counts).some((count) => count > 1);
            const mixed = counts.compute > 0 && (counts.vertex > 0 || counts.pixel > 0);
            const code = duplicate || mixed
                ? "invalid_pass_stage_family"
                : counts.other > 0
                    ? "unsupported_pass_stage_family"
                    : "incomplete_pass_stage_family";
            addIntegrityError(
                errors,
                code,
                `Pass ${passKey} must contain exactly one vertex/pixel pair or one compute stage`,
                { passKey, counts }
            );
        }
    }

    return { ok: errors.length === 0, errors };
}

function computeFragmentShaderIssue(shader)
{
    const contract = shader?.computeFragment;
    if (!isComputeFragmentContract(contract)) return "has no valid compute-fragment host contract";
    if (!Array.isArray(shader.bindings)) return "has no binding metadata for its compute-fragment host contract";

    const bindings = shader.bindings.filter((binding) => binding?.kind === "uavTexture");
    if (bindings.length !== contract.uavOutputs.length)
    {
        return "compute-fragment UAV routes do not match its binding metadata";
    }
    for (const output of contract.uavOutputs)
    {
        if (!bindings.some((binding) => binding.registerIndex === output.register
      && binding.slice === output.slice
      && binding.location === output.location
      && binding.name === output.glslName))
        {
            return `compute-fragment route ${output.glslName} does not match its binding metadata`;
        }
        const declaration = new RegExp(
            `layout\\s*\\(\\s*location\\s*=\\s*${output.location}\\s*\\)\\s*out\\b[^;]*\\b${escapeRegExp(output.glslName)}\\s*;`
        );
        if (!declaration.test(shader.source))
        {
            return `compute-fragment route ${output.glslName} is not declared at output location ${output.location}`;
        }
    }

    const dispatchBindings = shader.bindings.filter((binding) => binding?.kind === "dispatchUniform");
    if (contract.dispatchOriginUniform === null)
    {
        if (dispatchBindings.length) return "declares unexpected dispatch-origin binding metadata";
    }
    else
    {
        if (dispatchBindings.length !== 1 || dispatchBindings[0].name !== contract.dispatchOriginUniform)
        {
            return "dispatch-origin uniform does not match its binding metadata";
        }
        const declaration = new RegExp(`uniform\\s+ivec3\\s+${escapeRegExp(contract.dispatchOriginUniform)}\\s*;`);
        if (!declaration.test(shader.source)) return "dispatch-origin uniform is not declared in translated source";
    }
    return null;
}

function validateShaderRuntimeContract(shader, stage, manifestStage, errors)
{
    if (stage.stageName === "vertex" && Array.isArray(shader.stageInputs))
    {
        const registers = new Set();
        const names = new Set();
        const expectedInputs = (manifestStage.pipelineInputs || []).filter((input) => Number(input?.usedMask || 0) !== 0);
        for (const input of shader.stageInputs)
        {
            if (!Number.isSafeInteger(input?.register)
        || input.register < 0
        || registers.has(input.register)
        || typeof input.name !== "string"
        || !input.name
        || names.has(input.name))
            {
                addIntegrityError(
                    errors,
                    "invalid_vertex_input_contract",
                    `Vertex shader ${shader.key} has an invalid or duplicate emitted input`,
                    { stageKey: stage.key, shaderKey: shader.key }
                );
                continue;
            }
            registers.add(input.register);
            names.add(input.name);
            if (!expectedInputs.some((entry) => entry.registerIndex === input.register
        && normalizeSemanticName(entry.usageName) === normalizeSemanticName(input.semanticName)
        && entry.usageIndex === input.semanticIndex))
            {
                addIntegrityError(
                    errors,
                    "vertex_input_contract_mismatch",
                    `Vertex shader ${shader.key} input ${input.name} is not present in its manifest pipeline inputs`,
                    { stageKey: stage.key, shaderKey: shader.key, register: input.register }
                );
            }
            const declaration = new RegExp(`\\bin\\b[^;]*\\b${escapeRegExp(input.name)}\\s*;`);
            if (!declaration.test(shader.source))
            {
                addIntegrityError(
                    errors,
                    "vertex_input_declaration_mismatch",
                    `Vertex shader ${shader.key} input ${input.name} is not declared in translated source`,
                    { stageKey: stage.key, shaderKey: shader.key, inputName: input.name }
                );
            }
        }
    }

    checkLocalLightFamilyAccounted(stage, shader, errors);
    checkResourceTransforms(stage, shader, errors);

    if (!Array.isArray(shader.bindings)) return;
    const manifestBindings = Array.isArray(manifestStage.bindings) ? manifestStage.bindings : [];
    for (const binding of shader.bindings)
    {
        if (typeof binding?.samplerType !== "string" || !binding.samplerType) continue;
        const uniform = new RegExp(
            `uniform\\s+(?:(?:lowp|mediump|highp)\\s+)?${escapeRegExp(binding.samplerType)}\\s+${escapeRegExp(binding.name)}\\s*;`
        );
        if (!uniform.test(shader.source))
        {
            addIntegrityError(
                errors,
                "sampler_binding_declaration_mismatch",
                `Shader ${shader.key} sampler ${binding.name || "<missing>"} is not declared as ${binding.samplerType}`,
                { stageKey: stage.key, shaderKey: shader.key, bindingName: binding.name || null }
            );
        }
        if (!Number.isSafeInteger(binding.registerIndex)
      || binding.registerIndex < 0
      || !manifestBindings.some((entry) => entry?.kind === "resource" && entry.registerIndex === binding.registerIndex))
        {
            addIntegrityError(
                errors,
                "sampler_resource_contract_mismatch",
                `Shader ${shader.key} sampler ${binding.name || "<missing>"} has no matching manifest resource register`,
                { stageKey: stage.key, shaderKey: shader.key, register: binding.registerIndex }
            );
        }

        const comparison = binding.samplerType.endsWith("Shadow");
        if ((binding.comparison === true) !== comparison)
        {
            addIntegrityError(
                errors,
                "comparison_sampler_contract_mismatch",
                `Shader ${shader.key} sampler ${binding.name || "<missing>"} comparison metadata disagrees with ${binding.samplerType}`,
                { stageKey: stage.key, shaderKey: shader.key, bindingName: binding.name || null }
            );
        }
        if (comparison)
        {
            const samplerRegisters = binding.samplerRegisterIndices;
            if (!Array.isArray(samplerRegisters)
        || !samplerRegisters.length
        || new Set(samplerRegisters).size !== samplerRegisters.length
        || samplerRegisters.some((register) => !Number.isSafeInteger(register)
          || register < 0
          || !manifestBindings.some((entry) => entry?.kind === "sampler"
            && entry.registerIndex === register
            && entry.carbon?.sampler?.comparison === true)))
            {
                addIntegrityError(
                    errors,
                    "comparison_sampler_contract_mismatch",
                    `Shader ${shader.key} comparison sampler ${binding.name || "<missing>"} has invalid manifest sampler pairing`,
                    { stageKey: stage.key, shaderKey: shader.key, bindingName: binding.name || null }
                );
            }
        }
    }
}

function normalizeSemanticName(value)
{
    const name = String(value || "").toUpperCase();
    if (name === "BITANGENT") return "BINORMAL";
    if (name === "BLENDWEIGHTS") return "BLENDWEIGHT";
    return name;
}

function escapeRegExp(value)
{
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addIntegrityError(errors, code, message, details = {})
{
    errors.push({ code, message, ...details });
}
