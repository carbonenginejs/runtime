import assert from "node:assert/strict";
import test from "node:test";
import * as children from "../../../src/global/blue/children.js";
import { NOTIFY_METHODS } from "../../../src/global/compose/notify.js";
import { getRuntimeState } from "../../../src/global/compose/runtimeState.js";
import { settleModifiedMembers } from "../../../src/global/compose/values.js";
import { CjsSchema } from "../../../src/global/schema/index.js";

const BELIST_UNLOADSTART = 0x07;
const BELIST_INSERTED = 0x08;
const BELIST_REMOVED = 0x09;

class ChildModel
{
    name = "";
    deleteRequested = false;
}

CjsSchema.defineField(ChildModel, "name", "type", { kind: "string" });
CjsSchema.defineField(ChildModel, "name", "edit", { persist: true });
CjsSchema.defineField(ChildModel, "deleteRequested", "type", { kind: "boolean" });
CjsSchema.defineField(ChildModel, "deleteRequested", "edit", { persist: true });
CjsSchema.define(ChildModel, { className: "ChildMutationTestChild", family: "test" });

class ParentModel
{
    children = [];
    listEvents = [];
    modifiedCount = 0;

    CreateChild(values, options)
    {
        return children.createChild(this, "children", values, { ...options, listNotify: this });
    }

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
CjsSchema.defineField(ParentModel, "children", "edit", { persist: true, notify: true });
CjsSchema.defineField(ParentModel, "children", "lifecycle", { ownership: "owned" });
CjsSchema.define(ParentModel, { className: "ChildMutationTestParent", family: "test" });

test("Schema child factories hydrate, append, notify and settle", () => {
    const parent = new ParentModel();
    const events = [];

    assert.equal(typeof children.addChild, "function");
    assert.equal(parent.addChild, undefined);
    NOTIFY_METHODS.OnEvent.call(parent, "childadded", (_name, _owner, payload) => events.push(payload));

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
    assert.equal(getRuntimeState(parent)?.dirty ?? false, false);
    assert.equal(parent.modifiedCount, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].property, "children");
    assert.equal(events[0].child, child);
    assert.equal(events[0].index, 0);
    assert.equal(events[0].source, parent);
});

test("Schema remove detaches without deleting and delete uses explicit teardown", () => {
    const parent = new ParentModel();
    const first = new ChildModel();
    const second = new ChildModel();
    const events = [];
    let teardown = null;
    let teardownThis = null;

    assert.strictEqual(parent.AddChild(first, { skipEvents: true }), first);
    parent.AddChild(second, { skipEvents: true });
    NOTIFY_METHODS.OnEvent.call(parent, "childremoved", (_name, _owner, payload) => events.push([ "removed", payload.child ]));
    NOTIFY_METHODS.OnEvent.call(parent, "childdeleted", (_name, _owner, payload) => events.push([ "deleted", payload.child ]));

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

test("Schema clear sends unload-start while the collection is populated", () => {
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

test("Schema child mutation options preserve SetValues dirty and notification rules", () => {
    const parent = new ParentModel();
    const child = new ChildModel();
    let eventCount = 0;
    NOTIFY_METHODS.OnEvent.call(parent, "childadded", () => eventCount++);

    parent.AddChild(child, { skipUpdate: true, skipEvents: true });
    assert.equal(getRuntimeState(parent)?.dirty ?? false, true);
    assert.equal(eventCount, 0);

    settleModifiedMembers(parent);
    parent.RemoveChild(child, { markDirty: false, skipEvents: true });
    assert.equal(getRuntimeState(parent)?.dirty ?? false, false);
});

test("a child field does not implicitly delete its owner relationship", () => {
    const parent = new ParentModel();
    const child = parent.CreateChild({ name: "requested" }, { skipEvents: true });

    CjsSchema.setValues(child, { deleteRequested: true }, { skipEvents: true });

    assert.deepEqual(parent.children, [ child ]);

    // Only explicit deletion removes the child.
    assert.equal(parent.DeleteChild(child, { skipEvents: true }), true);
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
    CjsSchema.define(InvalidParent, { className: "InvalidChildMutationParent", family: "test" });

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
