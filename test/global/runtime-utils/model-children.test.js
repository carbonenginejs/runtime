import assert from "node:assert/strict";
import test from "node:test";
import * as children from "../../../src/blue/children.js";
import { getRuntimeState } from "../../../src/blue/compose/runtimeState.js";
import { NotifyModified } from "../../../src/blue/compose/values.js";
import { CjsSchema } from "../../../src/blue/schema/index.js";

const BELIST_UNLOADSTART = 0x07;
const BELIST_INSERTED = 0x08;
const BELIST_REMOVED = 0x09;

class ChildModel
{
    name = "";
    deleteRequested = false;
}

CjsSchema.defineField(ChildModel, "name", "type", { kind: "string" });
CjsSchema.defineField(ChildModel, "name", "exposure", { macro: "MAP_ATTRIBUTE", flags: 16 });
CjsSchema.defineField(ChildModel, "name", "edit", { persist: true });
CjsSchema.defineField(ChildModel, "deleteRequested", "type", { kind: "boolean" });
CjsSchema.defineField(ChildModel, "deleteRequested", "exposure", { macro: "MAP_ATTRIBUTE", flags: 16 });
CjsSchema.defineField(ChildModel, "deleteRequested", "edit", { persist: true });
CjsSchema.define(ChildModel, { name: "ChildMutationTestChild" });

class ParentModel
{
    children = [];
    listEvents = [];
    modifiedCount = 0;

    AddChild(child, options)
    {
        return children.addChild(this, "children", child, { ...options, listNotify: this });
    }

    RemoveChild(child, options)
    {
        return children.removeChild(this, "children", child, { ...options, listNotify: this });
    }

    DeleteChild(child, options)
    {
        return children.deleteChild(this, "children", child, { ...options, listNotify: this });
    }

    ClearChildren(options)
    {
        return children.clearChildren(this, "children", { ...options, listNotify: this });
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

CjsSchema.defineField(ParentModel, "children", "type", {
    kind: "list",
    itemType: "ChildMutationTestChild"
});
CjsSchema.defineField(ParentModel, "children", "exposure", { macro: "MAP_ATTRIBUTE", flags: 20 });
CjsSchema.defineField(ParentModel, "children", "edit", { persist: true, notify: true });
CjsSchema.define(ParentModel, { name: "ChildMutationTestParent" });

test("Schema remove detaches without deleting and delete uses explicit teardown", () => {
    const parent = new ParentModel();
    const first = new ChildModel();
    const second = new ChildModel();
    let teardown = null;
    let teardownThis = null;

    assert.strictEqual(parent.AddChild(first), first);
    parent.AddChild(second);

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
    assert.deepEqual(parent.listEvents.slice(-2).map(value => [ value.event, value.length ]), [
        [ BELIST_REMOVED, 1 ],
        [ BELIST_REMOVED, 0 ]
    ]);
});

test("Schema clear sends unload-start while the collection is populated", () => {
    const parent = new ParentModel();
    const first = new ChildModel();
    const second = new ChildModel();

    parent.AddChild(first);
    parent.AddChild(second);
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

test("Schema child mutation options preserve SetValues dirty and notification rules", () => {
    const parent = new ParentModel();
    const child = new ChildModel();

    parent.AddChild(child, { skipUpdate: true });
    assert.equal(getRuntimeState(parent)?.dirty ?? false, true);

    NotifyModified(parent, "children");
    parent.RemoveChild(child, { markDirty: false });
    assert.equal(getRuntimeState(parent)?.dirty ?? false, false);
});

test("a child field does not implicitly delete its owner relationship", () => {
    const parent = new ParentModel();
    const child = new ChildModel();
    parent.AddChild(child);

    CjsSchema.setValues(child, { deleteRequested: true });

    assert.deepEqual(parent.children, [ child ]);

    // Only explicit deletion removes the child.
    assert.equal(parent.DeleteChild(child), true);
    assert.deepEqual(parent.children, []);
});

test("Schema child helpers reject non-child collections and values", () => {
    class InvalidParent
    {
        bytes = new Uint8Array(4);
        value = 0;

        Add(property, child)
        {
            return children.addChild(this, property, child);
        }
    }

    CjsSchema.defineField(InvalidParent, "bytes", "type", { kind: "typedArray", arrayType: "Uint8Array" });
    CjsSchema.defineField(InvalidParent, "value", "type", { kind: "float32" });
    CjsSchema.define(InvalidParent, { name: "InvalidChildMutationParent" });

    const parent = new InvalidParent();
    assert.throws(() => children.addChild({}, "missing", {}), /registered schema instance/);
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
