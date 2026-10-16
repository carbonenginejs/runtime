import { CjsSchema } from "#schema/CjsSchema";

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

    static outputs = CjsFormat.defineOutputs({
        values: { default: true, decoded: true },
        runtime: { decoded: true }
    });

    static inputs = CjsFormat.defineInputs({ runtime: { default: true }, values: {} });

    /**
     * Keep a reusable profile without registering a format or starting any services.
     *
     * @param {object} [options={}] Profile options merged into every Read and Write.
     */
    constructor(options = {}) { super(options); }

    /**
     * Decode a file into plain values or canonical registered runtime instances.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Envelope JSON text or UTF-8 bytes.
     * @param {object} [options={}] Read options, over the profile options.
     * @returns {import("./core/dataTypes.js").GraphReadResult} The root and member reports.
     */
    Read(input, options = {}) { return CjsGraphFormat.read(input, { ...this.options, ...options }); }

    /**
     * Encode the caller's graph; member failures prevent successful output.
     *
     * @param {object} root Runtime root instance or plain-value root.
     * @param {object} [options={}] Write options, over the profile options.
     * @returns {Uint8Array} UTF-8 envelope bytes.
     */
    Write(root, options = {}) { return CjsGraphFormat.write(root, { ...this.options, ...options }); }

    /**
     * Decode our header/version and graph, using a fresh operation identity table.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Envelope JSON text or UTF-8 bytes.
     * @param {object} [options={}] Read options.
     * @param {string} [options.emit="values"] "values" for plain values, "runtime" for registered instances.
     * @returns {import("./core/dataTypes.js").GraphReadResult} The root and member reports.
     * @throws {TypeError} When options.emit is unknown.
     */
    static read(input, options = {})
    {
        const envelope = readEnvelope(input, CjsGraphFormat.wireFormat);
        const emit = options.emit ?? "values";
        if (emit === "runtime") return readGraph(envelope.root, createHandlers(), options);
        if (emit !== "values") throw new TypeError(`Unknown graph output '${emit}'`);
        const reports = [];
        return { root: plainGraph(envelope.root, reports), reports };
    }

    /**
     * JSON text uses only declared data-type handlers, never meanings or member-name dispatch.
     *
     * @param {object} root Runtime root instance or plain-value root.
     * @param {object} [options={}] Write options.
     * @param {string} [options.input="runtime"] "runtime" for registered instances, "values" for plain values.
     * @returns {Uint8Array} UTF-8 envelope bytes.
     * @throws {TypeError} When options.input is unknown or a member fails.
     */
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

    /**
     * Inspect the explicit format header without resolving any classes or running factories.
     *
     * @param {string|ArrayBuffer|ArrayBufferView} input Envelope JSON text or UTF-8 bytes.
     * @returns {import("./core/dataTypes.js").GraphInspection} The format id, version and wire identity.
     */
    static inspect(input)
    {
        const envelope = readEnvelope(input, CjsGraphFormat.wireFormat);
        return { format: { id: CjsGraphFormat.id, version: envelope.version }, wireFormat: envelope.format };
    }

    /**
     * Header selection claims no extension and accepts only this supported file grammar.
     *
     * @param {string|null} _filename Resource path; unused.
     * @param {string|ArrayBuffer|ArrayBufferView} input Candidate file contents.
     * @returns {boolean} True when the envelope is this format.
     */
    static is(_filename, input)
    {
        try { CjsGraphFormat.inspect(input); return true; }
        catch { return false; }
    }
}
import { CjsFormat } from "../../format/CjsFormat.js";

CjsSchema.meta.define(CjsGraphFormat, { className: "CjsGraphFormat" });
