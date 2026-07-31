import {
    CjsCarbonEffectReader,
    readBackendBlock
} from "../../../../format/carbonEffect/index.js";
import { WGSL_ENTRY_POINT } from "../buildCarbonEffectContainer.js";

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
export function looksLikeCewgpuContainer(bytes)
{
    if (!bytes || bytes.length < 4) return false;
    return bytes[0] === 15 && bytes[1] === 0 && bytes[2] === 0 && bytes[3] === 0;
}

/**
 * Reader over one WebGPU effect container.
 */
export class CewgpuContainer
{
    /**
     * Creates an empty container reader.
     */
    constructor()
    {
        this.readError = null;
        this.sourcePath = "";
        this.containerVersion = 0;
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

            this.carbon = new CjsCarbonEffectReader(bytes, {
                source: this.sourcePath || "CEWGPU"
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
            throw new Error(`CEWGPU container has no body at permutation ${permutationIndex}`);
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
                permutationCount: this.carbon.records
                    .filter((entry) => entry.offset === offset).length
            }));
        }

        return Object.freeze({
            axes: Object.freeze(this.carbon.permutations.map((axis) => Object.freeze({
                name: axis.name.value,
                defaultOption: axis.defaultOption,
                description: axis.description.value,
                type: axis.type,
                options: Object.freeze(axis.options.map((option) => option.value))
            }))),
            variants: Object.freeze(this.carbon.records.map((record, permutationIndex) =>
                Object.freeze({
                    permutationIndex,
                    bodyKey: bodyKeys.get(record.offset)
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
                        source: this.sourcePath || "CEWGPU"
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
     * Returns the Carbon description for one permutation as the source
     * reflection.
     *
     * Under the record layout the reflection is not a separate document that
     * could drift from the programs; it is the same records the programs live
     * in.
     *
     * @param {number} [permutationIndex] Permutation index.
     * @returns {object|null} Description record tree.
     */
    GetPortableEffectReflection(permutationIndex = 0)
    {
        if (!this.IsGood()) return null;
        return this.GetDescription(permutationIndex);
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
            format: "CEWGPU",
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

export default CewgpuContainer;
