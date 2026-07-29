import { WebglReader, asUint8Array } from "./binary.js";
import { sha256Bytes } from "../../../../format/effect/sha256.js";
import {
    hydrateEffectReflectionForPermutation
} from "../../../../format/effect/effectReflectionPackage.js";

const CEWG_MAGIC = "CEWG";
const CEWG_FORMAT = "CEWG";
const CEWG_VERSION = 1;
const textDecoder = new TextDecoder("utf-8", { fatal: false });
const jsonTextDecoder = new TextDecoder("utf-8", { fatal: true });
const validatedEffectReflectionPackages = new WeakSet();

/**
 * Reader for CarbonEngineJS CEWG shader packages emitted by `hlsl2webgl`.
 */
export class CewgPackage
{
    /**
   * Creates an empty package reader.
   */
    constructor()
    {
        this.version = 0;
        this.chunks = [];
        this.chunkMap = new Map();
        this.jsonCache = new Map();
        this.reflectionBlobIndex = null;
        this.readError = null;
        this.sourcePath = "";
    }

    /**
   * Reads a CEWG package from bytes.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} source CEWG binary bytes.
   * @param {object} [options] Read options.
   * @param {string} [options.sourcePath] Source path for diagnostics.
   * @returns {boolean} True when the package was decoded.
   */
    Read(source, options = {})
    {
        validatedEffectReflectionPackages.delete(this);
        this.version = 0;
        this.chunks = [];
        this.chunkMap = new Map();
        this.jsonCache = new Map();
        this.reflectionBlobIndex = null;
        this.readError = null;
        this.sourcePath = options.sourcePath || "";

        try
        {
            const bytes = asUint8Array(source);
            const stream = new WebglReader(bytes, { source: this.sourcePath || "CEWG" });
            const magic = decodeAscii(stream.readRaw(CEWG_MAGIC.length));
            if (magic !== CEWG_MAGIC)
            {
                throw new Error(`Invalid CEWG magic "${magic}"`);
            }

            this.version = stream.readUint32();
            if (this.version !== CEWG_VERSION)
            {
                throw new Error(`Unsupported CEWG version ${this.version}`);
            }

            const chunkCount = stream.readUint32();
            for (let index = 0; index < chunkCount; index += 1)
            {
                const tag = decodeAscii(stream.readRaw(4));
                validateChunkTag(tag);
                if (this.chunkMap.has(tag))
                {
                    throw new Error(`CEWG package contains duplicate chunk tag ${tag}`);
                }
                const size = stream.readUint32();
                const offset = stream.offset;
                const chunkBytes = stream.readRaw(size);
                const chunk = {
                    tag,
                    size,
                    offset,
                    bytes: chunkBytes
                };
                this.chunks.push(chunk);
                this.chunkMap.set(tag, chunk);
            }

            if (stream.remaining !== 0)
            {
                throw new Error(`CEWG package has ${stream.remaining} trailing bytes`);
            }

            return true;
        }
        catch (error)
        {
            this.readError = error;
            this.chunks = [];
            this.chunkMap = new Map();
            this.jsonCache = new Map();
            this.reflectionBlobIndex = null;
            return false;
        }
    }

    /**
   * Reports whether the package decoded successfully.
   *
   * @returns {boolean} True when no read error is present.
   */
    IsGood()
    {
        return !this.readError && this.version === CEWG_VERSION;
    }

    /**
   * Gets a chunk by four-character tag.
   *
   * @param {string} tag Chunk tag.
   * @returns {{tag:string,size:number,offset:number,bytes:Uint8Array}|null} Chunk record.
   */
    GetChunk(tag)
    {
        return this.chunkMap.get(tag) || null;
    }

    /**
   * Decodes a text chunk.
   *
   * @param {string} tag Chunk tag.
   * @returns {string|null} Decoded text, or null when absent.
   */
    GetText(tag)
    {
        const chunk = this.GetChunk(tag);
        return chunk ? textDecoder.decode(chunk.bytes) : null;
    }

    /**
   * Decodes a JSON chunk.
   *
   * @param {string} tag Chunk tag.
   * @returns {object|null} Parsed JSON, or null when absent.
   */
    GetJson(tag)
    {
        return cloneJson(getCachedJson(this, tag));
    }

    /**
   * Gets translator summary metadata from the `INFO` chunk.
   *
   * @returns {object|null} Info JSON.
   */
    get info()
    {
        return this.GetJson("INFO");
    }

    /**
   * Gets caller-provided Carbon metadata from the `META` chunk.
   *
   * @returns {object|null} Metadata JSON.
   */
    get metadata()
    {
        return this.GetJson("META");
    }

    /**
     * Gets the complete source permutation graph when present.
     *
     * @returns {object|null} Parsed permutation graph.
     */
    get permutationGraph()
    {
        return this.GetJson("PGRF");
    }

    /**
     * Gets complete source effect reflection when present.
     *
     * @returns {object|null} Parsed reflection document.
     */
    get reflection()
    {
        return this.GetJson("RFLX");
    }

    /**
     * Gets the raw reflection blob store when present.
     *
     * @returns {Uint8Array|null} RBLB bytes.
     */
    get reflectionBlobBytes()
    {
        return this.GetChunk("RBLB")?.bytes ?? null;
    }

    /**
     * Copies one reflected byte payload by blob key or exact reference.
     *
     * @param {string|object} value Blob key or exact RFLX byte-reference object.
     * @returns {Uint8Array|null} Owned payload bytes, or null when unavailable.
     */
    GetReflectionBlob(value)
    {
        const key = typeof value === "string" ? value : value?.blobKey;
        if (!this.reflectionBlobIndex)
        {
            this.reflectionBlobIndex = new Map(
                (getCachedJson(this, "RFLX")?.blobStore?.blobs ?? []).map((entry) => [
                    entry.blobKey,
                    entry
                ])
            );
        }
        const entry = this.reflectionBlobIndex.get(key);
        const bytes = this.reflectionBlobBytes;
        if (!entry || !bytes) return null;
        if (typeof value !== "string"
            && (!value
                || value.offset !== entry.offset
                || value.byteLength !== entry.byteLength
                || value.sha256 !== entry.sha256))
        {
            return null;
        }
        const end = entry.offset + entry.byteLength;
        if (!Number.isSafeInteger(entry.offset) || entry.offset < 0
            || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0
            || end > bytes.byteLength
            || sha256Bytes(bytes.subarray(entry.offset, end)) !== entry.sha256)
        {
            return null;
        }
        return Uint8Array.from(bytes.subarray(entry.offset, end));
    }

    /**
     * Gets fully hydrated portable source reflection for one permutation.
     *
     * Every reflected byte field is returned as a fresh owned `Uint8Array`.
     *
     * @param {number} [permutationIndex] Exact PGRF permutation index.
     * @returns {object|null} Validated portable reflection, or null when absent.
     */
    GetPortableEffectReflection(permutationIndex)
    {
        if (!validatedEffectReflectionPackages.has(this)) return null;
        const reflection = getCachedJson(this, "RFLX");
        const permutationGraph = getCachedJson(this, "PGRF");
        if (!reflection || !permutationGraph) return null;
        const selectedIndex = permutationIndex
            ?? getCachedJson(this, "INFO")?.defaultPermutationIndex
            ?? 0;
        return hydrateEffectReflectionForPermutation(
            reflection,
            permutationGraph,
            selectedIndex,
            (reference) => this.GetReflectionBlob(reference)
        );
    }

    /**
   * Gets translated GLSL source from the `GLSL` chunk.
   *
   * @returns {string|null} GLSL source.
   */
    get glsl()
    {
        return this.GetText("GLSL");
    }

    /**
   * Gets translated GLSL metadata when the `GLSL` chunk contains JSON.
   *
   * Whole-effect packages store a JSON stage set in this chunk; single-stage
   * packages store raw GLSL text and return null here.
   *
   * @returns {object|null} Parsed GLSL stage set, or null for raw source.
   */
    get glslJson()
    {
        try
        {
            return this.GetJson("GLSL");
        }
        catch
        {
            return null;
        }
    }

    /**
   * Gets original DXBC bytes when present.
   *
   * @returns {Uint8Array|null} DXBC bytes.
   */
    get dxbc()
    {
        return this.GetChunk("DXBC")?.bytes || null;
    }

    /**
   * Returns a JSON-safe package summary.
   *
   * @returns {object} Serializable summary.
   */
    toJSON()
    {
        return {
            format: CEWG_FORMAT,
            version: this.version,
            sourcePath: this.sourcePath,
            chunks: this.chunks.map((chunk) => ({
                tag: chunk.tag,
                size: chunk.size,
                offset: chunk.offset
            })),
            readError: this.readError ? {
                name: this.readError.name,
                message: this.readError.message
            } : null
        };
    }
}

/**
 * Marks one package as having passed the canonical v3 reflection envelope.
 *
 * This is intentionally an internal deep import rather than package-root API.
 *
 * @param {CewgPackage} pkg Validated package reader.
 * @returns {void}
 */
export function markEffectReflectionValidated(pkg)
{
    validatedEffectReflectionPackages.add(pkg);
}

/**
 * Decode and cache one private JSON document.
 *
 * @param {CewgPackage} pkg Package reader.
 * @param {string} tag Chunk tag.
 * @returns {object|null} Private parsed JSON, or null when absent.
 */
function getCachedJson(pkg, tag)
{
    if (!pkg.jsonCache.has(tag))
    {
        const chunk = pkg.GetChunk(tag);
        pkg.jsonCache.set(
            tag,
            chunk ? JSON.parse(jsonTextDecoder.decode(chunk.bytes)) : null
        );
    }
    return pkg.jsonCache.get(tag);
}

/**
 * Copy JSON-compatible data without reparsing its source chunk.
 *
 * @param {any} value Cached JSON value.
 * @returns {any} Structurally independent JSON value.
 */
function cloneJson(value)
{
    if (Array.isArray(value)) return value.map(cloneJson);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [
            key,
            cloneJson(entry)
        ]));
    }
    return value;
}

function validateChunkTag(tag)
{
    if (typeof tag !== "string"
        || tag.length !== 4
        || [ ...tag ].some((character) =>
        {
            const code = character.charCodeAt(0);
            return code < 0x21 || code > 0x7e;
        }))
    {
        throw new Error(`Invalid CEWG chunk tag ${JSON.stringify(tag)}`);
    }
}

/**
 * Decodes an ASCII four-character code.
 *
 * @param {Uint8Array} bytes Four-byte tag payload.
 * @returns {string} ASCII string.
 */
function decodeAscii(bytes)
{
    return String.fromCharCode(...bytes);
}
