import { CjsBlueReader } from "../../../format/CjsBlueReader.js";
import { parseRed, isTypedTable, decodeTypedTable, isStrippedKey } from "./redGraph.js";

/**
 * Reads a Red (YAML) object graph.
 *
 * The graph is type-discriminated (`type:` per node) and self-referential
 * (YAML anchors/aliases share object identities). This reader walks it into
 * one of three shapes, sharing repeated nodes and always stripping
 * authoring-tool keys (double-underscore prefixed).
 */
export class CjsRedReader extends CjsBlueReader
{
    constructor(input, options = {})
    {
        super(options, {
            includePayloadValuesField: true,
            validatePayloadReservedFields: true
        });
        this.root = parseRed(input, options);
        this.mode = "payload";
        this.ResetReadState();
    }

    ResetReadState()
    {
        super.ResetBlueReadState();
        this.refs = new Map();          // source object -> hydrated target
        this.ids = new Map();           // source object -> reference id
        this.payloadReferenceCounts = new WeakMap();
        this.nextId = this.options.firstId ?? 1;
    }

    Inspect()
    {
        const typeCounts = {};
        const seen = new Set();
        let nodeCount = 0;

        const visit = (node) =>
        {
            if (!node || typeof node !== "object") return;
            if (seen.has(node)) return;
            seen.add(node);

            if (Array.isArray(node)) { node.forEach(visit); return; }
            if (isTypedTable(node)) return;

            if (typeof node.type === "string")
            {
                nodeCount++;
                typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
            }

            for (const key of Object.keys(node))
            {
                if (isStrippedKey(key)) continue;
                visit(node[key]);
            }
        };

        visit(this.root);

        return {
            format: { id: "red" },
            root: { type: this.RootType() },
            nodeCount,
            typeCounts
        };
    }

    RootType()
    {
        return this.root && typeof this.root === "object" && typeof this.root.type === "string"
            ? this.root.type
            : null;
    }

    Read()
    {
        return this.ReadPayload();
    }

    ReadPayload()
    {
        this.mode = "payload";
        this.ResetReadState();
        this.ValidatePayloadConfiguration();
        this.CountPayloadReferences(this.root);
        const object = this.Hydrate(this.root);
        return { comments: this.reports, object };
    }

    ReadRuntime()
    {
        this.mode = "runtime";
        this.ResetReadState();
        const root = this.Hydrate(this.root);

        this.FinalizeRuntimeInstances();

        return { root, format: { id: "red" }, reports: this.reports };
    }

    ReadRaw()
    {
        this.mode = "raw";
        this.ResetReadState();
        return this.Hydrate(this.root);
    }

    Hydrate(node)
    {
        if (node && typeof node === "object")
        {
            if (this.refs.has(node)) return this.MakeReference(node);

            if (Array.isArray(node)) return this.HydrateSequence(node, node);
            if (isTypedTable(node)) return this.HydrateSequence(node, decodeTypedTable(node));

            const type = typeof node.type === "string" ? node.type : null;
            const target = this.CreateTarget(type);
            this.refs.set(node, target);

            const values = {};
            for (const key of Object.keys(node))
            {
                if (isStrippedKey(key)) continue;
                if (key === "type" && this.mode !== "raw") continue;
                values[key] = this.Hydrate(node[key]);
            }

            this.AssignValues(target, values, type);
            return target;
        }

        return node;
    }

    HydrateSequence(source, items)
    {
        const values = [];
        const shouldWrap = this.mode === "payload"
            && this.IsRepeatedPayloadNode(source)
            && Boolean(this.GetPayloadIdField());
        const target = shouldWrap
            ? { [this.GetPayloadValuesField()]: values }
            : values;

        this.refs.set(source, target);
        for (const item of items) values.push(this.Hydrate(item));
        return target;
    }

    CountPayloadReferences(root)
    {
        const traversed = new WeakSet();
        const visit = (node) =>
        {
            if (!node || typeof node !== "object") return;
            this.payloadReferenceCounts.set(node, (this.payloadReferenceCounts.get(node) || 0) + 1);
            if (traversed.has(node)) return;
            traversed.add(node);

            if (Array.isArray(node))
            {
                for (const item of node) visit(item);
                return;
            }
            if (isTypedTable(node))
            {
                for (const row of decodeTypedTable(node)) visit(row);
                return;
            }
            for (const key of Object.keys(node))
            {
                if (isStrippedKey(key) || key === "type") continue;
                visit(node[key]);
            }
        };
        visit(root);
    }

    IsRepeatedPayloadNode(node)
    {
        return (this.payloadReferenceCounts.get(node) || 0) > 1;
    }

    CreateTarget(type)
    {
        if (this.mode === "runtime")
        {
            if (!type) return {};
            return this.CreateRuntimeTarget(type);
        }

        if (this.mode === "raw") return {};

        return this.CreatePayloadTarget(type);
    }

    AssignValues(target, values, type)
    {
        if (this.mode === "runtime")
        {
            // Untyped maps are plain value objects inside a typed Red graph and
            // do not participate in the runtime class lifecycle.
            if (!type)
            {
                Object.assign(target, values);
                return;
            }
            this.ApplyRuntimeValues(target, values, type);
            return;
        }

        if (this.mode === "payload")
        {
            this.AssignPayloadValues(target, values);
            return;
        }

        Object.assign(target, values);
    }

    MakeReference(node)
    {
        const target = this.refs.get(node);
        if (this.mode !== "payload") return target;

        const id = this.IdFor(node);
        return this.CreatePayloadReference(target, id);
    }

    IdFor(node)
    {
        let id = this.ids.get(node);
        if (id === undefined)
        {
            id = this.nextId++;
            this.ids.set(node, id);
        }
        return id;
    }

}
