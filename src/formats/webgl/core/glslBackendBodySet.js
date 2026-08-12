import { detailMapTransformFor } from "../../hlsl/core/detailMapFamily.js";
import { localLightProfileNeutralTransformFor } from "../../hlsl/core/localLightFamily.js";

/**
 * Reshapes translated GLSL into the backend body set the Carbon container
 * writer consumes.
 *
 * This is the WebGL counterpart of `formats/webgpu/core/effectBackendBodySet.js`
 * and deliberately emits the same envelope, because `buildCarbonEffectContainer`
 * is backend-neutral and should stay that way: it wants bodies, passes and
 * translation units, and does not care what language the programs are in.
 *
 * Two facts drive the shape here, and neither is obvious:
 *
 * 1. **Body keys must be the permutation graph's, not this package's.** The
 *    effect walk mints `body_${offset}_${size}` while the graph mints
 *    `body${N}`. The container writer drives off graph variants, so a package
 *    key reaching it would silently match nothing. The bridge is the
 *    permutation index, not string surgery on either spelling.
 *
 * 2. **A translation unit is per pass, never per shader.** One DXBC vertex body
 *    can lower to several different GLSL programs, because `pairVaryings`
 *    zero-fills the varyings a paired pixel stage reads but the vertex stage
 *    never writes - and that set differs per pass. Deduplicating programs by
 *    bytecode would therefore collapse two genuinely different programs into
 *    one. The unit signature includes the pass key for exactly this reason.
 */

/**
 * Carbon's pass identity, matching the WebGPU emitter so both backends key
 * passes identically.
 *
 * @param {string} techniqueName Technique name.
 * @param {number} passIndex Pass index within the technique.
 * @returns {string} Pass key.
 */
function passKeyFor(techniqueName, passIndex)
{
    return `${techniqueName}.pass${passIndex}`;
}

/**
 * Stable signature for one pass translation unit.
 *
 * Includes `passKey` because pass-scoped varying pairing can make two units
 * differ while their source bytecode is identical. Excludes diagnostics
 * (`emitWarnings`, `hlsl2webgl`) because they describe the build, not the
 * program, and would split otherwise-identical units.
 *
 * @param {object} unit Candidate unit.
 * @returns {string} Signature.
 */
function unitSignature(unit)
{
    return JSON.stringify({
        passKey: unit.passKey,
        shaders: unit.shaders,
        block: unit.block,
        resourceTransforms: unit.resourceTransforms
    });
}

/**
 * Collect the per-stage data that has no home in Carbon reflection.
 *
 * Carbon records the logical resource and its register; these are the lowering
 * decisions taken on top of that - fused sampler pairs, synthesised data
 * textures and UBOs, dropped stub registers, and integer attributes lowered to
 * float. The GLSL text declares them but does not say how to build or bind
 * them, and reflection does not know they happened.
 *
 * Identifiers are kept. An earlier version of this comment claimed `cb{n}`,
 * `s{n}` and `attr{n}` are functions of the register index alone and so need not
 * be stored. They are not: the pixel stage remaps constant-buffer slot 0 to
 * `cb7` (`DxbcGlslEmitter.js`, `pixelConstantBufferRemap`), so an identifier
 * depends on the register *and* the stage, through a profile table. Deriving it
 * downstream would re-implement that policy, and a divergence would show up as a
 * uniform that never binds rather than as an error.
 *
 * @param {object} shader Translated shader record.
 * @returns {object|null} Stage block data, or null when the stage adds nothing.
 */
function stageBlockFor(shader)
{
    const block = {};

    if (Array.isArray(shader.bindings) && shader.bindings.length)
    {
        block.bindings = shader.bindings;
    }
    if (Array.isArray(shader.stageInputs) && shader.stageInputs.length)
    {
        block.stageInputs = shader.stageInputs;
    }
    if (shader.computeFragment)
    {
        block.computeFragment = shader.computeFragment;
    }

    return Object.keys(block).length ? block : null;
}

/**
 * Build the backend body set for a translated WebGL effect.
 *
 * @param {object} input Translation results.
 * @param {Array<object>} input.bodies Body records from the effect walk.
 * @param {Array<object>} input.stages Stage records from the effect walk.
 * @param {Array<object>} input.shaders Translated shader records.
 * @param {Array<object>} input.variants Export variants, carrying permutation indices.
 * @param {object} input.permutationGraph Validated permutation graph.
 * @returns {object} Backend body set in the container writer's shape.
 */
export function buildGlslBackendBodySet(input)
{
    const { bodies, stages, shaders, variants, permutationGraph } = input;

    const shadersByKey = new Map(shaders.map((shader) => [ shader.key, shader ]));
    const stagesByBody = new Map();
    for (const stage of stages)
    {
        if (!stagesByBody.has(stage.bodyKey)) stagesByBody.set(stage.bodyKey, []);
        stagesByBody.get(stage.bodyKey).push(stage);
    }

    // Package body key -> the graph's own key, bridged through the permutation
    // index rather than by reformatting either spelling.
    const graphKeyByPackageKey = new Map();
    const permutationIndexByPackageKey = new Map();
    for (const variant of variants)
    {
        if (graphKeyByPackageKey.has(variant.bodyKey)) continue;
        const graphVariant = permutationGraph.variants[variant.permutationIndex];
        if (!graphVariant) continue;
        graphKeyByPackageKey.set(variant.bodyKey, graphVariant.bodyKey);
        permutationIndexByPackageKey.set(variant.bodyKey, variant.permutationIndex);
    }

    const passUnits = [];
    const unitKeyBySignature = new Map();
    const emittedBodies = [];

    for (const body of bodies)
    {
        const graphBodyKey = graphKeyByPackageKey.get(body.key);
        if (!graphBodyKey) continue;

        const representativePermutationIndex =
            permutationIndexByPackageKey.get(body.key) ?? 0;

        if (body.error)
        {
            emittedBodies.push(Object.freeze({
                bodyKey: graphBodyKey,
                representativePermutationIndex,
                status: "unsupported",
                error: body.error,
                passes: Object.freeze([])
            }));
            continue;
        }

        const passes = new Map();
        for (const stage of stagesByBody.get(body.key) ?? [])
        {
            const key = passKeyFor(stage.techniqueName, stage.passIndex);
            if (!passes.has(key))
            {
                passes.set(key, { passKey: key, shaders: [], block: {}, transforms: [] });
            }

            const shader = shadersByKey.get(stage.shaderKey);
            // A stage the translator could not lower carries no program. The
            // body still emits, with reflection intact and an empty slot, so
            // the offset table stays dense and the failure is visible rather
            // than absent.
            if (!shader?.source) continue;

            const entry = passes.get(key);

            // The merge is a property of the pass, not of one stage: the block's
            // transform section says how to build the array the GLSL samples.
            // Built here rather than at translation time because the transform's
            // identity includes the pass key, which the translator does not know.
            if (shader.detailMapArray && !entry.hasDetailMapTransform)
            {
                entry.hasDetailMapTransform = true;
                entry.transforms.push(detailMapTransformFor(shader.detailMapArray, key));
            }

            // Same reasoning, different statement: this one records that the
            // light profile array was dropped for a constant, so the resource
            // the description still lists is accounted for rather than missing.
            if (shader.lightProfileNeutral && !entry.hasLightProfileTransform)
            {
                const transform = localLightProfileNeutralTransformFor(shader.lightProfileNeutral, key);
                if (transform)
                {
                    entry.hasLightProfileTransform = true;
                    entry.transforms.push(transform);
                }
            }

            entry.shaders.push({
                key: `${key}.${stage.stageName}`,
                stageName: stage.stageName,
                stageType: stage.stageType,
                code: shader.source
            });

            const stageBlock = stageBlockFor(shader);
            if (stageBlock) entry.block[stage.stageName] = stageBlock;
        }

        const bodyPasses = [];
        let translatedPassCount = 0;

        for (const pass of passes.values())
        {
            if (!pass.shaders.length) continue;
            translatedPassCount += 1;

            const unit = {
                passKey: pass.passKey,
                shaders: pass.shaders,
                block: Object.keys(pass.block).length ? pass.block : null,
                resourceTransforms: pass.transforms
            };
            const signature = unitSignature(unit);
            let unitKey = unitKeyBySignature.get(signature);

            if (!unitKey)
            {
                unitKey = `unit${passUnits.length}`;
                unitKeyBySignature.set(signature, unitKey);
                passUnits.push(Object.freeze({ key: unitKey, ...unit }));
            }

            bodyPasses.push(Object.freeze({ passKey: pass.passKey, unitKey }));
        }

        emittedBodies.push(Object.freeze({
            bodyKey: graphBodyKey,
            representativePermutationIndex,
            status: translatedPassCount ? "translated" : "unsupported",
            error: translatedPassCount ? null : "no pass produced a translated program",
            passes: Object.freeze(bodyPasses)
        }));
    }

    return Object.freeze({
        format: "CJS_GLSL_BODY_SET",
        formatVersion: 1,
        bodyCount: emittedBodies.length,
        translatedBodyCount: emittedBodies.filter((body) => body.status === "translated").length,
        passUnitCount: passUnits.length,
        passUnits: Object.freeze(passUnits),
        bodies: Object.freeze(emittedBodies)
    });
}

export default buildGlslBackendBodySet;
