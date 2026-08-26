import assert from "node:assert/strict";
import test from "node:test";

import { CjsModel } from "../../../src/global/model/index.js";
import { CjsSchema } from "../../../src/global/schema/index.js";


test("CjsSchema.getDefaults lazily captures field initializers without Initialize", () =>
{
    const metadata = Object.create(null);
    const extraInitializers = [];
    let constructorCount = 0;
    let initializeCount = 0;

    const initializeID = CjsSchema.type.rawStruct("AkGameObjectID")(undefined, {
        kind: "field",
        name: "ID",
        static: false,
        metadata,
        addInitializer(initializer)
        {
            extraInitializers.push(initializer);
        }
    });
    const initializeOptional = CjsSchema.type.string(undefined, {
        kind: "field",
        name: "optional",
        static: false,
        metadata,
        addInitializer(initializer)
        {
            extraInitializers.push(initializer);
        }
    });

    class SchemaDefaultCaptureProbe extends CjsModel
    {
        constructor()
        {
            super();
            constructorCount++;
            this.ID = initializeID.call(this, null);
            this.optional = initializeOptional.call(this, undefined);
            for (const initializer of extraInitializers) initializer.call(this);
            this.ID = 100 + constructorCount;
        }

        Initialize()
        {
            initializeCount++;
            throw new Error("getDefaults must not initialize");
        }
    }

    CjsSchema.type.define({
        className: "SchemaDefaultCaptureProbe",
        family: "test"
    })(SchemaDefaultCaptureProbe, { kind: "class", metadata });
    CjsSchema.defineField(
        SchemaDefaultCaptureProbe,
        "ID",
        "io",
        { read: true }
    );
    CjsSchema.defineField(
        SchemaDefaultCaptureProbe,
        "optional",
        "io",
        { read: true }
    );

    const first = CjsSchema.getDefaults(SchemaDefaultCaptureProbe);
    assert.deepEqual(first, {
        _type: "SchemaDefaultCaptureProbe",
        ID: null,
        optional: undefined
    });
    assert.equal(constructorCount, 1);
    assert.equal(initializeCount, 0);

    first.ID = 999;
    assert.deepEqual(CjsSchema.getDefaults("SchemaDefaultCaptureProbe"), {
        _type: "SchemaDefaultCaptureProbe",
        ID: null,
        optional: undefined
    });
    assert.equal(constructorCount, 1, "the immutable template was reused");
});

test("CjsSchema.getDefaults prefers an explicitly decorated subclass initializer", () =>
{
    const baseMetadata = Object.create(null);
    const subclassMetadata = Object.create(baseMetadata);
    const addInitializer = () => {};
    const initializeBaseType = CjsSchema.type.int32(undefined, {
        kind: "field",
        name: "type",
        static: false,
        metadata: baseMetadata,
        addInitializer
    });
    const initializeSubclassType = CjsSchema.type.int32(undefined, {
        kind: "field",
        name: "type",
        static: false,
        metadata: subclassMetadata,
        addInitializer
    });

    class SchemaDefaultBaseProbe extends CjsModel
    {
        constructor()
        {
            super();
            this.type = initializeBaseType.call(this, 0);
        }
    }

    CjsSchema.type.define({
        className: "SchemaDefaultBaseProbe",
        family: "test"
    })(SchemaDefaultBaseProbe, { kind: "class", metadata: baseMetadata });

    class SchemaDefaultSubclassProbe extends SchemaDefaultBaseProbe
    {
        constructor()
        {
            super();
            this.type = initializeSubclassType.call(this, 1);
        }
    }

    CjsSchema.type.define({
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
    class SchemaDefaultAccessorProbe extends CjsModel
    {
        #color = [1, 1, 1, 1];

        get color()
        {
            return this.#color;
        }
    }

    CjsSchema.define(SchemaDefaultAccessorProbe, {
        className: "SchemaDefaultAccessorProbe",
        family: "test"
    });
    CjsSchema.decorateField(
        SchemaDefaultAccessorProbe,
        "color",
        CjsSchema.type.color
    );

    assert.deepEqual(CjsSchema.getDefaults(SchemaDefaultAccessorProbe), {
        _type: "SchemaDefaultAccessorProbe",
        color: [1, 1, 1, 1]
    });
});

test("CjsSchema.applyDefaults expands typed values without constructing a live graph", () =>
{
    let initializeCount = 0;

    class SchemaDefaultChild extends CjsModel
    {
        label = "child";
        enabled = true;

        Initialize()
        {
            initializeCount++;
            throw new Error("applyDefaults must not initialize");
        }
    }

    CjsSchema.define(SchemaDefaultChild, {
        className: "SchemaDefaultChild",
        family: "test"
    });
    CjsSchema.defineField(SchemaDefaultChild, "label", "type", { kind: "string" });
    CjsSchema.defineField(SchemaDefaultChild, "enabled", "type", { kind: "boolean" });

    class SchemaDefaultRoot extends CjsModel
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

    CjsSchema.define(SchemaDefaultRoot, {
        className: "SchemaDefaultRoot",
        family: "test"
    });
    CjsSchema.defineField(SchemaDefaultRoot, "name", "type", { kind: "string" });
    CjsSchema.defineField(SchemaDefaultRoot, "child", "type", {
        kind: "model",
        className: "SchemaDefaultChild"
    });
    CjsSchema.defineField(SchemaDefaultRoot, "children", "type", {
        kind: "list",
        itemType: "SchemaDefaultChild"
    });
    CjsSchema.defineField(SchemaDefaultRoot, "settings", "type", { kind: "unknown" });
    CjsSchema.defineField(SchemaDefaultRoot, "peer", "type", {
        kind: "objectRef",
        className: "SchemaDefaultChild"
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
