import { CjsCarbonEffectReader } from "../../../format/carbonEffect/CjsCarbonEffectReader.js";
import { HlslShaderStageNames } from "../../hlsl/core/tr2/HlslRenderContextEnum.js";

/**
 * Cheap inspection of a WebGL effect container.
 *
 * The chunk package's inspection reported tags, offsets and sizes, because a
 * chunk file's structure *was* a list of tagged byte ranges. A Carbon v15
 * container has no such list, so none of that vocabulary is carried across. A
 * `chunks` array describing a container would be a lie, and a believed one.
 *
 * What a container's structure actually is: an arena of strings, a set of
 * permutation axes, and an offset table whose rows point at description bodies —
 * with rows deliberately aliased onto one body when permutations share a
 * translation. So that is what this reports: how many rows, how many distinct
 * bodies they resolve to, how much of the file is arena, and what the axes are.
 *
 * `uniqueBodyCount` and `aliasedRowCount` come from the reader's own structural
 * diagnostics rather than being recomputed here — the reader already validates
 * every row's byte range while building them, so a second walk could only
 * disagree with the thing that already refused to construct.
 *
 * Body decoding is done once per *distinct* body offset, not once per row.
 * Effects here reach 4,096 permutations over a few dozen bodies, so decoding per
 * row would make an inspection call cost more than the packaging that produced
 * the file.
 */

/**
 * Names a Carbon stage type.
 *
 * `HlslShaderStageNames` is the enum, so it is used rather than a local table.
 * A hand-written `{0:"vertex",1:"pixel",5:"compute"}` was in the tree and is
 * wrong: Carbon's compute is 2 and 5 is domain, so it renamed domain stages to
 * "compute" and left real compute stages unnamed. Nothing caught it because no
 * effect in the corpus has either stage.
 *
 * @param {number} type Carbon stage type code.
 * @returns {string} Stage name.
 */
function stageName(type)
{
    return HlslShaderStageNames[type] ?? `type${type}`;
}

/**
 * Counts programs and backend blocks across the container's distinct bodies.
 *
 * A stage slot with zero-length `shaderData` is a declared stage that carries no
 * stored program — the shape `buildCarbonEffectContainer` emits for a body the
 * translator could not lower. Counting those separately is the whole point: a
 * container with every stage present and every program empty would otherwise
 * inspect identically to a complete one.
 *
 * @param {CjsCarbonEffectReader} reader Container reader.
 * @returns {{programCount:number, emptyProgramCount:number, backendBlockCount:number,
 *   techniqueCount:number, passCount:number, stageNames:string[]}} Body tallies.
 */
function inspectBodies(reader)
{
    const seenOffsets = new Set();
    const stageNames = new Set();
    let programCount = 0;
    let emptyProgramCount = 0;
    let backendBlockCount = 0;
    let techniqueCount = 0;
    let passCount = 0;

    for (let index = 0; index < reader.records.length; index += 1)
    {
        const { offset } = reader.records[index];
        if (seenOffsets.has(offset)) continue;
        seenOffsets.add(offset);

        const description = reader.readDescription(index, { backend: true });
        for (const technique of description.techniques)
        {
            techniqueCount += 1;
            for (const pass of technique.passes)
            {
                passCount += 1;
                if (pass.backendBlock?.size) backendBlockCount += 1;
                for (const stage of pass.stages)
                {
                    stageNames.add(stageName(stage.type));
                    if (stage.shaderData?.size) programCount += 1;
                    else emptyProgramCount += 1;
                }
            }
        }
    }

    return {
        programCount,
        emptyProgramCount,
        backendBlockCount,
        techniqueCount,
        passCount,
        stageNames: [ ...stageNames ].sort()
    };
}

/**
 * Inspects WebGL effect container bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container payload.
 * @param {object} [values] Normalized format values.
 * @param {string} [values.source] Source name, for diagnostics.
 * @returns {object} Plain summary data.
 */
export function inspectGlslEffectContainer(input, values = {})
{
    const source = values.source ?? "memory";
    const reader = new CjsCarbonEffectReader(input, { source });
    const bodies = inspectBodies(reader);

    return {
        source,
        isContainer: true,
        version: reader.version,
        compilerVersion: [ ...reader.compilerVersion ],
        byteLength: reader.bytes.length,
        arenaByteLength: reader.stringTableSize,

        // The offset table, and what it resolves to. `recordCount` counts rows;
        // `uniqueBodyCount` counts the bodies those rows point at. The gap
        // between them is the sharing, which is the container's whole reason for
        // being cheaper than one file per permutation.
        recordCount: reader.diagnostics.recordCount,
        permutationProduct: reader.diagnostics.permutationProduct,
        dense: reader.diagnostics.dense,
        uniqueBodyCount: reader.diagnostics.uniqueBodyCount,
        aliasedRowCount: reader.diagnostics.aliasedRowCount,

        permutationAxes: reader.permutations.map((axis) => ({
            name: axis.name.value,
            type: axis.type,
            defaultOption: axis.defaultOption,
            options: axis.options.map((option) => option.value)
        })),

        ...bodies
    };
}

export default inspectGlslEffectContainer;
