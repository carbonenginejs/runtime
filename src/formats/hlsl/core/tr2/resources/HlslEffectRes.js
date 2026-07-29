import { HlslReader } from "../../HlslReader.js";
import { asUint8Array } from "@carbonenginejs/runtime-utils/bytes";
import { HlslEffectStateManager } from "../../HlslEffectStateManager.js";
import { HlslShader } from "../shader/HlslShader.js";
import { HlslShaderOption } from "../shader/HlslShaderOption.js";
import { HlslShaderPermutation } from "./HlslShaderPermutation.js";

const MIN_SUPPORTED_EFFECT_VERSION = 8;
const MAX_SUPPORTED_EFFECT_VERSION = 15;

/**
 * Carbon/Trinity effect resource reader for compiled shader metadata.
 */
export class HlslEffectRes
{
    static globalEffectOptions = [];

    /**
   * Creates an empty effect resource ready to load a compiled `.sm_*` payload.
   */
    constructor()
    {
        this.m_data = new Uint8Array(0);
        this.m_version = 0;
        this.m_stringTable = new Uint8Array(0);
        this.m_stringTableSize = 0;
        this.m_offsets = [];
        this.m_offsetCount = 0;
        this.m_permutations = [];
        this.m_shaders = new Map();
        this.m_compilerVersion = null;
        this.m_hash = new Uint8Array(0);
        this.sourcePath = "";
        this.loadError = null;
        this.effectStateManager = new HlslEffectStateManager();
    }

    /**
   * Reads the effect header, string table, permutation axes, and body offsets.
   *
   * @param {ArrayBuffer|ArrayBufferView|Uint8Array} source Compiled effect bytes.
   * @param {object} [options] Load metadata and dependency overrides.
   * @param {string} [options.sourcePath] Source path used in reports.
   * @param {string} [options.source] Alternate source label.
   * @param {HlslEffectStateManager} [options.effectStateManager] Registry to receive decoded state.
   * @returns {boolean} True when the header was decoded successfully.
   */
    DoLoad(source, options = {})
    {
        this._reset();
        this.sourcePath = options.sourcePath || options.source || "";
        this.effectStateManager = options.effectStateManager || new HlslEffectStateManager();

        try
        {
            // Carbon owns a memcpy of the loaded resource. Keep the JS graph
            // equally isolated from later caller mutation.
            this.m_data = Uint8Array.from(asUint8Array(source));
            const stream = new HlslReader(this.m_data, { source: this.sourcePath || "HlslEffectRes" });
            this.m_version = stream.readUint32();

            if (this.m_version < MIN_SUPPORTED_EFFECT_VERSION || this.m_version > MAX_SUPPORTED_EFFECT_VERSION)
            {
                throw new Error(`Unsupported HlslEffectRes version ${this.m_version}; expected ${MIN_SUPPORTED_EFFECT_VERSION}..${MAX_SUPPORTED_EFFECT_VERSION}`);
            }

            if (this.m_version >= 15)
            {
                this.m_compilerVersion = stream.readUint32();
                this.m_hash = stream.readRaw(32);
            }

            this.m_stringTableSize = stream.readUint32();
            if (this.m_stringTableSize > this.m_data.length || stream.offset + this.m_stringTableSize > this.m_data.length)
            {
                throw new Error("Invalid effect string table size");
            }
            this.m_stringTable = this.m_data.subarray(stream.offset, stream.offset + this.m_stringTableSize);
            stream.skip(this.m_stringTableSize);
            stream.setStringTable(this.m_stringTable, this.m_stringTableSize);

            const permutationCount = stream.readUint8();
            for (let index = 0; index < permutationCount; index += 1)
            {
                const permutation = new HlslShaderPermutation();
                permutation.name = stream.readString();
                permutation.defaultOption = stream.readUint8();
                permutation.description = stream.readString();
                permutation.type = this.m_version > 5 ? stream.readUint8() : 0;

                const optionCount = stream.readUint8();
                for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1)
                {
                    permutation.options.push(stream.readString());
                }
                this.m_permutations.push(permutation);
            }

            const headerSize = stream.readUint32();
            if (headerSize === 0)
            {
                throw new Error("Effect contains no compiled shader bodies");
            }

            this.m_offsetCount = headerSize;
            for (let index = 0; index < headerSize; index += 1)
            {
                const record = {
                    index: stream.readUint32(),
                    offset: stream.readUint32(),
                    size: stream.readUint32()
                };
                record.end = record.offset + record.size;
                if (record.end > this.m_data.length)
                {
                    throw new Error(`Invalid effect body record ${index}`);
                }
                this.m_offsets.push(record);
            }

            return true;
        }
        catch (error)
        {
            this.loadError = error;
            this.m_shaders.clear();
            return false;
        }
    }

    /**
   * Mirrors Carbon's prepare hook by clearing cached shader bodies.
   *
   * @returns {boolean} True when preparation completed.
   */
    DoPrepare()
    {
        this.m_shaders.clear();
        return true;
    }

    /**
   * Resolves a permutation option set to a decoded `HlslShader`.
   *
   * @param {Array<HlslShaderOption|object>|Map<string, string>} [options] Local option choices.
   * @param {number|null} [count] Number of local option entries to consider.
   * @returns {HlslShader|null} Decoded shader or null when no matching body exists.
   */
    GetShader(options = [], count = null)
    {
        if (!this.IsGood())
        {
            return null;
        }

        const normalizedOptions = normalizeShaderOptions(options);
        const optionCount = Number.isInteger(count) ? Math.min(count, normalizedOptions.length) : normalizedOptions.length;
        let multiplier = 1;
        let index = 0;

        for (const permutation of this.m_permutations)
        {
            let value = permutation.defaultOption;
            const globalOption = HlslEffectRes.globalEffectOptions.find((entry) => entry.name === permutation.name);
            const localOption = normalizedOptions.slice(0, optionCount).find((entry) => entry.name === permutation.name);
            const selected = globalOption || localOption;

            if (selected)
            {
                const selectedIndex = permutation.options.findIndex((option) => option === selected.value);
                if (selectedIndex >= 0)
                {
                    value = selectedIndex;
                }
            }

            index += value * multiplier;
            multiplier *= permutation.options.length || 1;
        }

        return this.GetShaderByIndex(index);
    }

    /**
   * Decodes the body at an exact permutation-table index without applying
   * global or local option overrides.
   *
   * @param {number} index Exact zero-based permutation-table index.
   * @returns {HlslShader|null} Decoded shader or null when the index/body is unavailable.
   */
    GetShaderByIndex(index)
    {
        if (!Number.isSafeInteger(index) || index < 0)
        {
            throw new TypeError("HlslEffectRes body index must be a non-negative safe integer");
        }
        if (!this.IsGood())
        {
            return null;
        }
        if (this.m_shaders.has(index))
        {
            return this.m_shaders.get(index);
        }

        const offset = this.m_offsets[index];
        if (!offset)
        {
            return null;
        }

        const shader = new HlslShader();
        const buffer = this.m_data.subarray(offset.offset, offset.end);
        const ok = shader.GetEffect().Read(
            buffer,
            offset.size,
            this.m_version,
            this.m_stringTable,
            this.m_stringTableSize,
            this.sourcePath,
            { effectStateManager: this.effectStateManager }
        );
        if (!ok)
        {
            return null;
        }

        shader.ProcessEffect();
        this.m_shaders.set(index, shader);
        return shader;
    }

    /**
   * Reports whether the effect header has been loaded without error.
   *
   * @returns {boolean} True when this resource has usable effect data.
   */
    IsGood()
    {
        return !this.loadError && this.m_data.length > 0 && this.m_version >= MIN_SUPPORTED_EFFECT_VERSION;
    }

    /**
   * Reports whether byte memory usage is known for this resource.
   *
   * @returns {boolean} Always true for byte-backed JavaScript resources.
   */
    IsMemoryUsageKnown()
    {
        return true;
    }

    /**
   * Returns the byte size of the loaded effect payload.
   *
   * @returns {number} Loaded byte count.
   */
    GetMemoryUsage()
    {
        return this.m_data.length;
    }

    /**
   * Clears decoded shader body caches while keeping the loaded header data.
   */
    ReleaseResources()
    {
        this.m_shaders.clear();
    }

    /**
   * Returns JSON-safe permutation metadata for tooling and reports.
   *
   * @returns {object[]} Permutation descriptions.
   */
    GetPermutationDescription()
    {
        return this.m_permutations.map((permutation) => permutation.toJSON());
    }

    /**
   * Returns a JSON-safe summary of the loaded effect resource.
   *
   * @returns {object} Serializable effect resource summary.
   */
    toJSON()
    {
        return {
            version: this.m_version,
            compilerVersion: this.m_compilerVersion,
            sourcePath: this.sourcePath,
            stringTableSize: this.m_stringTableSize,
            offsetCount: this.m_offsetCount,
            permutations: this.m_permutations.map((entry) => entry.toJSON()),
            offsets: this.m_offsets.map((entry) => ({ ...entry })),
            loadError: this.loadError ? {
                name: this.loadError.name,
                message: this.loadError.message
            } : null
        };
    }

    /**
   * Resets loaded state before a new `DoLoad` attempt.
   *
   * @private
   */
    _reset()
    {
        this.m_data = new Uint8Array(0);
        this.m_version = 0;
        this.m_stringTable = new Uint8Array(0);
        this.m_stringTableSize = 0;
        this.m_offsets = [];
        this.m_offsetCount = 0;
        this.m_permutations = [];
        this.m_shaders = new Map();
        this.m_compilerVersion = null;
        this.m_hash = new Uint8Array(0);
        this.loadError = null;
    }
}

/**
 * Applies global shader option overrides used during permutation lookup.
 *
 * @param {Array<HlslShaderOption|object>|Map<string, string>} [changes] Option changes to merge.
 */
export function ModifyGlobalEffectOptions(changes = [])
{
    for (const change of normalizeShaderOptions(changes))
    {
        const index = HlslEffectRes.globalEffectOptions.findIndex((entry) => entry.name === change.name);
        if (!change.value)
        {
            if (index >= 0) HlslEffectRes.globalEffectOptions.splice(index, 1);
        }
        else if (index >= 0)
        {
            HlslEffectRes.globalEffectOptions[index] = change;
        }
        else
        {
            HlslEffectRes.globalEffectOptions.push(change);
        }
    }
}

/**
 * Returns the current global shader option overrides.
 *
 * @returns {HlslShaderOption[]} Copy of global shader option overrides.
 */
export function GetGlobalEffectOptions()
{
    return HlslEffectRes.globalEffectOptions.slice();
}

/**
 * Converts supported option input shapes to `HlslShaderOption` instances.
 *
 * @param {Array<HlslShaderOption|object>|Map<string, string>} options Option input.
 * @returns {HlslShaderOption[]} Normalized option list.
 */
function normalizeShaderOptions(options)
{
    if (options instanceof Map)
    {
        return Array.from(options.entries()).map(([ name, value ]) => new HlslShaderOption(name, value));
    }
    if (!Array.isArray(options))
    {
        return [];
    }
    return options.map((entry) =>
    {
        if (entry instanceof HlslShaderOption)
        {
            return entry;
        }
        return new HlslShaderOption(entry?.name || "", entry?.value || "");
    });
}
