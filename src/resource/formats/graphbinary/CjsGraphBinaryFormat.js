import { createHandlers, isRecord } from "../graph/core/dataTypes.js";
import { plainGraph, readGraph, writeGraph, throwReports } from "../graph/core/graph.js";
import { binaryArray, createBinaryWriter, openBinary, writePayload } from "./core/container.js";

/** Our graph grammar with owned binary typed payloads; independent of the text facade. */
export class CjsGraphBinaryFormat extends CjsFormat
{
    static className = "CjsGraphBinaryFormat";
    static id = "CjsGraphBinaryFormat";
    static wireFormat = "cjs.graph.binary";
    static version = 1;
    static extensions = [];
    static outputs = CjsFormat.defineOutputs({
        values: { default: true, decoded: true },
        runtime: { decoded: true }
    });
    static inputs = CjsFormat.defineInputs({ runtime: { default: true }, values: {} });

    /** Hold a reusable detached profile; import/construction registers nothing. */
    constructor(options = {}) { super(options); }

    /** Read with profile options. */
    Read(input, options = {}) { return CjsGraphBinaryFormat.read(input, { ...this.options, ...options }); }

    /** Write with profile options. */
    Write(root, options = {}) { return CjsGraphBinaryFormat.write(root, { ...this.options, ...options }); }

    /** Decode framing and hand the same graph grammar a binary-specific storage handler. */
    static read(input, options = {})
    {
        const binary = openBinary(input, CjsGraphBinaryFormat.wireFormat);
        const emit = options.emit ?? "values";
        if (emit === "runtime") return readGraph(binary.root, createHandlers(binaryArray), { ...options, binary });
        if (emit !== "values") throw new TypeError(`Unknown graph output '${emit}'`);
        const reports = [];
        const root = plainGraph(binary.root, reports, value =>
        {
            if (isRecord(value) && Object.keys(value).length === 1 && Object.hasOwn(value, "_view")) return binary.read(value._view);
            if (isRecord(value) && Object.keys(value).length === 2 && Object.hasOwn(value, "_custom") && Object.hasOwn(value, "_view"))
            {
                return { _custom: value._custom, bytes: binary.read(value._view, "bytes") };
            }
            return value;
        });
        return { root, reports };
    }

    /** Write all bulk data as byte spans without expanding typed-array elements. */
    static write(root, options = {})
    {
        const binary = createBinaryWriter();
        const input = options.input ?? "runtime";
        const reports = [];
        if (input === "runtime") root = writeGraph(root, createHandlers(binaryArray), { ...options, binary });
        else if (input === "values") root = plainGraph(root, reports, value => writePayload(value, binary));
        else throw new TypeError(`Unknown graph input '${input}'`);
        throwReports(reports);
        return binary.finish(root, CjsGraphBinaryFormat.wireFormat);
    }

    /** Inspect framing and version without running registered class factories. */
    static inspect(input)
    {
        openBinary(input, CjsGraphBinaryFormat.wireFormat);
        return { format: { id: CjsGraphBinaryFormat.id, version: 1 }, wireFormat: CjsGraphBinaryFormat.wireFormat };
    }

    /** Select by header; no filename extension participates. */
    static is(input)
    {
        try { CjsGraphBinaryFormat.inspect(input); return true; }
        catch { return false; }
    }
}
import { CjsFormat } from "../../format/CjsFormat.js";
