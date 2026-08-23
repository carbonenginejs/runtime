import assert from "node:assert/strict";
import test from "node:test";
import { CjsModel } from "../../../src/global/model/index.js";
import { CjsSchema } from "../../../src/global/schema/index.js";

const BELIST_UNLOADSTART = 0x07;
const BELIST_INSERTED = 0x08;
const BELIST_REMOVED = 0x09;

class ChildModel extends CjsModel
{
    name = "";
    deleteRequested = false;
}

CjsSchema.define(ChildModel, { className: "ChildMutationTestChild", family: "test" });
CjsSchema.defineField(ChildModel, "name", "type", { kind: "string" });
CjsSchema.defineField(ChildModel, "name", "io", { persist: true });
CjsSchema.defineField(ChildModel, "deleteRequested", "type", { kind: "boolean" });
CjsSchema.defineField(ChildModel, "deleteRequested", "io", {
    persist: true,
    rebuild: [ "delete" ]
});

class ParentModel extends CjsModel
{
    children = [];
    listEvents = [];
    modifiedCount = 0;

    CreateChild(values, options)
    {
        return CjsModel.createChild(this, "children", values, options);
    }

    AddChild(child, options)
    {
        return CjsModel.addChild(this, "children", child, options);
    }

    RemoveChild(child, options)
    {
        return CjsModel.removeChild(this, "children", child, options);
    }

    DeleteChild(child, options)
    {
        return CjsModel.deleteChild(this, "children", child, options);
    }

    ClearChildren(options)
    {
        return CjsModel.clearChildren(this, "children", options);
    }

    OnListModified(event, index, secondIndex, child, collection)
    {
        this.listEvents.push({
            event,
            index,
            secondIndex,
            child,
            length: collection.length
        });
    }

    OnModified()
    {
        this.modifiedCount++;
        return true;
    }
}

CjsSchema.define(ParentModel, { className: "ChildMutationTestParent", family: "test" });
CjsSchema.defineField(ParentModel, "children", "type", {
    kind: "list",
    itemType: "ChildMutationTestChild"
});
CjsSchema.defineField(ParentModel, "children", "io", {
    persist: true,
    ownership: "owned",
    flag: [ "bounds" ],
    rebuild: [ "children" ]
});

test("CjsModel child factories hydrate, append, notify, flag, and settle", () => {
    const parent = new ParentModel();
    const events = [];

    assert.equal(typeof CjsModel.addChild, "function");
    assert.equal(parent.addChild, undefined);
    parent.OnEvent("childadded", (_owner, payload) => events.push(payload));

    const child = parent.CreateChild({ name: "first" });

    assert.equal(child instanceof ChildModel, true);
    assert.equal(child.name, "first");
    assert.deepEqual(parent.children, [ child ]);
    assert.deepEqual(parent.listEvents, [{
        event: BELIST_INSERTED,
        index: 0,
        secondIndex: 0,
        child,
        length: 1
    }]);
    assert.equal(parent.__state.flags.has("bounds"), true);
    assert.equal(parent.__state.rebuild.has("children"), true);
    assert.equal(parent.IsDirty(), false);
    assert.equal(parent.modifiedCount, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].property, "children");
    assert.equal(events[0].child, child);
    assert.equal(events[0].index, 0);
    assert.equal(events[0].source, parent);
});

test("CjsModel remove detaches without deleting and delete uses explicit teardown", () => {
    const parent = new ParentModel();
    const first = new ChildModel();
    const second = new ChildModel();
    const events = [];
    let teardown = null;
    let teardownThis = null;

    assert.strictEqual(parent.AddChild(first, { skipEvents: true }), first);
    parent.AddChild(second, { skipEvents: true });
    parent.OnEvent("childremoved", (_owner, payload) => events.push([ "removed", payload.child ]));
    parent.OnEvent("childdeleted", (_owner, payload) => events.push([ "deleted", payload.child ]));

    assert.equal(parent.RemoveChild(first), true);
    assert.equal(parent.RemoveChild(first), false);
    assert.deepEqual(parent.children, [ second ]);

    assert.equal(parent.DeleteChild(second, {
        delete(child)
        {
            teardown = child;
            teardownThis = this;
        }
    }), true);

    assert.deepEqual(parent.children, []);
    assert.equal(teardown, second);
    assert.equal(teardownThis, parent);
    assert.deepEqual(events, [
        [ "removed", first ],
        [ "removed", second ],
        [ "deleted", second ]
    ]);
    assert.deepEqual(parent.listEvents.slice(-2).map(value => [ value.event, value.length ]), [
        [ BELIST_REMOVED, 1 ],
        [ BELIST_REMOVED, 0 ]
    ]);
});

test("CjsModel clear sends unload-start while the collection is populated", () => {
    const parent = new ParentModel();
    const first = new ChildModel();
    const second = new ChildModel();

    parent.AddChild(first, { skipEvents: true });
    parent.AddChild(second, { skipEvents: true });
    parent.listEvents.length = 0;

    assert.equal(parent.ClearChildren(), true);
    assert.equal(parent.ClearChildren(), false);
    assert.deepEqual(parent.children, []);
    assert.deepEqual(parent.listEvents, [{
        event: BELIST_UNLOADSTART,
        index: 0,
        secondIndex: 0,
        child: null,
        length: 2
    }]);
});

test("CjsModel child mutation options preserve SetValues dirty and token rules", () => {
    const parent = new ParentModel();
    const child = new ChildModel();
    let eventCount = 0;
    parent.OnEvent("childadded", () => eventCount++);

    parent.AddChild(child, { skipUpdate: true, skipEvents: true });
    assert.equal(parent.IsDirty(), true);
    assert.equal(parent.__state.flags.has("bounds"), true);
    assert.equal(parent.__state.rebuild.has("children"), true);
    assert.equal(eventCount, 0);

    parent.UpdateValues({ skipEvents: true });
    parent.__state.flags.clear();
    parent.__state.rebuild.clear();
    parent.RemoveChild(child, { markDirty: false, skipEvents: true });
    assert.equal(parent.IsDirty(), false);
    assert.equal(parent.__state.flags.size, 0);
    assert.equal(parent.__state.rebuild.size, 0);
});

test("child-owned rebuild requests remain context policy, not implicit parent deletion", () => {
    const parent = new ParentModel();
    const child = parent.CreateChild({ name: "requested" }, { skipEvents: true });

    child.__state.rebuild.clear();
    parent.__state.rebuild.clear();
    child.SetValues({ deleteRequested: true }, { skipEvents: true });

    assert.equal(child.__state.rebuild.has("delete"), true);
    assert.equal(parent.__state.rebuild.size, 0);
    assert.deepEqual(parent.children, [ child ]);

    // The context that owns this collection chooses when to consume the token.
    assert.equal(parent.DeleteChild(child, { skipEvents: true }), true);
    child.__state.rebuild.delete("delete");
    assert.deepEqual(parent.children, []);
});

test("CjsModel child helpers reject non-child collections and values", () => {
    class InvalidParent extends CjsModel
    {
        bytes = new Uint8Array(4);
        value = 0;

        Add(property, child)
        {
            return CjsModel.addChild(this, property, child);
        }
    }

    CjsSchema.define(InvalidParent, { className: "InvalidChildMutationParent", family: "test" });
    CjsSchema.defineField(InvalidParent, "bytes", "type", { kind: "typedArray", arrayType: "Uint8Array" });
    CjsSchema.defineField(InvalidParent, "value", "type", { kind: "float32" });

    const parent = new InvalidParent();
    assert.throws(() => CjsModel.addChild({}, "missing", {}), /CjsModel instance/);
    assert.throws(() => parent.Add("missing", {}), /no schema field/);
    assert.throws(() => parent.Add("bytes", {}), /schema array or list/);
    assert.throws(() => parent.Add("value", {}), /schema array or list/);

    const validParent = new ParentModel();
    assert.throws(() => validParent.AddChild(null), /non-null child object/);
    assert.throws(() => validParent.AddChild([]), /non-null child object/);
    assert.throws(() => validParent.AddChild(new Uint8Array(1)), /non-null child object/);
    assert.throws(() => validParent.AddChild(new ChildModel(), { onAdded: true }), /onAdded option/);
    assert.deepEqual(validParent.children, [], "invalid callbacks fail before mutation");
});
