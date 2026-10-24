import { meta, type } from "#schema";

/** Application-owned foundation selection; prepared records retain resource provenance. */
@meta.define("CjsPaperDollArchetype")
export class CjsPaperDollArchetype
{
    _options = new Map();
    _option = "";
    _defaultOption = "";
    _dirty = false;
    _strength = 1;
    _defaultStrength = 1;

    /** Selected prepared foundation identity. */
    @meta.property()
    @type.string
    @meta.ui.description("Archetype")
    get option() { return this._option; }
    /** Selects only a fully resolved prepared foundation. */
    set option(value)
    {
        if (!this._options.has(value)) throw new RangeError("Unknown prepared archetype");
        if (value !== this._option) { this._option = value; this._dirty = true; }
    }

    /** User-selected shape weight, independent of retained authored dependency weights. */
    @meta.property()
    @type.float32
    @meta.ui.description("Archetype strength")
    get strength() { return this._strength; }
    /** Marks the foundation dirty without resetting any other component selection. */
    set strength(value)
    {
        const weight = Math.fround(value);
        if (!Number.isFinite(weight) || weight < 0) throw new RangeError("Archetype strength must be a finite nonnegative float");
        if (weight !== this._strength) { this._strength = weight; this._dirty = true; }
    }

    /** Validates every prepared foundation before replacing the selection catalog. */
    Configure(options, { option, strength = 1 } = {})
    {
        const prepared = new Map();
        for (const entry of options)
        {
            if (!entry.id || prepared.has(entry.id)) throw new TypeError("Invalid archetype identity");
            prepared.set(entry.id, { id: entry.id, label: entry.label || entry.id,
                foundation: CjsPaperDollArchetype.resolve(entry) });
        }
        if (!prepared.has(option)) throw new RangeError("An explicit prepared archetype is required");
        const weight = Math.fround(strength);
        if (!Number.isFinite(weight) || weight < 0) throw new RangeError("Invalid initial archetype strength");
        this._strength = weight;
        this._defaultStrength = weight;
        this._options = prepared;
        this._defaultOption = option;
        this._option = option;
        this._dirty = true;
    }

    /** Returns qualified choices; there is no optional or disabled foundation. */
    GetOptions() { return [...this._options.values()].map(({ id, label }) => ({ id, label })); }

    /** Returns an owned snapshot; callers cannot mutate the retained foundation. */
    Resolve() { return this._option ? { ...structuredClone(this._options.get(this._option).foundation), strength: this._strength } : null; }

    /** Restores the configured initial foundation without resetting modifier values. */
    Reset() { if (this._defaultOption) { this.option = this._defaultOption; this.strength = this._defaultStrength; } }

    /** Reports an unapplied foundation selection. */
    IsDirty() { return this._dirty; }

    /** Acknowledges the captured selection before invoking a prepared binding. */
    ClearDirty() { this._dirty = false; }

    /** Requests reapplication of the selected foundation. */
    Rebuild() { if (this._option) this._dirty = true; }

    /**
     * Resolves an explicitly prepared foundation graph, never filename heuristics.
     * Parts carry exact material roles and dependencies from the input adapter.
     * Head and archetype remain separate identities. All dependency edges and
     * weights survive, including repeated references at different weights; this
     * does not apply morphs or interpret a dependency weight as texture opacity.
     * Missing archetype channels require an explicit per-channel fallback source.
     */
    static resolve(entry)
    {
        const { id, head, genericHead, body, skeleton, parts, fallbacks = {} } = entry;
        if (!id || !head || !genericHead || !body || !skeleton) throw new TypeError("Incomplete foundation selection");
        const records = new Map();
        for (const part of parts)
        {
            if (!part.id || records.has(part.id)) throw new TypeError("Ambiguous foundation part");
            records.set(part.id, part);
        }
        const visited = new Set(), active = new Set(), dependencies = [];
        const visit = key =>
        {
            if (active.has(key)) throw new Error("Cyclic foundation dependency: " + key);
            if (visited.has(key)) return;
            const part = records.get(key);
            if (!part) throw new Error("Missing foundation dependency: " + key);
            active.add(key);
            for (const edge of part.dependencies || [])
            {
                if (!Number.isFinite(edge.weight) || edge.weight < 0) throw new TypeError("Invalid dependency weight");
                dependencies.push({ from: key, to: edge.part, weight: edge.weight, source: edge.source });
                visit(edge.part);
            }
            active.delete(key); visited.add(key);
        };
        for (const key of [id, head, genericHead, body]) visit(key);
        if (!dependencies.some(edge => edge.from === head && edge.to === id)) throw new Error("Head does not declare the selected archetype");
        const bindings = {}, origins = {};
        for (const region of ["head", "body"])
        {
            bindings[region] = {}; origins[region] = {};
            for (const channel of ["DiffuseMap", "NormalMap", "SpecularMap"])
            {
                const role = region + "." + channel;
                let owner = id, path = records.get(id).textures?.[role];
                if (!path) { owner = fallbacks[role]; path = records.get(owner)?.textures?.[role]; }
                if (!owner || !visited.has(owner) || !path) throw new Error("Unresolved foundation channel: " + role);
                bindings[region][channel] = path;
                origins[region][channel] = { part: owner, fallback: owner !== id };
            }
        }
        const support = records.get(genericHead), supportBindings = {};
        for (const channel of ["DiffuseMap", "NormalMap", "SpecularMap", "CutMaskMap"])
        {
            const path = support.textures?.["head." + channel];
            if (!path) throw new Error("Missing generic support channel: " + channel);
            supportBindings[channel] = path;
        }
        const models = [...visited].filter(key => records.get(key).model).map(key => ({ part: key, path: records.get(key).model }));
        for (const key of [genericHead, body]) if (!records.get(key).model) throw new Error("Missing foundation model: " + key);
        return structuredClone({ archetype: id, head, genericHead, body, skeleton, bindings, origins,
            supportBindings, models, dependencies, parts: [...visited].map(key => records.get(key)),
            source: entry.source, selections: entry.selections || [] });
    }
}
