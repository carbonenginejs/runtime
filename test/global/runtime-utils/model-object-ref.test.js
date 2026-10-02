import "../../../src/global/blue/values.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../../src/global/schema/index.js";

/*
 * An `objectRef` field holds a REFERENCE. Assigning one must alias the value,
 * never copy it, and the distinguishing case is a reference whose declared type
 * is an interface name that no class registry can resolve — Carbon declares
 * plenty of those, and a name that does not resolve used to send the value down
 * the ordinary value path, where it was cloned into a plain object.
 *
 * That failure is silent. Nothing throws; the field simply stops holding the
 * object that was put in it.
 */

class Observed
{
    name = "";
}

CjsSchema.defineField(Observed, "name", "type", { kind: "string" });
CjsSchema.defineField(Observed, "name", "edit", { persist: true });
CjsSchema.define(Observed, { className: "ObjectRefTestObserved", family: "test" });

class Observer
{
    name = "";

    observer = null;
}

CjsSchema.defineField(Observer, "name", "type", { kind: "string" });
CjsSchema.defineField(Observer, "name", "edit", { persist: true });
// The declared type names an interface on purpose: no registry resolves it.
CjsSchema.defineField(Observer, "observer", "type", {
    kind: "objectRef",
    className: "IObjectRefTestInterface"
});
CjsSchema.defineField(Observer, "observer", "edit", { persist: true });
CjsSchema.define(Observer, { className: "ObjectRefTestObserver", family: "test" });

test("SetValues aliases a live model in an objectRef field rather than copying it", () =>
{
    const observed = new Observed();
    observed.name = "engine";

    const observer = new Observer();
    CjsSchema.setValues(observer, { name: "placement", observer: observed });

    assert.equal(
        observer.observer,
        observed,
        "an objectRef must hold the instance it was given, not a copy of it"
    );
    assert.equal(observer.observer.constructor.name, "Observed");
});

test("a model from another copy of this package is still recognised as a model", () =>
{
    // What a sibling package's model looks like from here: same shape, same
    // brand, different class identity. `instanceof` says no; the brand says
    // yes, and the brand is the one that matches reality.
    const foreign = Object.create({
        SetValues() {},
        GetValues() { return {}; }
    });
    foreign.name = "foreign";


    const observer = new Observer();
    CjsSchema.setValues(observer, { observer: foreign });
    assert.equal(
        observer.observer,
        foreign,
        "a cross-copy model must alias too, or the copy boundary silently degrades it"
    );
});


test("isInstanceOf answers by declared name rather than by constructor identity", () =>
{
    class Derived extends Observed {}
    CjsSchema.define(Derived, { className: "ObjectRefTestDerived", family: "test" });
    const derived = new Derived();

    assert.deepEqual(
        CjsSchema.getClassNames(Derived).slice(0, 2),
        [ "ObjectRefTestDerived", "ObjectRefTestObserved" ]
    );
    assert.equal(CjsSchema.isInstanceOf("ObjectRefTestDerived", derived), true);
    assert.equal(CjsSchema.isInstanceOf("ObjectRefTestObserved", derived), true, "a base class must match too");
    assert.equal(CjsSchema.isInstanceOf("ObjectRefTestObserver", derived), false);
    assert.equal(CjsSchema.isInstanceOf("", derived), false);
    assert.equal(CjsSchema.isInstanceOf("ObjectRefTestDerived", { name: "bag" }), false);
});

test("isInstanceOf reads a class this copy has never seen", () =>
{
    // What a sibling package's CLASS registration looks like from here: the
    // WeakMap holding schema metadata is private to whichever copy created it,
    // so this copy has none. Only the stamp crosses, and the stamp is enough.
    //
    // This is the case that makes the check worth having. Resolving the name
    // through GetConstructor and testing `instanceof` would compare identity
    // again and fail exactly here.
    const stamp = Symbol.for("carbonenginejs.className");
    class ForeignBase {}
    Object.defineProperty(ForeignBase, stamp, { value: "ForeignTr2Mesh" });
    class ForeignShip extends ForeignBase {}
    Object.defineProperty(ForeignShip, stamp, { value: "ForeignEveShip2" });

    const foreign = new ForeignShip();

    assert.equal(CjsSchema.GetConstructor("ForeignEveShip2"), null, "this copy has no registration for it");
    assert.equal(CjsSchema.isInstanceOf("ForeignEveShip2", foreign), true);
    assert.equal(CjsSchema.isInstanceOf("ForeignTr2Mesh", foreign), true);
    assert.equal(CjsSchema.isInstanceOf("ForeignTr2Effect", foreign), false);
});

test("an objectRef to an interface throws on a plain bag with no class", () =>
{
    // A plain object is data, not a reference - but a member typed as an
    // interface nothing registers has no class to build from it, and a typed
    // member does not keep a plain object (operator, 2026-09-26).
    const observer = new Observer();
    assert.throws(() => CjsSchema.setValues(observer, { observer: { name: "from-values" } }), /_type/u);
    assert.equal(observer.observer, null);
});

test("a class name survives the package-copy boundary", () =>
{
    // Import and export fail across copies for the same reason and with the
    // same silence: the import path copies instead of aliasing, and the export
    // path omits `_type`, which is what makes the values graph stop being a
    // rebuild source. Both identities are carried on global-registry symbols.
    const foreignClass = class {};
    Object.defineProperty(foreignClass, Symbol.for("carbonenginejs.className"), {
        value: "ForeignDeclaredClass",
        configurable: true
    });

    assert.equal(CjsSchema.getClassName(foreignClass), "ForeignDeclaredClass");
    assert.equal(CjsSchema.getClassName(class {}), null);
});

test("the model brand is not exported as a field value", () =>
{
    const observed = new Observed();
    observed.name = "engine";

    const values = CjsSchema.getValues(observed, {});
    assert.deepEqual(Object.keys(values), [ "name" ]);
    assert.equal(Object.getOwnPropertySymbols(values).length, 0);
});

// A registered class need not be a CjsModel - resources and AL classes are
// not - and the Black reader hands over live instances of them, as
// Tr2InstancedMesh.instanceGeometryResource receives a TriGeometryRes. Carbon
// assigns that pointer; the value path used to rebuild it as the declared
// interface and threw "is not a CjsModel".
class RegisteredResource
{
    path = "";
}

CjsSchema.define(RegisteredResource, { className: "ObjectRefTestResource", family: "test" });

class ResourceInterface {}

CjsSchema.define(ResourceInterface, { className: "IObjectRefTestResource", family: "test" });

class ResourceHolder
{
    resource = null;

    resources = [];
}

CjsSchema.defineField(ResourceHolder, "resource", "type", { kind: "objectRef", className: "IObjectRefTestResource" });
CjsSchema.defineField(ResourceHolder, "resource", "edit", { persist: true });
CjsSchema.defineField(ResourceHolder, "resources", "type", { kind: "list", itemType: "IObjectRefTestResource" });
CjsSchema.defineField(ResourceHolder, "resources", "edit", { persist: true });
CjsSchema.define(ResourceHolder, { className: "ObjectRefTestResourceHolder", family: "test" });

test("a live instance of a registered non-model class is assigned, not rebuilt", () =>
{
    const resource = new RegisteredResource();
    const other = new RegisteredResource();
    const holder = new ResourceHolder();

    CjsSchema.setValues(holder, { resource, resources: [ other ] });

    assert.equal(holder.resource, resource);
    assert.equal(holder.resources[0], other);
});
