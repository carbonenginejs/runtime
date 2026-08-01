/**
 * Inspects CEWG stage records for complete WebGL2 raster passes.
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
export function inspectCewgRasterCompleteness(stages, shaders)
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
export function isCewgComputeFragmentContract(value)
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
 * Inspects a decoded effect container for the contracts a WebGL 2 runtime needs.
 *
 * This replaces `inspectCewgPackageIntegrity`, which took the chunk package's
 * INFO, META and GLSL records. Most of that function was bookkeeping about the
 * chunk format rather than about the effect, and it is not carried across:
 *
 * - **Envelope and kind checks** (`invalid_package_envelope`,
 *   `unsupported_package_kind`) asserted the magic strings `CEWG` /
 *   `CEWG_GLSL_SET` and a `packageKind` naming the chunk layout. They described
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
    if (!isCewgComputeFragmentContract(contract)) return "has no valid compute-fragment host contract";
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
