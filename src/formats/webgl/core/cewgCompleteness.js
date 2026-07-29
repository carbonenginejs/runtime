/**
 * Inspects CEWG stage records for complete WebGL2 raster passes.
 *
 * Geometry and compute stages are not raster-pair members. A raster pass is
 * complete only when both its vertex and pixel records exist and their shared
 * shader records contain successful translated source.
 *
 * @param {object[]} stages CEWG stage records.
 * @param {object[]} shaders CEWG translated shader records.
 * @returns {{ expectedPassCount: number, completePassCount: number, incompletePasses: object[] }}
 */
export function inspectCewgRasterCompleteness(stages, shaders)
{
    const shaderMap = new Map((shaders || []).map((shader) => [ shader.key, shader ]));
    const usesSharedShaders = Array.isArray(shaders);
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

            const shader = usesSharedShaders ? shaderMap.get(stage.shaderKey) : stage;
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

const DIAGNOSTIC_INTEGRITY_CODES = new Set([
    "declared_partial_package",
    "failed_body",
    "failed_metadata_body",
    "filtered_package_scope",
    "incomplete_pass_stage_family",
    "unsupported_pass_stage_family",
    "unsupported_stage",
    "unavailable_stage_shader",
    "unadapted_compute_stage",
    "variant_body_has_no_program"
]);

/** Returns true only for integrity failures allowed in explicit diagnostic packages. */
export function isCewgDiagnosticIntegrityError(error)
{
    return DIAGNOSTIC_INTEGRITY_CODES.has(error?.code);
}

/** Requires one unambiguous copy of every runtime-critical CEWG chunk. */
export function inspectCewgCoreChunks(chunks)
{
    const errors = [];
    for (const tag of [ "INFO", "META", "GLSL" ])
    {
        const count = (chunks || []).filter((chunk) => chunk?.tag === tag).length;
        if (count !== 1)
        {
            errors.push({
                code: "invalid_core_chunk_cardinality",
                tag,
                count,
                message: `CEWG package must contain exactly one ${tag} chunk; found ${count}`
            });
        }
    }
    return { ok: errors.length === 0, errors };
}

/** Formats a bounded error message for incomplete CEWG raster passes. */
export function formatIncompleteCewgPasses(incompletePasses, limit = 8)
{
    return (incompletePasses || []).slice(0, limit).map((entry) =>
    {
        const problems = [
            ...entry.missingStages.map((stage) => `missing ${stage}`),
            ...entry.unavailableStages.map((stage) => `${stage.stageName}: ${stage.reason}`),
            ...(entry.duplicateStages || []).map((stage) => `duplicate ${stage}`)
        ];
        return `${entry.bodyKey} ${entry.techniqueName}[${entry.passIndex}] (${problems.join(", ")})`;
    }).join("; ");
}

/**
 * Inspects the complete all-permutation CEWG graph and declared package
 * failure counts. Legacy selected-only stage arrays receive the stage checks
 * that are possible without variant/body/shader tables.
 */
export function inspectCewgPackageIntegrity(info, metadata, glsl)
{
    const errors = [];
    if (!glsl || typeof glsl !== "object")
    {
        addIntegrityError(errors, "missing_glsl_set", "CEWG GLSL stage set is missing");
        return { ok: false, errors };
    }

    checkEnvelopeValue(info, "format", "CEWG", "INFO", errors);
    if (![ 1, 2, 3 ].includes(info?.formatVersion))
    {
        addIntegrityError(
            errors,
            "invalid_package_envelope",
            `INFO formatVersion must be 1, 2, or 3, got ${info?.formatVersion ?? "<missing>"}`,
            {
                section: "INFO",
                field: "formatVersion",
                expected: [ 1, 2, 3 ],
                actual: info?.formatVersion ?? null
            }
        );
    }
    checkEnvelopeValue(glsl, "format", "CEWG_GLSL_SET", "GLSL", errors);
    checkEnvelopeValue(glsl, "formatVersion", 1, "GLSL", errors);
    checkSourceIdentity(info, errors);
    const packageModes = new Map([
        [ "tr2-effect-webgl-permutations", "all" ],
        [ "tr2-effect-webgl", "selected" ]
    ]);
    const expectedMode = packageModes.get(info?.packageKind);
    if (!expectedMode)
    {
        addIntegrityError(
            errors,
            "unsupported_package_kind",
            `INFO packageKind is not a supported effect package: ${info?.packageKind ?? "<missing>"}`
        );
    }
    if (![ "all", "selected" ].includes(info?.permutationMode))
    {
        addIntegrityError(errors, "invalid_permutation_mode", `INFO permutationMode is invalid: ${info?.permutationMode ?? "<missing>"}`);
    }
    if (![ "all", "selected" ].includes(glsl.permutationMode))
    {
        addIntegrityError(errors, "invalid_permutation_mode", `GLSL permutationMode is invalid: ${glsl.permutationMode ?? "<missing>"}`);
    }
    if (expectedMode && info?.permutationMode !== expectedMode)
    {
        addIntegrityError(
            errors,
            "package_mode_mismatch",
            `INFO packageKind ${info.packageKind} requires permutationMode ${expectedMode}`
        );
    }
    if (info?.permutationMode !== glsl.permutationMode)
    {
        addIntegrityError(
            errors,
            "package_mode_mismatch",
            `INFO permutationMode ${info?.permutationMode ?? "<missing>"} does not match GLSL ${glsl.permutationMode ?? "<missing>"}`
        );
    }

    checkPackageSelection(info?.selection, glsl.selection, errors);
    if (expectedMode)
    {
        for (const field of [ "variants", "bodies", "stages", "shaders" ])
        {
            if (!Array.isArray(glsl[field]))
            {
                addIntegrityError(errors, "missing_graph_array", `GLSL ${field} array is required`, { field });
            }
        }
        if (!metadata || typeof metadata !== "object")
        {
            addIntegrityError(errors, "missing_metadata", "CEWG META object is required");
        }
        else
        {
            for (const field of [ "variants", "bodies", "permutations" ])
            {
                if (!Array.isArray(metadata[field]))
                {
                    addIntegrityError(errors, "missing_metadata_array", `META ${field} array is required`, { field });
                }
            }
        }
    }

    const stages = Array.isArray(glsl.stages) ? glsl.stages : [];
    const usesSharedShaders = Array.isArray(glsl.shaders);
    const shaders = usesSharedShaders ? glsl.shaders : [];
    const bodies = Array.isArray(glsl.bodies) ? glsl.bodies : [];
    const variants = Array.isArray(glsl.variants) ? glsl.variants : [];
    const metadataBodies = Array.isArray(metadata?.bodies) ? metadata.bodies : [];
    const metadataVariants = Array.isArray(metadata?.variants) ? metadata.variants : [];
    const stageMap = keyedRecords(stages, "stage", errors);
    const shaderMap = usesSharedShaders ? keyedRecords(shaders, "shader", errors) : new Map();
    const bodyMap = keyedRecords(bodies, "body", errors);
    const metadataBodyMap = keyedRecords(metadataBodies, "metadata body", errors);
    const variantMap = usesSharedShaders ? keyedRecords(variants, "variant", errors) : new Map();
    const metadataVariantMap = usesSharedShaders
        ? keyedRecords(metadataVariants, "metadata variant", errors)
        : new Map();
    if (usesSharedShaders)
    {
        if (!variants.length) addIntegrityError(errors, "missing_variants", "Shared-shader CEWG package has no variants");
    }
    const referencedStages = new Set();
    const referencedShaders = new Set();
    const referencedBodies = new Set();
    const passGroups = new Map();

    for (const field of [ "failedShaderCount", "excludedShaderCount", "failedBodyCount" ])
    {
        const count = Number(info?.[field] || 0);
        if (count > 0)
        {
            addIntegrityError(errors, "declared_partial_package", `INFO ${field} is ${count}`, { field, count });
        }
    }

    const completeness = inspectCewgRasterCompleteness(stages, usesSharedShaders ? shaders : undefined);
    checkRequiredCount(info, "bodyStageCount", stages.length, errors);
    if (usesSharedShaders)
    {
        const excludedShaderCount = shaders.filter((shader) => shader?.excluded).length;
        const failedShaderCount = shaders.filter((shader) => !shader?.hlsl2webgl?.ok && !shader?.excluded).length;
        const failedBodyCount = bodies.filter((body) => body?.error).length;
        const availableShaderCount = shaders.filter((shader) => shader?.hlsl2webgl?.ok && shader.source).length;
        checkRequiredCount(info, "permutationCount", variants.length, errors);
        checkRequiredCount(info, "uniqueBodyCount", bodies.length, errors);
        checkRequiredCount(info, "uniqueShaderCount", shaders.length, errors);
        checkRequiredCount(info, "translatedShaderCount", shaders.length - failedShaderCount - excludedShaderCount, errors);
        checkRequiredCount(info, "excludedShaderCount", excludedShaderCount, errors);
        checkRequiredCount(info, "failedShaderCount", failedShaderCount, errors);
        checkRequiredCount(info, "failedBodyCount", failedBodyCount, errors);
        checkRequiredCount(info, "availableShaderCount", availableShaderCount, errors);
        checkRequiredCount(info, "expectedRasterPassCount", completeness.expectedPassCount, errors);
        checkRequiredCount(info, "completeRasterPassCount", completeness.completePassCount, errors);
        checkRequiredCount(info, "incompleteRasterPassCount", completeness.incompletePasses.length, errors);
    }

    if (usesSharedShaders)
    {
        const permutationIndexes = new Set();
        for (const variant of variants)
        {
            referencedBodies.add(variant.bodyKey);
            if (!bodyMap.has(variant.bodyKey))
            {
                addIntegrityError(
                    errors,
                    "missing_variant_body",
                    `Variant ${variant.key || "<unknown>"} references missing body ${variant.bodyKey}`,
                    { variantKey: variant.key || null, bodyKey: variant.bodyKey || null }
                );
            }
            if (!Number.isSafeInteger(variant.permutationIndex) || variant.permutationIndex < 0)
            {
                addIntegrityError(
                    errors,
                    "invalid_permutation_index",
                    `Variant ${variant.key || "<unknown>"} has invalid permutation index ${variant.permutationIndex}`,
                    { variantKey: variant.key || null, permutationIndex: variant.permutationIndex }
                );
            }
            else if (permutationIndexes.has(variant.permutationIndex))
            {
                addIntegrityError(
                    errors,
                    "duplicate_permutation_index",
                    `Permutation index ${variant.permutationIndex} is used more than once`,
                    { permutationIndex: variant.permutationIndex }
                );
            }
            else
            {
                permutationIndexes.add(variant.permutationIndex);
            }

            const metadataVariant = metadataVariantMap.get(variant.key);
            if (!metadataVariant)
            {
                addIntegrityError(
                    errors,
                    "missing_metadata_variant",
                    `GLSL variant ${variant.key || "<unknown>"} has no matching metadata variant`,
                    { variantKey: variant.key || null }
                );
            }
            else if (metadataVariant.bodyKey !== variant.bodyKey
        || metadataVariant.permutationIndex !== variant.permutationIndex)
            {
                addIntegrityError(
                    errors,
                    "variant_metadata_mismatch",
                    `GLSL variant ${variant.key} does not match its metadata body/permutation mapping`,
                    { variantKey: variant.key }
                );
            }
        }

        for (const variant of metadataVariants)
        {
            if (variant?.key && !variantMap.has(variant.key))
            {
                addIntegrityError(
                    errors,
                    "orphan_metadata_variant",
                    `Metadata variant ${variant.key} has no matching GLSL variant`,
                    { variantKey: variant.key }
                );
            }
        }

        for (const variant of metadataVariants)
        {
            if (!metadataBodyMap.has(variant.bodyKey))
            {
                addIntegrityError(
                    errors,
                    "missing_metadata_variant_body",
                    `Metadata variant ${variant.key || "<unknown>"} references missing body ${variant.bodyKey}`,
                    { variantKey: variant.key || null, bodyKey: variant.bodyKey || null }
                );
            }
            if (variant.tableIndexMatchesPermutationIndex !== true
        || !Number.isSafeInteger(variant.tableIndex)
        || variant.tableIndex < 0
        || variant.tableIndex !== variant.permutationIndex)
            {
                addIntegrityError(
                    errors,
                    "permutation_table_mismatch",
                    `Variant ${variant.key || "<unknown>"} table index does not match its permutation index`,
                    { variantKey: variant.key || null }
                );
            }
        }
        checkPermutationCoverage(metadata?.permutations, info?.permutationMode, variants, errors);

        for (const body of bodies)
        {
            if (!metadataBodyMap.has(body.key))
            {
                addIntegrityError(
                    errors,
                    "missing_metadata_body",
                    `GLSL body ${body.key || "<unknown>"} has no matching metadata body`,
                    { bodyKey: body.key || null }
                );
            }
            if (!referencedBodies.has(body.key))
            {
                addIntegrityError(errors, "orphan_body", `Body ${body.key} is not referenced by a variant`, { bodyKey: body.key });
            }
            if (body.error)
            {
                addIntegrityError(errors, "failed_body", `Body ${body.key} failed: ${body.error}`, { bodyKey: body.key });
            }
            if (!Array.isArray(body.stages))
            {
                addIntegrityError(errors, "missing_body_stages", `Body ${body.key} has no stage list`, { bodyKey: body.key });
                continue;
            }

            const localStages = new Set();
            for (const stageKey of body.stages)
            {
                if (localStages.has(stageKey))
                {
                    addIntegrityError(
                        errors,
                        "duplicate_body_stage_reference",
                        `Body ${body.key} references stage ${stageKey} more than once`,
                        { bodyKey: body.key, stageKey }
                    );
                }
                localStages.add(stageKey);
                referencedStages.add(stageKey);

                const stage = stageMap.get(stageKey);
                if (!stage)
                {
                    addIntegrityError(
                        errors,
                        "missing_body_stage",
                        `Body ${body.key} references missing stage ${stageKey}`,
                        { bodyKey: body.key, stageKey }
                    );
                }
                else if (stage.bodyKey !== body.key)
                {
                    addIntegrityError(
                        errors,
                        "stage_body_mismatch",
                        `Stage ${stageKey} belongs to ${stage.bodyKey}, not ${body.key}`,
                        { bodyKey: body.key, stageKey, stageBodyKey: stage.bodyKey || null }
                    );
                }
            }
        }
    }

    for (const body of metadataBodies)
    {
        if (body?.key && !bodyMap.has(body.key))
        {
            addIntegrityError(
                errors,
                "orphan_metadata_body",
                `Metadata body ${body.key} has no matching GLSL body`,
                { bodyKey: body.key }
            );
        }
        if (body.error)
        {
            addIntegrityError(
                errors,
                "failed_metadata_body",
                `Metadata body ${body.key} failed: ${body.error}`,
                { bodyKey: body.key }
            );
        }
    }

    for (const stage of stages)
    {
        if (!stage || typeof stage !== "object")
        {
            addIntegrityError(errors, "invalid_stage_record", "GLSL stage record must be an object");
            continue;
        }
        const expectedStageTypes = { vertex: 0, pixel: 1, compute: 2, geometry: 3, hull: 4, domain: 5 };
        if (typeof stage.techniqueName !== "string" || !stage.techniqueName)
        {
            addIntegrityError(errors, "invalid_stage_technique", `Stage ${stage.key || "<unknown>"} has no technique name`);
        }
        if (!Number.isSafeInteger(stage.passIndex) || stage.passIndex < 0)
        {
            addIntegrityError(
                errors,
                "invalid_stage_pass_index",
                `Stage ${stage.key || "<unknown>"} has invalid pass index ${stage.passIndex}`,
                { stageKey: stage.key || null, passIndex: stage.passIndex }
            );
        }
        if (expectedStageTypes[stage.stageName] !== stage.stageType)
        {
            addIntegrityError(
                errors,
                "stage_type_mismatch",
                `Stage ${stage.key || "<unknown>"} type ${stage.stageType} does not match ${stage.stageName || "<missing>"}`,
                { stageKey: stage.key || null, stageType: stage.stageType, stageName: stage.stageName || null }
            );
        }
        if (usesSharedShaders)
        {
            const expectedLocalKey = `${stage.techniqueName}.pass${stage.passIndex}.${stage.stageName}`;
            if (stage.localKey !== expectedLocalKey || stage.key !== `${stage.bodyKey}.${expectedLocalKey}`)
            {
                addIntegrityError(
                    errors,
                    "stage_key_mismatch",
                    `Stage ${stage.key || "<unknown>"} does not match its body/technique/pass/stage identity`,
                    { stageKey: stage.key || null }
                );
            }
        }
        if (typeof stage.techniqueName === "string"
      && stage.techniqueName
      && Number.isSafeInteger(stage.passIndex)
      && stage.passIndex >= 0)
        {
            const passKey = `${stage.bodyKey || "selected"}:${stage.techniqueName}:${stage.passIndex}`;
            const group = passGroups.get(passKey) || [];
            group.push(stage);
            passGroups.set(passKey, group);
        }

        if (usesSharedShaders && !bodyMap.has(stage.bodyKey))
        {
            addIntegrityError(
                errors,
                "missing_stage_body",
                `Stage ${stage.key} references missing body ${stage.bodyKey}`,
                { stageKey: stage.key, bodyKey: stage.bodyKey || null }
            );
        }
        if (usesSharedShaders && !referencedStages.has(stage.key))
        {
            addIntegrityError(errors, "orphan_stage", `Stage ${stage.key} is not referenced by its body`, { stageKey: stage.key });
        }

        const shader = usesSharedShaders ? shaderMap.get(stage.shaderKey) : stage;
        if (usesSharedShaders)
        {
            referencedShaders.add(stage.shaderKey);
            if (!shader)
            {
                addIntegrityError(
                    errors,
                    "missing_stage_shader",
                    `Stage ${stage.key} references missing shader ${stage.shaderKey}`,
                    { stageKey: stage.key, shaderKey: stage.shaderKey || null }
                );
                continue;
            }
            if (shader.stageName !== stage.stageName)
            {
                addIntegrityError(
                    errors,
                    "shader_stage_mismatch",
                    `Shader ${shader.key} is ${shader.stageName || "<missing>"}, not ${stage.stageName}`,
                    { stageKey: stage.key, shaderKey: shader.key }
                );
            }
            for (const field of [ "bindings", "stageInputs", "stageOutputs" ])
            {
                if (!Array.isArray(shader[field]))
                {
                    addIntegrityError(
                        errors,
                        "missing_runtime_contract",
                        `Shader ${shader.key} has no ${field} runtime contract array`,
                        { stageKey: stage.key, shaderKey: shader.key, field }
                    );
                }
            }

            const metadataBody = metadataBodyMap.get(stage.bodyKey);
            const manifestStages = metadataBody?.manifest?.stages;
            if (!Array.isArray(manifestStages))
            {
                addIntegrityError(
                    errors,
                    "missing_manifest_stages",
                    `Metadata body ${stage.bodyKey} has no manifest stage array`,
                    { bodyKey: stage.bodyKey, stageKey: stage.key }
                );
            }
            else
            {
                const manifestStage = manifestStages.find((entry) => entry?.techniqueName === stage.techniqueName
          && entry.passIndex === stage.passIndex
          && entry.stageType === stage.stageType
          && entry.stageName === stage.stageName);
                if (!manifestStage)
                {
                    addIntegrityError(
                        errors,
                        "missing_manifest_stage",
                        `Stage ${stage.key} has no matching META manifest stage`,
                        { bodyKey: stage.bodyKey, stageKey: stage.key }
                    );
                }
                else if (stage.stageName === "vertex" && Array.isArray(shader.stageInputs))
                {
                    const expectedInputs = (manifestStage.pipelineInputs || []).filter((input) => Number(input?.usedMask || 0) !== 0);
                    for (const input of expectedInputs)
                    {
                        if (!shader.stageInputs.some((entry) => entry?.register === input.registerIndex
              && normalizeSemanticName(entry.semanticName) === normalizeSemanticName(input.usageName)
              && entry.semanticIndex === input.usageIndex))
                        {
                            addIntegrityError(
                                errors,
                                "vertex_input_contract_mismatch",
                                `Vertex shader ${shader.key} is missing manifest input ${input.usageName}${input.usageIndex} at register ${input.registerIndex}`,
                                { stageKey: stage.key, shaderKey: shader.key, register: input.registerIndex }
                            );
                        }
                    }
                }
                if (manifestStage) validateShaderRuntimeContract(shader, stage, manifestStage, errors);
            }
        }

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

    if (usesSharedShaders)
    {
        for (const shader of shaders)
        {
            if (!referencedShaders.has(shader.key))
            {
                addIntegrityError(errors, "orphan_shader", `Shader ${shader.key} is not referenced by a stage`, { shaderKey: shader.key });
            }
        }

        const completeBodies = new Set();
        for (const stage of stages)
        {
            const shader = shaderMap.get(stage.shaderKey);
            if (stage.stageName === "compute"
        && isCewgComputeFragmentContract(shader?.computeFragment)
        && shader?.hlsl2webgl?.ok
        && shader.source)
            {
                completeBodies.add(stage.bodyKey);
            }
        }
        for (const body of bodies)
        {
            if (completeness.incompletePasses.some((pass) => pass.bodyKey === body.key)) continue;
            if (completeness.expectedPassCount > 0)
            {
                const hasCompleteRaster = stages.some((stage) =>
                    stage.bodyKey === body.key
          && stage.stageName === "vertex"
          && completeness.incompletePasses.every((pass) =>
              pass.bodyKey !== body.key
            || pass.techniqueName !== stage.techniqueName
            || pass.passIndex !== stage.passIndex
          )
          && stages.some((pixel) =>
              pixel.bodyKey === body.key
            && pixel.techniqueName === stage.techniqueName
            && pixel.passIndex === stage.passIndex
            && pixel.stageName === "pixel"
          )
                );
                if (hasCompleteRaster) completeBodies.add(body.key);
            }
        }
        for (const variant of variants)
        {
            if (bodyMap.has(variant.bodyKey) && !completeBodies.has(variant.bodyKey))
            {
                addIntegrityError(
                    errors,
                    "variant_body_has_no_program",
                    `Variant ${variant.key || "<unknown>"} body ${variant.bodyKey} has no complete WebGL2 program`,
                    { variantKey: variant.key || null, bodyKey: variant.bodyKey || null }
                );
            }
        }
    }

    return { ok: errors.length === 0, errors };
}

/** Formats bounded package-integrity errors for CLI output. */
export function formatCewgIntegrityErrors(errors, limit = 8)
{
    return (errors || []).slice(0, limit).map((entry) => `${entry.code}: ${entry.message}`).join("; ");
}

function keyedRecords(records, label, errors)
{
    const map = new Map();
    for (const record of records)
    {
        if (!record?.key)
        {
            addIntegrityError(errors, `missing_${label.replace(/\s+/g, "_")}_key`, `${label} record has no key`);
            continue;
        }
        if (map.has(record.key))
        {
            addIntegrityError(errors, `duplicate_${label.replace(/\s+/g, "_")}_key`, `Duplicate ${label} key ${record.key}`);
            continue;
        }
        map.set(record.key, record);
    }
    return map;
}

function checkPackageSelection(infoSelection, glslSelection, errors)
{
    const valid = (selection) => selection
    && typeof selection === "object"
    && !Array.isArray(selection)
    && (selection.technique === null || (typeof selection.technique === "string" && selection.technique.length > 0))
    && (selection.pass === null || (Number.isSafeInteger(selection.pass) && selection.pass >= 0))
    && (selection.stage === null || (typeof selection.stage === "string" && selection.stage.length > 0));
    if (!valid(infoSelection) || !valid(glslSelection))
    {
        addIntegrityError(errors, "invalid_package_selection", "INFO and GLSL must contain valid selection descriptors");
        return;
    }
    if (infoSelection.technique !== glslSelection.technique
    || infoSelection.pass !== glslSelection.pass
    || infoSelection.stage !== glslSelection.stage)
    {
        addIntegrityError(errors, "package_selection_mismatch", "INFO and GLSL selection descriptors do not match");
    }
    if (infoSelection.technique !== null || infoSelection.pass !== null || infoSelection.stage !== null)
    {
        addIntegrityError(
            errors,
            "filtered_package_scope",
            "Technique/pass/stage filters produce a diagnostic partial package",
            { selection: { ...infoSelection } }
        );
    }
}

function checkPermutationCoverage(permutations, mode, variants, errors)
{
    if (!Array.isArray(permutations)) return;
    let count = 1;
    let defaultIndex = 0;
    let multiplier = 1;
    const names = new Set();
    for (const permutation of permutations)
    {
        const optionCount = Array.isArray(permutation?.options) ? permutation.options.length : 0;
        if (typeof permutation?.name !== "string" || !permutation.name || names.has(permutation.name))
        {
            addIntegrityError(
                errors,
                "invalid_permutation_description",
                `Permutation name is missing or duplicated: ${permutation?.name || "<missing>"}`
            );
            return;
        }
        names.add(permutation.name);
        if (optionCount < 1)
        {
            addIntegrityError(
                errors,
                "invalid_permutation_description",
                `Permutation ${permutation?.name || "<unknown>"} has no options`
            );
            return;
        }
        const optionValues = new Set();
        if (permutation.options.some((option) => typeof option !== "string" || !option || optionValues.has(option)
      || !optionValues.add(option)))
        {
            addIntegrityError(
                errors,
                "invalid_permutation_description",
                `Permutation ${permutation.name} has a missing or duplicate option value`
            );
            return;
        }
        if (!Number.isSafeInteger(permutation.defaultOption)
      || permutation.defaultOption < 0
      || permutation.defaultOption >= optionCount)
        {
            addIntegrityError(
                errors,
                "invalid_permutation_description",
                `Permutation ${permutation.name || "<unknown>"} has invalid default option ${permutation.defaultOption}`
            );
            return;
        }
        defaultIndex += permutation.defaultOption * multiplier;
        multiplier *= optionCount;
        count *= optionCount;
        if (!Number.isSafeInteger(count) || !Number.isSafeInteger(defaultIndex))
        {
            addIntegrityError(errors, "invalid_permutation_description", "Permutation table exceeds safe integer range");
            return;
        }
    }

    const indexes = new Set(variants.map((variant) => variant?.permutationIndex));
    if (mode === "all")
    {
        if (variants.length !== count)
        {
            addIntegrityError(
                errors,
                "incomplete_permutation_coverage",
                `All-permutation package has ${variants.length} variants, expected ${count}`,
                { actual: variants.length, expected: count }
            );
            return;
        }
        for (let index = 0; index < count; index += 1)
        {
            if (!indexes.has(index))
            {
                addIntegrityError(
                    errors,
                    "incomplete_permutation_coverage",
                    `All-permutation package is missing index ${index}`,
                    { permutationIndex: index }
                );
                break;
            }
        }
    }
    else if (mode === "selected"
    && (variants.length !== 1 || variants[0]?.permutationIndex !== defaultIndex))
    {
        addIntegrityError(
            errors,
            "invalid_selected_permutation",
            `Selected package must contain only default permutation index ${defaultIndex}`,
            { expected: defaultIndex, actual: variants.map((variant) => variant?.permutationIndex) }
        );
    }
}

function checkEnvelopeValue(record, field, expected, label, errors)
{
    if (record?.[field] !== expected)
    {
        addIntegrityError(
            errors,
            "invalid_package_envelope",
            `${label} ${field} must be ${expected}, got ${record?.[field] ?? "<missing>"}`,
            { section: label, field, expected, actual: record?.[field] ?? null }
        );
    }
}

function checkSourceIdentity(info, errors)
{
    const identity = info?.sourceIdentity;
    const optionalString = (value) => value === null || (typeof value === "string" && value.length > 0);
    const optionalMd5 = (value) => value === null || /^[0-9a-f]{32}$/u.test(value || "");
    const valid = identity
    && typeof identity === "object"
    && !Array.isArray(identity)
    && typeof identity.filePath === "string"
    && identity.filePath.length > 0
    && optionalString(identity.logicalPath)
    && optionalString(identity.game)
    && optionalString(identity.client)
    && optionalString(identity.build)
    && Number.isSafeInteger(identity.byteLength)
    && identity.byteLength >= 0
    && optionalMd5(identity.md5)
    && /^[0-9a-f]{64}$/u.test(identity.sha256 || "")
    && info.sourceByteLength === identity.byteLength
    && info.sourceMd5 === identity.md5
    && info.sourceSha256 === identity.sha256;
    if (!valid)
    {
        addIntegrityError(
            errors,
            "invalid_source_identity",
            "INFO source identity is missing, malformed, or inconsistent with its checksum fields"
        );
    }
}

function checkRequiredCount(info, field, actual, errors)
{
    if (!Number.isSafeInteger(info?.[field]) || info[field] < 0)
    {
        addIntegrityError(
            errors,
            "invalid_declared_count",
            `INFO ${field} must be a non-negative safe integer`,
            { field, declared: info?.[field] ?? null, actual }
        );
    }
    else if (info[field] !== actual)
    {
        addIntegrityError(
            errors,
            "declared_count_mismatch",
            `INFO ${field} is ${info[field]}, graph contains ${actual}`,
            { field, declared: info[field], actual }
        );
    }
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
