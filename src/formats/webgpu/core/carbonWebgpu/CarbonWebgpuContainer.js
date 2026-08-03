import {
    CjsCarbonEffectReader,
    readBackendBlock
} from "../../../../format/carbonEffect/index.js";
import { WGSL_ENTRY_POINT } from "../buildCarbonEffectContainer.js";
import { sha256Bytes } from "../../../../format/effect/sha256.js";
import {
    looksLikeCarbonEffectContainer
} from "../../../../format/carbonEffect/CjsCarbonEffectReader.js";
import { deriveBackendBodySet } from "./containerViews.js";

/**
 * Reader for the WebGPU effect container.
 *
 * The chunk package stored the permutation graph, the source reflection, the
 * translated body set and the emitted WGSL as four documents that had to be kept
 * consistent with each other, and carried digests to detect when they were not.
 * Under the record layout there is one document. The permutation graph is the
 * header's own permutation records and offset table, the reflection is the
 * description tree, and a translated pass is that tree's `shaderData` plus its
 * trailing block. So the accessors below are **views**, not stored copies, and
 * the class of bug the digests guarded against cannot occur: there is nothing
 * left to disagree.
 *
 * Keys the chunk format stored explicitly are derived here instead:
 *
 * - a body key is its position among distinct offset-table entries, which is
 *   exactly what Carbon's alias dedupe produces;
 * - a pass's technique name, pass index and stage name come from its position in
 *   the record tree, which is why cross-technique passes share on the wire;
 * - the WGSL entry point is a constant of the emitter, asserted on write.
 */

const textDecoder = new TextDecoder("utf-8", { fatal: false });

/** WGSL stage names by Carbon stage type, for the stage types WebGPU supports. */
const WEBGPU_STAGE_NAME = Object.freeze({ 0: "vertex", 1: "pixel", 2: "compute" });

/** WebGPU pipeline stage for a WGSL stage name. */
const WEBGPU_STAGE = Object.freeze({ vertex: "vertex", pixel: "fragment", compute: "compute" });

/**
 * Reports whether bytes look like a Carbon v15 effect container.
 *
 * This is a **shape** check, not an identity check, and the distinction is the
 * point: our containers are stock Carbon v15 files, so nothing in the bytes
 * separates ours from a shipped `effect.dx11` file. Identity comes from where
 * the file was resolved — `effect.webgpu/` versus `effect.dx11/` — exactly as it
 * does for Carbon, whose three backend trees are also byte-format-identical.
 *
 * Use this to reject something that is not a v15 container at all. Do not use it
 * to decide what a payload is.
 *
 * @param {Uint8Array} bytes Candidate bytes.
 * @returns {boolean} True when the first dword is Carbon's v15 version.
 */
export function looksLikeCarbonWebgpuContainer(bytes)
{
    // Delegates rather than repeating the version dword. WebGL needs the same
    // check, and a second hand-written copy of one constant is a second chance
    // to disagree with it.
    return looksLikeCarbonEffectContainer(bytes);
}

/**
 * Decomposes a permutation index into per-axis option indices.
 *
 * The inverse of Carbon's own selection arithmetic: it accumulates
 * `value * multiplier` over the axes in declaration order, multiplying the
 * running radix by each axis's option count.
 *
 * @param {object[]} axes Permutation axis records.
 * @param {number} permutationIndex Permutation index.
 * @returns {number[]} Option index per axis.
 */
function optionIndicesFor(axes, permutationIndex)
{
    let remaining = permutationIndex;
    return axes.map((axis) =>
    {
        const radix = axis.options.length || 1;
        const value = remaining % radix;
        remaining = Math.floor(remaining / radix);
        return value;
    });
}

/**
 * Reader over one WebGPU effect container.
 */
export class CarbonWebgpuContainer
{
    /**
     * Creates an empty container reader.
     */
    constructor()
    {
        this.readError = null;
        this.sourcePath = "";
        this.containerVersion = 0;
        this.bytes = null;
        this.carbon = null;
        this._descriptions = new Map();
        this._bodyKeyByOffset = null;
    }

    /**
     * Reads a container from bytes.
     *
     * @param {ArrayBuffer|ArrayBufferView|Uint8Array} source Container bytes.
     * @param {object} [options] Read options.
     * @param {string} [options.sourcePath] Source path for diagnostics.
     * @returns {boolean} True when the container was decoded.
     */
    Read(source, options = {})
    {
        this.readError = null;
        this.sourcePath = options.sourcePath || "";
        this._descriptions = new Map();
        this._bodyKeyByOffset = null;

        try
        {
            const bytes = source instanceof Uint8Array
                ? source
                : (source instanceof ArrayBuffer
                    ? new Uint8Array(source)
                    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength));

            this.bytes = bytes;
            this.carbon = new CjsCarbonEffectReader(bytes, {
                source: this.sourcePath || "CARBON_WEBGPU"
            });
            this.containerVersion = this.carbon.version;
            return true;
        }
        catch (error)
        {
            this.readError = error;
            this.carbon = null;
            return false;
        }
    }

    /**
     * Reports whether the container decoded.
     *
     * @returns {boolean} True when readable.
     */
    IsGood()
    {
        return this.carbon !== null;
    }

    /**
     * Reads one permutation's description, memoised by stored body.
     *
     * Aliased permutations share one stored blob, so they share one parse.
     *
     * @param {number} permutationIndex Permutation index.
     * @returns {object} Description record tree.
     */
    GetDescription(permutationIndex)
    {
        const record = this.carbon.records[permutationIndex];
        if (!record)
        {
            throw new Error(`Carbon WebGPU container has no body at permutation ${permutationIndex}`);
        }
        if (!this._descriptions.has(record.offset))
        {
            this._descriptions.set(
                record.offset,
                this.carbon.readDescription(permutationIndex, { backend: true })
            );
        }
        return this._descriptions.get(record.offset);
    }

    /**
     * Maps each distinct stored body to a stable key, in offset-table order.
     *
     * @returns {Map<number, string>} Body key by stored offset.
     */
    get bodyKeyByOffset()
    {
        if (!this._bodyKeyByOffset)
        {
            const keys = new Map();
            for (const record of this.carbon.records)
            {
                if (!keys.has(record.offset)) keys.set(record.offset, `body${keys.size}`);
            }
            this._bodyKeyByOffset = keys;
        }
        return this._bodyKeyByOffset;
    }

    /**
     * Derives the permutation graph the chunk package used to store.
     *
     * @returns {object} Permutation graph view.
     */
    get permutationGraph()
    {
        const bodyKeys = this.bodyKeyByOffset;
        const bodies = [];

        for (const [ offset, key ] of bodyKeys)
        {
            const record = this.carbon.records.find((entry) => entry.offset === offset);
            bodies.push(Object.freeze({
                key,
                offset,
                byteLength: record.size,
                // Hashed from the stored description blob. The chunk graph
                // carried a digest per body; here it is a function of the bytes
                // it identifies, so it cannot disagree with them. It is also what
                // Tr2EffectRes uses to prove bodies are distinct -- aliased rows
                // share one blob and therefore one digest, which is exactly the
                // identity the offset table already expresses.
                sha256: sha256Bytes(this.bytes.subarray(offset, offset + record.size)),
                permutationCount: this.carbon.records
                    .filter((entry) => entry.offset === offset).length
            }));
        }

        return Object.freeze({
            // The envelope the chunk `PGRF` document carried. Not provenance:
            // `Tr2EffectRes.SetPayload` validates it before accepting a payload
            // at all, so a graph without it is refused outright.
            format: "CJS_EFFECT_PERMUTATION_GRAPH",
            formatVersion: 1,
            // Fixed by construction rather than recorded. A container always
            // carries every permutation, the offset table gives body identity
            // only, and source reflection is not a separate document.
            coverage: Object.freeze({
                permutations: "complete",
                bodies: "identity-only",
                reflection: "absent"
            }),
            axes: Object.freeze(this.carbon.permutations.map((axis, index) => Object.freeze({
                index,
                name: axis.name.value,
                defaultOption: axis.defaultOption,
                description: axis.description.value,
                type: axis.type,
                options: Object.freeze(axis.options.map((option) => option.value))
            }))),
            variants: Object.freeze(this.carbon.records.map((record, permutationIndex) =>
                Object.freeze({
                    permutationIndex,
                    bodyKey: bodyKeys.get(record.offset),
                    // Mixed-radix decomposition of the index over the axes, which
                    // is the inverse of the sum Carbon's GetShader() builds when
                    // it walks options in declaration order.
                    optionIndices: Object.freeze(
                        optionIndicesFor(this.carbon.permutations, permutationIndex)
                    ),
                    // The offset-table row itself. Aliased permutations share a
                    // stored record, so the consumer can prove that two
                    // permutations resolve to the same emitted bytes.
                    sourceRecord: Object.freeze({
                        offset: record.offset,
                        byteLength: record.size
                    })
                }))),
            bodies: Object.freeze(bodies)
        });
    }

    /**
     * Resolves the translated backend passes for one permutation.
     *
     * A body whose stages carry no program is reported unsupported, which is
     * what a zero-length `shaderData` means: the reflection is known, the
     * program is not.
     *
     * @param {number} [permutationIndex] Permutation index.
     * @returns {object|null} Resolved backend body.
     */
    GetBackendBodyPrograms(permutationIndex = 0)
    {
        if (!this.IsGood()) return null;

        const record = this.carbon.records[permutationIndex];
        if (!record) return null;

        const description = this.GetDescription(permutationIndex);
        const bodyKey = this.bodyKeyByOffset.get(record.offset);
        const passes = [];
        let translated = false;

        for (const technique of description.techniques)
        {
            for (const [ passIndex, pass ] of technique.passes.entries())
            {
                const passKey = `${technique.name.value}.pass${passIndex}`;
                const shaders = [];

                for (const stage of pass.stages)
                {
                    const stageName = WEBGPU_STAGE_NAME[stage.type];
                    if (!stageName || stage.shaderData.size === 0) continue;
                    translated = true;
                    shaders.push(Object.freeze({
                        key: `${passKey}.${stageName}`,
                        techniqueName: technique.name.value,
                        passIndex,
                        stageName,
                        stage: WEBGPU_STAGE[stageName],
                        stageType: stage.type,
                        entryPoint: WGSL_ENTRY_POINT,
                        code: textDecoder.decode(stage.shaderData.bytes),
                        ...(stageName === "compute"
                            ? { threadGroupSize: [ ...stage.threadGroupSize ] }
                            : {})
                    }));
                }

                if (!shaders.length) continue;

                const block = pass.backendBlock && pass.backendBlock.size !== 0
                    ? readBackendBlock(pass.backendBlock.bytes, {
                        layoutKey: passKey,
                        source: this.sourcePath || "CARBON_WEBGPU"
                    })
                    : null;

                passes.push(Object.freeze({
                    passKey,
                    shaders: Object.freeze(shaders),
                    layouts: Object.freeze(block
                        ? [ Object.freeze({
                            key: passKey,
                            techniqueName: technique.name.value,
                            passIndex,
                            bindGroups: block.bindGroups
                        }) ]
                        : []),
                    ...(block?.transforms?.length
                        ? { resourceTransforms: Object.freeze(block.transforms) }
                        : {})
                }));
            }
        }

        return Object.freeze({
            permutationIndex,
            bodyKey,
            status: translated ? "translated" : "unsupported",
            error: translated ? null : "body carries no translated programs",
            passes: Object.freeze(passes)
        });
    }

    /**
     * Derives the body-set view, for consumers holding the raw container.
     *
     * `packageToJson` exposes the same document. A consumer taking the raw emit
     * reads it here instead, which is why this is a getter on the container
     * rather than only a field in the JSON projection.
     *
     * @returns {object} Body-set document.
     */
    get backendBodySet()
    {
        return deriveBackendBodySet(this);
    }

    /**
     * Summarises the container without materialising every body.
     *
     * @returns {object} Container summary.
     */
    get info()
    {
        const bodyKeys = this.bodyKeyByOffset;
        return Object.freeze({
            format: "CARBON_WEBGPU",
            // Carbon's own version dword, always 15. There is no container
            // version of ours: see buildCarbonEffectContainer for why nothing
            // announces the payload, and why identity comes from the path.
            containerVersion: this.containerVersion,
            sourcePath: this.sourcePath,
            compilerVersion: Object.freeze([ ...this.carbon.compilerVersion ]),
            sourceHash: textDecoder.decode(this.carbon.sourceHash),
            permutationCount: this.carbon.records.length,
            uniqueBodyCount: bodyKeys.size,
            axisCount: this.carbon.permutations.length
        });
    }
}

export default CarbonWebgpuContainer;
