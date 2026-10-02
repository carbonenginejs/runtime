import { createHandlers } from "./core/dataTypes.js";
import { plainGraph, readGraph, writeGraph, throwReports } from "./core/graph.js";
import { readEnvelope, writeEnvelope } from "./core/text.js";

/** Our declared object-graph text format. Its wire identity is independent of this class name. */
export class CjsGraphFormat extends CjsFormat
{
    static className = "CjsGraphFormat";
    static id = "CjsGraphFormat";
    static wireFormat = "cjs.graph";
    static version = 1;
    static extensions = [];
    static mediaTypes = ["data"];
    static outputs = CjsFormat.defineOutputs({
        values: { default: true, decoded: true, payloadType: "json" },
        runtime: { decoded: true, payloadType: "object" }
    });
    static inputs = CjsFormat.defineInputs({ runtime: { default: true }, values: {} });

    /** Keep a reusable profile without registering a format or starting any services. */
    constructor(options = {}) { super(options); }

    /** Decode a file into plain values or canonical registered runtime instances. */
    Read(input, options = {}) { return CjsGraphFormat.read(input, { ...this.options, ...options }); }

    /** Encode the caller's graph; member failures prevent successful output. */
    Write(root, options = {}) { return CjsGraphFormat.write(root, { ...this.options, ...options }); }

    /** Decode our header/version and graph, using a fresh operation identity table. */
    static read(input, options = {})
    {
        const envelope = readEnvelope(input, CjsGraphFormat.wireFormat);
        const emit = options.emit ?? "values";
        if (emit === "runtime") return readGraph(envelope.root, createHandlers(), options);
        if (emit !== "values") throw new TypeError(`Unknown graph output '${emit}'`);
        const reports = [];
        return { root: plainGraph(envelope.root, reports), reports };
    }

    /** JSON text uses only declared data-type handlers, never meanings or member-name dispatch. */
    static write(root, options = {})
    {
        const input = options.input ?? "runtime";
        const reports = [];
        if (input === "runtime") root = writeGraph(root, createHandlers(), options);
        else if (input === "values") root = plainGraph(root, reports);
        else throw new TypeError(`Unknown graph input '${input}'`);
        throwReports(reports);
        return writeEnvelope({ format: CjsGraphFormat.wireFormat, version: 1, root });
    }

    /** Inspect the explicit format header without resolving any classes or running factories. */
    static inspect(input)
    {
        const envelope = readEnvelope(input, CjsGraphFormat.wireFormat);
        return { format: { id: CjsGraphFormat.id, version: envelope.version }, wireFormat: envelope.format };
    }

    /** Header selection claims no extension and accepts only this supported file grammar. */
    static is(input)
    {
        try { CjsGraphFormat.inspect(input); return true; }
        catch { return false; }
    }
}
import { CjsFormat } from "../../format/CjsFormat.js";
