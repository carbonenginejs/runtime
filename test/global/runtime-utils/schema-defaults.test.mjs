import assert from "node:assert/strict";
import test from "node:test";

import { CjsSchema } from "../../../src/global/schema/index.js";


test("decorators install nothing per instance; getDefaults reads one instance without Initialize", () =>
{
    const metadata = Object.create(null);
    const added = [];
    let constructorCount = 0;
    let initializeCount = 0;
    const context = name => ({ kind: "field", name, static: false, metadata, addInitializer: initializer => added.push(initializer) });

    // A decorator's cost is paid when it is applied and when the class
    // registers: it returns no field initializer and adds no initializer.
    assert.equal(CjsSchema.meta.type.rawStruct("AkGameObjectID")(undefined, context("ID")), undefined);
    assert.equal(CjsSchema.meta.type.string(undefined, context("optional")), undefined);
    assert.deepEqual(added, []);

    class SchemaDefaultCaptureProbe
    {
        constructor()
        {
            constructorCount++;
            this.ID = null;
            this.optional = undefined;
            this.ID = 100 + constructorCount;
        }

        Initialize()
        {
            initializeCount++;
            throw new Error("getDefaults must not initialize");
        }
    }

    CjsSchema.defineField(
        SchemaDefaultCaptureProbe,
        "ID",
        "edit",
        { read: true }
    );
    CjsSchema.defineField(
        SchemaDefaultCaptureProbe,
        "optional",
        "edit",
        { read: true }
    );
    CjsSchema.meta.define({
        className: "SchemaDefaultCaptureProbe",
        family: "test"
    })(SchemaDefaultCaptureProbe, { kind: "class", metadata });

    // Defaults are what a new instance holds, constructor state included.
    const first = CjsSchema.getDefaults(SchemaDefaultCaptureProbe);
    assert.deepEqual(first, {
        _type: "SchemaDefaultCaptureProbe",
        ID: 101,
        optional: undefined
    });
    assert.equal(constructorCount, 1);
    assert.equal(initializeCount, 0);

    first.ID = 999;
    assert.deepEqual(CjsSchema.getDefaults("SchemaDefaultCaptureProbe"), {
        _type: "SchemaDefaultCaptureProbe",
        ID: 101,
        optional: undefined
    });
    assert.equal(constructorCount, 1, "the immutable template was reused");
});

test("CjsSchema.getDefaults reads a redeclaring subclass's own value", () =>
{
    const baseMetadata = Object.create(null);
    const subclassMetadata = Object.create(baseMetadata);
    const addInitializer = () => {};
    CjsSchema.meta.type.int32(undefined, { kind: "field", name: "type", static: false, metadata: baseMetadata, addInitializer });
    CjsSchema.meta.type.int32(undefined, { kind: "field", name: "type", static: false, metadata: subclassMetadata, addInitializer });

    class SchemaDefaultBaseProbe
    {
        constructor()
        {
            this.type = 0;
        }
    }

    CjsSchema.meta.define({
        className: "SchemaDefaultBaseProbe",
        family: "test"
    })(SchemaDefaultBaseProbe, { kind: "class", metadata: baseMetadata });

    class SchemaDefaultSubclassProbe extends SchemaDefaultBaseProbe
    {
        constructor()
        {
            super();
            this.type = 1;
        }
    }

    CjsSchema.meta.define({
        className: "SchemaDefaultSubclassProbe",
        family: "test"
    })(SchemaDefaultSubclassProbe, { kind: "class", metadata: subclassMetadata });

    assert.deepEqual(CjsSchema.getDefaults(SchemaDefaultSubclassProbe), {
        _type: "SchemaDefaultSubclassProbe",
        type: 1
    });
});

test("CjsSchema.getDefaults reads an explicitly registered schema accessor", () =>
{
    class SchemaDefaultAccessorProbe
    {
        #color = [1, 1, 1, 1];

        get color()
        {
            return this.#color;
        }
    }

    CjsSchema.decorateField(
        SchemaDefaultAccessorProbe,
        "color",
        CjsSchema.meta.type.color
    );
    CjsSchema.define(SchemaDefaultAccessorProbe, {
        className: "SchemaDefaultAccessorProbe",
        family: "test"
    });

    assert.deepEqual(CjsSchema.getDefaults(SchemaDefaultAccessorProbe), {
        _type: "SchemaDefaultAccessorProbe",
        color: [1, 1, 1, 1]
    });
});

test("CjsSchema.applyDefaults expands typed values without constructing a live graph", () =>
{
    let initializeCount = 0;

    class SchemaDefaultChild
    {
        label = "child";
        enabled = true;

        Initialize()
        {
            initializeCount++;
            throw new Error("applyDefaults must not initialize");
        }
    }

    CjsSchema.defineField(SchemaDefaultChild, "label", "type", { kind: "string" });
    CjsSchema.defineField(SchemaDefaultChild, "enabled", "type", { kind: "boolean" });
    CjsSchema.define(SchemaDefaultChild, {
        className: "SchemaDefaultChild",
        family: "test"
    });

    class SchemaDefaultRoot
    {
        name = "root";
        child = new SchemaDefaultChild();
        children = [new SchemaDefaultChild()];
        settings = {
            scale: 2,
            nested: { x: 1, y: 2 }
        };
        peer = null;

        Initialize()
        {
            initializeCount++;
            throw new Error("applyDefaults must not initialize");
        }
    }

    CjsSchema.defineField(SchemaDefaultRoot, "name", "type", { kind: "string" });
    CjsSchema.defineField(SchemaDefaultRoot, "child", "type", {
        kind: "rootRef",
        className: "SchemaDefaultChild"
    });
    CjsSchema.defineField(SchemaDefaultRoot, "children", "type", {
        kind: "list",
        itemType: "SchemaDefaultChild"
    });
    CjsSchema.defineField(SchemaDefaultRoot, "settings", "type", { kind: "unknown" });
    CjsSchema.defineField(SchemaDefaultRoot, "peer", "type", {
        kind: "rootRef",
        className: "SchemaDefaultChild"
    });
    CjsSchema.define(SchemaDefaultRoot, {
        className: "SchemaDefaultRoot",
        family: "test"
    });

    const expanded = CjsSchema.applyDefaults({
        _type: "SchemaDefaultRoot",
        _id: 9,
        name: "authored",
        child: {
            _type: "SchemaDefaultChild",
            label: "authored child"
        },
        children: [{
            _type: "SchemaDefaultChild",
            label: "only authored child"
        }],
        settings: {
            nested: { x: 8 }
        },
        peer: { _ref: 9 }
    });

    assert.equal(initializeCount, 0);
    assert.equal(expanded._type, "SchemaDefaultRoot");
    assert.equal(expanded._id, 9);
    assert.equal(expanded.name, "authored");
    assert.deepEqual(expanded.child, {
        _type: "SchemaDefaultChild",
        label: "authored child",
        enabled: true
    });
    assert.deepEqual(expanded.children, [{
        _type: "SchemaDefaultChild",
        label: "only authored child",
        enabled: true
    }]);
    assert.deepEqual(expanded.settings, {
        scale: 2,
        nested: { x: 8, y: 2 }
    });
    assert.deepEqual(expanded.peer, { _ref: 9 });

    assert.throws(
        () => CjsSchema.applyDefaults({ _type: "UnknownSchemaDefaultType" }),
        /unknown _type/
    );
});
