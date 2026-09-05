// DEPRECATED carbon.document boundary. The collapse into plain CjsModel
// values is decided and partially executed - the envelope was
// over-engineered, and a _type-tagged values graph carries everything it
// did. Kept only until the interchange retirement completes its inventory
// (docs/contracts/model-values-interchange.md owns the rule: no document
// producer or consumer retires without inventory and replacement proof;
// docs/research/schema-hydration-consolidation-plan-2026-09-05.md holds
// the enumerated remaining surfaces). Do not add new consumers.
import { normalizeCarbonValue } from "../../schema/types/index.js";
import { CjsSchema } from "../../schema/index.js";
import { CjsCarbonDocument } from "./CjsCarbonDocument.js";
import { resolveHydrationAdapter } from "../../schema/hydration.js";

/** Constructs runtime object graphs from neutral Carbon documents. */
export class CjsDocumentHydrator
{
    /**
     * Hydrates every node in a Carbon document through the selected registry and
     * adapter.
     */
    Hydrate(document, options = {})
    {
        return CjsDocumentHydrator.hydrate(document, options);
    }

    /** Hydrates a Carbon document and returns its first root. */
    HydrateRoot(document, options = {})
    {
        return CjsDocumentHydrator.hydrateRoot(document, options);
    }

    /** Hydrates a normalized document into constructed runtime objects and roots. */
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

    /** Returns the first hydrated root in document order. */
    static hydrateRoot(document, options = {})
    {
        return CjsDocumentHydrator.hydrate(document, options).root;
    }

    /**
     * Constructs the runtime target appropriate for one normalized document
     * node.
     */
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

    /**
     * Applies resolved field values to a constructed node through the hydration
     * adapter.
     */
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

        // node.raw is enumerable NON-SCHEMA state, and its preservation is this
        // deprecated path's documented contract (model-values-interchange.md).
        // It is applied by direct assignment AFTER the adapter: a validated
        // setter rightly ignores undeclared keys, so raw state is the
        // hydrator's own job, exactly as it is for plain fallback carriers.
        const rawValues = {};
        for (const [key, item] of Object.entries(node.raw || {}))
        {
            if (CjsSchema.isFieldHidden(target?.constructor, key)) continue;
            rawValues[key] = CjsDocumentHydrator.resolveDocumentValue(item, instanceById, options);
        }

        const apply = adapter || resolveHydrationAdapter(options);
        apply.applyValues(target, values, { kind: node.kind, shape, node, options });
        Object.assign(target, rawValues);
        return target;
    }

    /** Hydrates one field value according to its schema descriptor. */
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

    /** Recursively resolves document references and nested portable values. */
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

    /** Resolves a node's serialized type through the active class registry. */
    static resolveClass(kind, options)
    {
        const Schema = options.registry || CjsSchema;
        return Schema.GetConstructor(kind);
    }

    /**
     * Reports when source-shape metadata prevents coercion to a declared math
     * container.
     */
    static isShapeIncompatibleMathArray(value, descriptor)
    {
        const expectedLength = descriptor?.length;
        return Array.isArray(value) && Number.isInteger(expectedLength) && value.length !== expectedLength;
    }
}
