import { normalizeCarbonValue } from "../types/index.js";
import { CjsSchema } from "../schema/index.js";
import { CjsCarbonDocument } from "./CjsCarbonDocument.js";
import { resolveHydrationAdapter } from "./hydrationAdapter.js";

/** Constructs runtime object graphs from neutral Carbon documents. */
export class CjsDocumentHydrator
{
    Hydrate(document, options = {})
    {
        return CjsDocumentHydrator.hydrate(document, options);
    }

    HydrateRoot(document, options = {})
    {
        return CjsDocumentHydrator.hydrateRoot(document, options);
    }

    static hydrate(document, options = {})
    {
        const normalized = CjsCarbonDocument.normalize(document);
        const nodeById = new Map(normalized.nodes.map(node => [node.id, node]));
        const instanceById = new Map();
        const reports = [];
        const adapter = resolveHydrationAdapter(options);

        for (const node of normalized.nodes)
        {
            instanceById.set(node.id, CjsDocumentHydrator.createNodeTarget(node, options, reports, adapter));
        }

        for (const node of normalized.nodes)
        {
            CjsDocumentHydrator.applyNodeValues(instanceById.get(node.id), node, instanceById, options, adapter);
        }

        // Phase 3: every instance is constructed and valued, so references are
        // resolved - now let callers run their own post-graph init.
        for (const node of normalized.nodes)
        {
            adapter.finalize(instanceById.get(node.id), { kind: node.kind, node, options });
        }

        const roots = normalized.roots.map(root => ({
            name: root.name,
            value: CjsDocumentHydrator.resolveDocumentValue(root.ref, instanceById, options)
        }));

        return {
            root: roots[0]?.value ?? null,
            roots,
            document: normalized,
            reports,
            get(id)
            {
                return instanceById.get(Number(id)) || null;
            },
            getNode(id)
            {
                return nodeById.get(Number(id)) || null;
            }
        };
    }

    static hydrateRoot(document, options = {})
    {
        return CjsDocumentHydrator.hydrate(document, options).root;
    }

    static createNodeTarget(node, options, reports, adapter)
    {
        if (adapter)
        {
            const built = adapter.construct(node.kind, { kind: node.kind, node, options });
            if (built !== undefined) return built;
        }

        const ClassConstructor = CjsDocumentHydrator.resolveClass(node.kind, options);
        if (ClassConstructor)
        {
            return new ClassConstructor();
        }

        throw new TypeError(`No class is registered for hydratable type ${node.kind}.`);
    }

    static applyNodeValues(target, node, instanceById, options, adapter)
    {
        const registeredSchema = target?.constructor
            ? CjsSchema.getSchema(target.constructor)
            : null;
        const shape = target?._sourceShape || (registeredSchema?.className ? registeredSchema : null);
        const fieldByName = new Map((shape?.fields || []).map(field => [field.name, field]));
        const values = {};

        for (const [key, item] of Object.entries(node.fields || {}))
        {
            if (CjsSchema.isFieldHidden(target?.constructor, key)) continue;
            const field = fieldByName.get(key) || null;
            values[key] = CjsDocumentHydrator.hydrateFieldValue(item, field, instanceById, options);
        }

        for (const [key, item] of Object.entries(node.raw || {}))
        {
            if (CjsSchema.isFieldHidden(target?.constructor, key)) continue;
            values[key] = CjsDocumentHydrator.resolveDocumentValue(item, instanceById, options);
        }

        const apply = adapter || resolveHydrationAdapter(options);
        apply.applyValues(target, values, { kind: node.kind, shape, node, options });
        return target;
    }

    static hydrateFieldValue(value, field, instanceById, options)
    {
        const resolved = CjsDocumentHydrator.resolveDocumentValue(value, instanceById, options);
        const descriptor = field?.type || field?.jsType || null;
        const kind = descriptor?.kind;

        if ((kind === "array" || kind === "list") && Array.isArray(resolved)) return resolved;
        if ((kind === "model" || kind === "objectRef" || kind === "struct" || kind === "rawStruct" || kind === "unknown") && resolved && typeof resolved === "object") return resolved;
        if (CjsDocumentHydrator.isShapeIncompatibleMathArray(resolved, descriptor)) return resolved;

        return descriptor ? normalizeCarbonValue(resolved, descriptor) : resolved;
    }

    static resolveDocumentValue(value, instanceById, options)
    {
        if (CjsCarbonDocument.isRef(value))
        {
            const id = Number(value.$ref);
            if (instanceById.has(id)) return instanceById.get(id);
            if (options.allowMissingRefs) return null;
            throw new TypeError(`CarbonDocument ref ${id} does not exist`);
        }

        if (Array.isArray(value)) return value.map(item => CjsDocumentHydrator.resolveDocumentValue(item, instanceById, options));
        if (value && typeof value === "object")
        {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, CjsDocumentHydrator.resolveDocumentValue(item, instanceById, options)]));
        }
        return value;
    }

    static resolveClass(kind, options)
    {
        const Schema = options.registry || CjsSchema;
        return Schema.GetConstructor(kind);
    }

    static isShapeIncompatibleMathArray(value, descriptor)
    {
        const expectedLength = descriptor?.length;
        return Array.isArray(value) && Number.isInteger(expectedLength) && value.length !== expectedLength;
    }
}
