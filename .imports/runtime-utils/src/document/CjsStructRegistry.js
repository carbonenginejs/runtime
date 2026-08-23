/** Maps serialized Carbon struct names to explicit constructors and layouts. */
export class CjsStructRegistry
{
    constructor(options = {})
    {
        const {
            name = "structs",
            family = "",
            constructors = null,
            layouts = null,
            entries = [],
            aliases = null,
            metadata = {}
        } = options;

        this.name = String(name || "structs");
        this.family = String(family || "");
        this.metadata = { ...metadata };
        this.entries = new Map();
        this.aliases = new Map();
        this.reports = [];

        if (constructors || layouts)
        {
            this.RegisterMaps({ constructors, layouts, aliases });
        }

        this.RegisterMany(entries);
        this.RegisterAliases(aliases);
    }

    get size()
    {
        return this.entries.size;
    }

    RegisterMaps(options = {})
    {
        const {
            constructors = {},
            layouts = {},
            aliases = {}
        } = options;

        const names = new Set([
            ...Object.keys(constructors || {}).filter(name => typeof constructors[name] === "function"),
            ...Object.keys(layouts || {})
        ]);

        for (const structName of names)
        {
            this.Register({
                structName,
                constructor: typeof constructors?.[structName] === "function" ? constructors[structName] : null,
                layout: layouts?.[structName] || null,
                aliases: aliasesForStructName(structName, aliases),
                family: layouts?.[structName]?.family || this.family
            });
        }

        return this;
    }

    RegisterMany(entries = [])
    {
        const list = Array.isArray(entries) ? entries : Object.values(entries || {});
        for (const entry of list)
        {
            this.Register(entry);
        }
        return this;
    }

    Register(entry)
    {
        const normalized = normalizeStructEntry(entry, this.family);
        const existing = this.entries.get(normalized.structName);

        if (existing)
        {
            this.entries.set(normalized.structName, mergeStructEntries(existing, normalized));
            this.ReportEntryClashes(existing, normalized);
        }
        else
        {
            this.entries.set(normalized.structName, normalized);
        }

        for (const alias of normalized.aliases)
        {
            this.RegisterAlias(alias, normalized.structName);
        }

        return this;
    }

    RegisterAliases(aliases = null)
    {
        if (!aliases) return this;

        if (Array.isArray(aliases))
        {
            for (const item of aliases)
            {
                if (Array.isArray(item)) this.RegisterAlias(item[0], item[1]);
                else this.RegisterAlias(item.alias, item.structName || item.name || item.target);
            }
            return this;
        }

        for (const [key, value] of Object.entries(aliases))
        {
            if (Array.isArray(value))
            {
                for (const alias of value)
                {
                    this.RegisterAlias(alias, key);
                }
            }
            else
            {
                this.RegisterAlias(key, value);
            }
        }

        return this;
    }

    RegisterAlias(alias, structName)
    {
        if (!alias || !structName) return this;

        const normalizedAlias = String(alias);
        const normalizedStructName = String(structName);
        const existing = this.aliases.get(normalizedAlias);

        if (existing && existing !== normalizedStructName)
        {
            this.reports.push({
                level: "warning",
                code: "alias-clash",
                alias: normalizedAlias,
                existingStructName: existing,
                structName: normalizedStructName,
                message: `Struct alias ${normalizedAlias} already points to ${existing}`
            });
            return this;
        }

        if (this.entries.has(normalizedAlias) && normalizedAlias !== normalizedStructName)
        {
            this.reports.push({
                level: "warning",
                code: "alias-struct-clash",
                alias: normalizedAlias,
                structName: normalizedStructName,
                message: `Struct alias ${normalizedAlias} also names a registered struct`
            });
        }

        this.aliases.set(normalizedAlias, normalizedStructName);
        return this;
    }

    ResolveName(name)
    {
        let current = String(name || "");
        const seen = new Set();

        while (this.aliases.has(current) && !seen.has(current))
        {
            seen.add(current);
            current = this.aliases.get(current);
        }

        return current;
    }

    GetEntry(name)
    {
        return this.entries.get(this.ResolveName(name)) || null;
    }

    Has(name)
    {
        return Boolean(this.GetEntry(name));
    }

    GetConstructor(name)
    {
        return this.GetEntry(name)?.constructor || null;
    }

    GetLayout(name)
    {
        return this.GetEntry(name)?.layout || null;
    }

    Create(name, values = {})
    {
        const StructConstructor = this.GetConstructor(name);
        return StructConstructor ? new StructConstructor(values) : { ...values };
    }

    GetReports()
    {
        return this.reports.map(report => ({ ...report }));
    }

    ToJSON()
    {
        return {
            name: this.name,
            family: this.family,
            metadata: { ...this.metadata },
            entries: Array.from(this.entries.values()).map(entry => ({
                structName: entry.structName,
                family: entry.family,
                aliases: [...entry.aliases],
                hasConstructor: Boolean(entry.constructor),
                hasLayout: Boolean(entry.layout),
                layout: summarizeLayout(entry.layout)
            })),
            aliases: Object.fromEntries(this.aliases),
            reports: this.GetReports()
        };
    }

    [Symbol.iterator]()
    {
        return this.entries.values();
    }

    ReportEntryClashes(existing, incoming)
    {
        if (existing.constructor && incoming.constructor && existing.constructor !== incoming.constructor)
        {
            this.reports.push(createStructClash("constructor-clash", existing, incoming));
        }

        if (existing.layout && incoming.layout && existing.layout !== incoming.layout)
        {
            this.reports.push(createStructClash("layout-clash", existing, incoming));
        }
    }

    static from(options = {})
    {
        return options instanceof CjsStructRegistry ? options : new CjsStructRegistry(options);
    }

    static fromMaps(options = {})
    {
        return new CjsStructRegistry(options);
    }
}

function normalizeStructEntry(entry, defaultFamily)
{
    if (!entry || typeof entry !== "object")
    {
        throw new TypeError("Struct registry entry must be an object");
    }

    const entryConstructor = Object.hasOwn(entry, "constructor") ? entry.constructor : null;
    const constructor = typeof entryConstructor === "function" ? entryConstructor : null;
    const layout = entry.layout || null;
    const structName = String(entry.structName || entry.name || layout?.structName || constructor?.sourceStruct || "");

    if (!structName)
    {
        throw new TypeError("Struct registry entry is missing a structName");
    }

    return {
        structName,
        constructor,
        layout,
        aliases: normalizeAliases(entry.aliases),
        family: String(entry.family || layout?.family || defaultFamily || ""),
        metadata: { ...(entry.metadata || {}) }
    };
}

function mergeStructEntries(existing, incoming)
{
    return {
        structName: existing.structName,
        constructor: existing.constructor || incoming.constructor,
        layout: existing.layout || incoming.layout,
        aliases: Array.from(new Set([...existing.aliases, ...incoming.aliases])),
        family: existing.family || incoming.family,
        metadata: { ...existing.metadata, ...incoming.metadata }
    };
}

function normalizeAliases(aliases)
{
    if (!aliases) return [];
    if (Array.isArray(aliases)) return aliases.map(String).filter(Boolean);
    return [String(aliases)].filter(Boolean);
}

function aliasesForStructName(structName, aliases)
{
    if (!aliases || Array.isArray(aliases)) return [];

    const direct = aliases[structName];
    if (Array.isArray(direct)) return direct;

    const matched = [];
    for (const [alias, target] of Object.entries(aliases))
    {
        if (target === structName) matched.push(alias);
    }
    return matched;
}

function createStructClash(code, existing, incoming)
{
    return {
        level: "warning",
        code,
        structName: existing.structName,
        message: `${existing.structName} has conflicting struct registry metadata`,
        existing: summarizeEntry(existing),
        incoming: summarizeEntry(incoming)
    };
}

function summarizeEntry(entry)
{
    return {
        structName: entry.structName,
        hasConstructor: Boolean(entry.constructor),
        hasLayout: Boolean(entry.layout)
    };
}

function summarizeLayout(layout)
{
    if (!layout || typeof layout !== "object") return null;
    return {
        structName: layout.structName || layout.name || null,
        byteSize: layout.byteSize ?? layout.structureSize ?? null,
        fieldCount: Array.isArray(layout.fields) ? layout.fields.length : null
    };
}
