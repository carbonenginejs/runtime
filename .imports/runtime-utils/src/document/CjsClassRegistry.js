import { CjsSchema } from "../schema/index.js";

/** Maps serialized Carbon class names to explicit runtime constructors. */
export class CjsClassRegistry
{
    constructor(options = {})
    {
        const {
            name = "registry",
            family = "",
            constructors = null,
            sourceShapes = null,
            modules = null,
            entries = [],
            aliases = null,
            metadata = {}
        } = options;

        this.name = String(name || "registry");
        this.family = String(family || "");
        this.metadata = { ...metadata };
        this.entries = new Map();
        this.aliases = new Map();
        this.reports = [];

        if (constructors || sourceShapes || modules)
        {
            this.RegisterMaps({ constructors, sourceShapes, modules, aliases });
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
            sourceShapes = {},
            modules = {},
            aliases = {}
        } = options;

        const names = new Set([
            ...Object.keys(constructors || {}).filter(name => typeof constructors[name] === "function"),
            ...Object.keys(sourceShapes || {}),
            ...Object.keys(modules || {})
        ]);

        for (const className of names)
        {
            const constructor = typeof constructors?.[className] === "function" ? constructors[className] : null;
            const sourceShape = sourceShapes?.[className] || null;
            const moduleEntry = modules?.[className] || null;

            this.Register({
                className,
                constructor,
                sourceShape,
                folder: moduleEntry?.folder || "",
                modulePath: moduleEntry?.modulePath || "",
                registryEntry: moduleEntry,
                aliases: aliasesForClassName(className, aliases),
                family: sourceShape?.family || this.family
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
        const normalized = normalizeRegistryEntry(entry, this.family);
        const existing = this.entries.get(normalized.className);

        if (existing)
        {
            this.entries.set(normalized.className, mergeRegistryEntries(existing, normalized));
            this.ReportEntryClashes(existing, normalized);
        }
        else
        {
            this.entries.set(normalized.className, normalized);
        }

        for (const alias of normalized.aliases)
        {
            this.RegisterAlias(alias, normalized.className);
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
                else this.RegisterAlias(item.alias, item.className || item.target);
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

    RegisterAlias(alias, className)
    {
        if (!alias || !className) return this;

        const normalizedAlias = String(alias);
        const normalizedClassName = String(className);
        const existing = this.aliases.get(normalizedAlias);

        if (existing && existing !== normalizedClassName)
        {
            this.reports.push({
                level: "warning",
                code: "alias-clash",
                alias: normalizedAlias,
                existingClassName: existing,
                className: normalizedClassName,
                message: `Alias ${normalizedAlias} already points to ${existing}`
            });
            return this;
        }

        if (this.entries.has(normalizedAlias) && normalizedAlias !== normalizedClassName)
        {
            this.reports.push({
                level: "warning",
                code: "alias-class-clash",
                alias: normalizedAlias,
                className: normalizedClassName,
                message: `Alias ${normalizedAlias} also names a registered class`
            });
        }

        this.aliases.set(normalizedAlias, normalizedClassName);
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

    ResolveClass(name)
    {
        return this.GetConstructor(name);
    }

    GetSourceShape(name)
    {
        return this.GetEntry(name)?.sourceShape || null;
    }

    GetModulePath(name)
    {
        return this.GetEntry(name)?.modulePath || null;
    }

    Create(name, values)
    {
        const ClassConstructor = this.GetConstructor(name);
        return ClassConstructor ? new ClassConstructor(values) : null;
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
                className: entry.className,
                family: entry.family,
                folder: entry.folder,
                modulePath: entry.modulePath,
                aliases: [...entry.aliases],
                hasConstructor: Boolean(entry.constructor),
                hasSourceShape: Boolean(entry.sourceShape)
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
            this.reports.push(createEntryClash("constructor-clash", existing, incoming));
        }

        if (existing.sourceShape && incoming.sourceShape && existing.sourceShape !== incoming.sourceShape)
        {
            this.reports.push(createEntryClash("source-shape-clash", existing, incoming));
        }

        if (existing.modulePath && incoming.modulePath && existing.modulePath !== incoming.modulePath)
        {
            this.reports.push(createEntryClash("module-path-clash", existing, incoming));
        }
    }

    static from(options = {})
    {
        return options instanceof CjsClassRegistry ? options : new CjsClassRegistry(options);
    }

    static fromMaps(options = {})
    {
        return new CjsClassRegistry(options);
    }
}

function normalizeRegistryEntry(entry, defaultFamily)
{
    if (!entry || typeof entry !== "object")
    {
        throw new TypeError("Class registry entry must be an object");
    }

    const entryConstructor = Object.hasOwn(entry, "constructor") ? entry.constructor : null;
    const constructor = typeof entryConstructor === "function" ? entryConstructor : null;
    const sourceShape = entry.sourceShape || null;
    const className = String(entry.className || entry.name || sourceShape?.className || (constructor ? CjsSchema.getClassName(constructor) : null) || "");

    if (!className)
    {
        throw new TypeError("Class registry entry is missing a className");
    }

    return {
        className,
        constructor,
        sourceShape,
        folder: String(entry.folder || ""),
        modulePath: String(entry.modulePath || ""),
        registryEntry: entry.registryEntry || null,
        aliases: normalizeAliases(entry.aliases),
        family: String(entry.family || sourceShape?.family || defaultFamily || ""),
        metadata: { ...(entry.metadata || {}) }
    };
}

function mergeRegistryEntries(existing, incoming)
{
    return {
        className: existing.className,
        constructor: existing.constructor || incoming.constructor,
        sourceShape: existing.sourceShape || incoming.sourceShape,
        folder: existing.folder || incoming.folder,
        modulePath: existing.modulePath || incoming.modulePath,
        registryEntry: existing.registryEntry || incoming.registryEntry,
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

function aliasesForClassName(className, aliases)
{
    if (!aliases || Array.isArray(aliases)) return [];

    const direct = aliases[className];
    if (Array.isArray(direct)) return direct;

    const matched = [];
    for (const [alias, target] of Object.entries(aliases))
    {
        if (target === className) matched.push(alias);
    }
    return matched;
}

function createEntryClash(code, existing, incoming)
{
    return {
        level: "warning",
        code,
        className: existing.className,
        message: `${existing.className} has conflicting registry metadata`,
        existing: summarizeEntry(existing),
        incoming: summarizeEntry(incoming)
    };
}

function summarizeEntry(entry)
{
    return {
        className: entry.className,
        modulePath: entry.modulePath,
        hasConstructor: Boolean(entry.constructor),
        hasSourceShape: Boolean(entry.sourceShape)
    };
}
