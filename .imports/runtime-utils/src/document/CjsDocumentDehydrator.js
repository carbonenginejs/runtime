import { exportCarbonValue } from "../types/index.js";
import { CjsSchema } from "../schema/index.js";
import { CjsCarbonDocument } from "./CjsCarbonDocument.js";

/** Converts runtime object graphs into neutral Carbon documents. */
export class CjsDocumentDehydrator
{
    Dehydrate(value, options = {})
    {
        return CjsDocumentDehydrator.dehydrate(value, options);
    }

    static dehydrate(value, options = {})
    {
        const state = {
            nextId: options.firstId || 1,
            objectIds: new Map(),
            nodes: [],
            refs: {},
            includeClassMetadata: Boolean(options.includeClassMetadata || options.trace || options.debug),
            includeRefIndex: Boolean(options.includeRefIndex || options.trace || options.debug)
        };

        const rootRef = CjsDocumentDehydrator.dehydrateValue(value, state);
        if (!CjsCarbonDocument.isRef(rootRef))
        {
            throw new TypeError("CarbonDocument roots must be source-shaped objects");
        }

        if (state.includeRefIndex)
        {
            for (const node of state.nodes)
            {
                state.refs[String(node.id)] = {
                    kind: node.kind
                };
            }
        }

        return CjsCarbonDocument.create({
            format: options.format || { id: "runtime", version: 1 },
            roots: [{ name: options.rootName || "default", ref: rootRef }],
            nodes: state.nodes.sort((a, b) => a.id - b.id),
            refs: state.includeRefIndex ? state.refs : null,
            metadata: options.metadata || {},
            reports: options.reports || []
        });
    }

    static dehydrateValue(value, state)
    {
        if (CjsDocumentDehydrator.isSourceShapedObject(value)) return CjsDocumentDehydrator.dehydrateSourceObject(value, state);
        if (Array.isArray(value)) return value.map(item => CjsDocumentDehydrator.dehydrateValue(item, state));
        if (value instanceof Map) return Object.fromEntries(Array.from(value.entries()).map(([key, item]) => [key, CjsDocumentDehydrator.dehydrateValue(item, state)]));
        if (value instanceof Set) return Array.from(value.values()).map(item => CjsDocumentDehydrator.dehydrateValue(item, state));
        if (value && typeof value === "object" && !ArrayBuffer.isView(value))
        {
            return Object.fromEntries(
                Object.entries(value)
                    .filter(([key]) => !key.startsWith("_"))
                    .map(([key, item]) => [key, CjsDocumentDehydrator.dehydrateValue(item, state)])
            );
        }
        return exportCarbonValue(value);
    }

    static dehydrateSourceObject(value, state)
    {
        if (state.objectIds.has(value)) return CjsCarbonDocument.createRef(state.objectIds.get(value));

        const id = state.nextId++;
        state.objectIds.set(value, id);

        const shape = value._sourceShape || null;
        const schemaName = typeof value.GetValues === "function"
            ? CjsSchema.getClassName(value.constructor)
            : null;
        const kind = schemaName || value._sourceClassName;
        if (!kind)
        {
            throw new TypeError("Hydratable objects require an explicit schema className.");
        }
        const fields = {};
        const fieldNames = new Set();

        if (shape?.fields)
        {
            for (const field of shape.fields)
            {
                if (schemaName && CjsSchema.isFieldHidden(value.constructor, field.name)) continue;
                fieldNames.add(field.name);
                fields[field.name] = CjsDocumentDehydrator.dehydrateValue(value[field.name], state);
            }
        }
        else if (typeof value.GetValues === "function")
        {
            for (const [key, item] of Object.entries(value.GetValues()))
            {
                fieldNames.add(key);
                fields[key] = CjsDocumentDehydrator.dehydrateValue(item, state);
            }
        }

        const raw = {};
        for (const [key, item] of Object.entries(value))
        {
            if (key.startsWith("_") || fieldNames.has(key)) continue;
            if (schemaName && CjsSchema.isFieldHidden(value.constructor, key)) continue;
            raw[key] = CjsDocumentDehydrator.dehydrateValue(item, state);
        }

        const node = {
            id,
            kind,
            fields
        };

        if (state.includeClassMetadata)
        {
            node.source = shape?.source || {};
            node.meta = {
                family: shape?.family || null,
                hashes: shape?.hashes || null,
                blue: shape?.blue || null
            };
        }

        if (Object.keys(raw).length) node.raw = raw;

        state.nodes.push(node);

        return CjsCarbonDocument.createRef(id);
    }

    static isSourceShapedObject(value)
    {
        return Boolean(value && typeof value === "object" && (
            value._sourceClassName
            || (typeof value.GetValues === "function" && CjsSchema.getClassName(value.constructor))
        ));
    }
}
