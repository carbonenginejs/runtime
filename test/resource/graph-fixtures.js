import { CjsSchema } from "../../src/global/schema/CjsSchema.js";

/** CPU-only declared fixtures; no runtime domain or format registration is needed. */
export function fixtures(prefix)
{
    class Embedded { value = 3; }
    class Node
    {
        name = "default";
        peer = null;
        weak = null;
        children = [];
        embedded = new Embedded();
        indices = Uint32Array.of(1, 65537, 4294967295);
        huge = 18446744073709551615n;
        choice = 73;
        flags = 0x80000001;
        colour = Float32Array.of(0.25, 0.5, 1, 2);
        scale = Float32Array.of(1, 1, 1);
        path = "res:/Some/Path";
        tags = new Set(["b", "a"]);
        named = new Map([["z", 2], ["__proto__", 1]]);
        _value = [9];
        loadOnly = 11;
        runtime = { secret: 1 };
        derived = 999;
        state = Uint8Array.of(0, 128, 255);
    }
    const field = (name, kind, extra = {}) => ({ name, key: name, type: typeof kind === "string" ? { kind } : kind, edit: { persist: true }, ...extra });
    CjsSchema.define(Embedded, { className: `${prefix}Embedded`, members: [field("value", "int32")] });
    CjsSchema.define(Node, {
        className: `${prefix}Node`,
        members: [
            field("name", "string"), field("peer", { kind: "objectRef", className: `${prefix}Node` }),
            field("weak", { kind: "weakRef", className: `${prefix}Node` }),
            field("children", { kind: "list", itemType: { kind: "objectRef", className: `${prefix}Node` } }),
            field("embedded", { kind: "struct", className: `${prefix}Embedded` }),
            field("indices", { kind: "typedArray", arrayType: "Uint32Array" }), field("huge", "uint64"),
            field("choice", "int32"), field("flags", "uint32", { edit: { persist: true, flags: true } }),
            field("colour", "linear"), field("scale", "scale"), field("path", "path"),
            field("tags", { kind: "set", itemType: { kind: "string" } }),
            field("named", { kind: "map", valueType: { kind: "int32" } }),
            field("value", "int32", { key: "_value", index: 0, alias: "oldValue" }),
            field("loadOnly", "int32", { edit: { rpersist: true } }),
            field("runtime", { kind: "objectRef", runtimeOnly: true }),
            field("derived", "int32", { edit: { read: true } }),
            field("state", { kind: "custom", name: "state" })
        ]
    });
    return { Node, Embedded, name: `${prefix}Node` };
}
