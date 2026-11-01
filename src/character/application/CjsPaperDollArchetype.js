import { meta, type } from "#schema";
import { IsMatch } from "#blueexposure/INotify";

/**
 * Application-owned foundation selection; prepared records retain resource provenance.
 *
 * It also holds the sculpt: a weight per face or body morph (by morph name,
 * e.g. `CheeksUpper_rightShape`), baked with the archetype's morph. A sculpt
 * edit is a shape-only change: it marks the selection dirty but not the
 * foundation, so materials stay and shape-dependent parts rebake. The range is
 * the host's to choose (the creator's per-bloodline limits, or free).
 */
@meta.define("CjsPaperDollArchetype")
export class CjsPaperDollArchetype
{

    _options = new Map();

    _defaultOption = "";

    _dirty = false;

    _foundationDirty = false;

    _defaultStrength = 1;

    _sculpt = new Map();

    /** The configured foundation resolver, or null when every option arrived prepared. */
    _resolve = null;

    /** Each foundation preparation in flight or done, by id; a failed one is forgotten so it can be retried. */
    _resolving = new Map();

    /** Selected prepared foundation identity. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.string
    @meta.ui.description("Archetype")
    option = "";

    /** Shape weight, independent of retained authored dependency weights. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST | meta.NOTIFY)
    @type.float32
    @meta.ui.description("Archetype strength")
    strength = 1;

    /**
     * Marks pending work, distinguishing foundation replacement from shape edits.
     * @param {string|string[]|null} propertyName The notified input names.
     * @returns {void}
     */
    OnModified(propertyName)
    {
        this._dirty = true;
        if (IsMatch(propertyName, "option")) this._foundationDirty = true;
    }

    /**
     * Resolves prepared foundation graphs and installs the initial input values.
     *
     * An entry that carries its prepared record (`parts`) is resolved now. One that carries only `id` and `label`
     * is completed by `resolve` the first time `ResolveOption` asks for it, so a bloodline's files are read only
     * when it is chosen.
     * @param {object[]} options Prepared foundation records, or `{ id, label }` for one prepared on first use.
     * @param {object} [settings] The initial option and strength, and the resolver.
     * @param {string} [settings.option] The initial option; it must be prepared.
     * @param {number} [settings.strength=1] The initial strength.
     * @param {?function(string): Promise<object>} [settings.resolve=null] Prepares one foundation record.
     * @returns {void}
     */
    Configure(options, { option, strength = 1, resolve = null } = {})
    {
        const prepared = new Map();
        for (const entry of options)
        {
            prepared.set(entry.id, { id: entry.id, label: entry.label || entry.id,
                foundation: entry.parts ? CjsPaperDollArchetype.resolve(entry) : null });
        }
        const weight = Math.fround(strength);
        this.strength = weight;
        this._defaultStrength = weight;
        this._options = prepared;
        this._resolve = resolve;
        this._resolving = new Map();
        this._defaultOption = option;
        this.option = option;
        this._foundationDirty = true;
        this._dirty = true;
    }

    /**
     * Prepares one foundation through the configured resolver, once: the record it answers is resolved into the
     * option's foundation graph. Concurrent calls share one preparation; a failed one is forgotten, so the next
     * call retries it.
     * @param {string} id The archetype id.
     * @returns {Promise<?object>} The option, or null for an unknown id.
     */
    ResolveOption(id)
    {
        const entry = this._options.get(id) ?? null;
        if (!entry || entry.foundation || !this._resolve) return Promise.resolve(entry);
        if (!this._resolving.has(id))
        {
            const resolving = this._resolving;
            const operation = this._resolve(id).then(record =>
            {
                entry.foundation = CjsPaperDollArchetype.resolve(record);
                return entry;
            });
            resolving.set(id, operation);
            operation.catch(() => { if (resolving.get(id) === operation) resolving.delete(id); });
        }
        return this._resolving.get(id);
    }

    /** Returns qualified choices; there is no optional or disabled foundation. */
    GetOptions()
    {
        return [...this._options.values()].map(({ id, label }) => ({ id, label }));
    }

    /**
     * One morph's sculpted weight.
     * @param {string} name The morph name.
     * @returns {number} Its weight; 0 when unsculpted.
     */
    GetSculpt(name)
    {
        return this._sculpt.get(name) ?? 0;
    }

    /**
     * Every sculpted morph and its weight.
     * @returns {Object<string, number>} Weights by morph name; unsculpted morphs are absent.
     */
    GetSculpts()
    {
        return Object.fromEntries(this._sculpt);
    }

    /**
     * Sculpts one morph. A weight of 0 removes it.
     * @param {string} name The morph name.
     * @param {number} value Its weight.
     * @returns {void}
     */
    SetSculpt(name, value)
    {
        const weight = Math.fround(value);
        if (weight === this.GetSculpt(name)) return;
        if (weight === 0) this._sculpt.delete(name);
        else this._sculpt.set(name, weight);
        this._dirty = true;
    }

    /** Removes every sculpt. @returns {void} */
    ClearSculpts()
    {
        if (this._sculpt.size)
        {
            this._sculpt.clear();
            this._dirty = true;
        }
    }

    /**
     * Returns an owned snapshot (the foundation, its strength and the sculpt); callers cannot mutate the retained
     * foundation. Throws for a selected foundation that is not prepared: select one only after `ResolveOption`.
     */
    Resolve()
    {
        if (this.option && !this._options.get(this.option).foundation) throw new Error("Foundation " + this.option + " is not prepared");
        return this.option ? { ...structuredClone(this._options.get(this.option).foundation), strength: this.strength, sculpt: this.GetSculpts() } : null;
    }

    /** Restores the configured initial foundation without resetting modifier values. */
    Reset()
    {
        if (this._defaultOption)
        {
            this.option = this._defaultOption;
            this.strength = this._defaultStrength;
            this.Rebuild();
        }
    }

    /** Reports an unapplied foundation selection. */
    IsDirty()
    {
        return this._dirty;
    }

    /** Distinguishes foundation replacement/forced rebuilding from a shape-only edit. */
    IsFoundationDirty()
    {
        return this._foundationDirty;
    }

    /** Acknowledges the captured selection before invoking a prepared binding. */
    ClearDirty()
    {
        this._dirty = false;
        this._foundationDirty = false;
    }

    /** Requests reapplication of the selected foundation. */
    Rebuild()
    {
        if (this.option)
        {
            this._dirty = true;
            this._foundationDirty = true;
        }
    }

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
