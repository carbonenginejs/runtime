import assert from "node:assert/strict";
import test from "node:test";
import { CjsModel, isModelInstance } from "../src/model/index.js";
import { CjsSchema } from "../src/schema/index.js";

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

class Observed extends CjsModel
{
    name = "";
}

CjsSchema.define(Observed, { className: "ObjectRefTestObserved", family: "test" });
CjsSchema.defineField(Observed, "name", "type", { kind: "string" });
CjsSchema.defineField(Observed, "name", "io", { persist: true });

class Observer extends CjsModel
{
    name = "";

    observer = null;
}

CjsSchema.define(Observer, { className: "ObjectRefTestObserver", family: "test" });
CjsSchema.defineField(Observer, "name", "type", { kind: "string" });
CjsSchema.defineField(Observer, "name", "io", { persist: true });
// The declared type names an interface on purpose: no registry resolves it.
CjsSchema.defineField(Observer, "observer", "type", {
    kind: "objectRef",
    className: "IObjectRefTestInterface"
});
CjsSchema.defineField(Observer, "observer", "io", { persist: true });

test("SetValues aliases a live model in an objectRef field rather than copying it", () =>
{
    const observed = new Observed();
    observed.name = "engine";

    const observer = new Observer();
    observer.SetValues({ name: "placement", observer: observed });

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
        [Symbol.for("carbonenginejs.model")]: true,
        SetValues() {},
        GetValues() { return {}; }
    });
    foreign.name = "foreign";

    assert.equal(foreign instanceof CjsModel, false);
    assert.equal(isModelInstance(foreign), true);

    const observer = new Observer();
    observer.SetValues({ observer: foreign });
    assert.equal(
        observer.observer,
        foreign,
        "a cross-copy model must alias too, or the copy boundary silently degrades it"
    );
});

test("an objectRef still constructs from a plain values bag", () =>
{
    // The alias rule must not swallow the ordinary case: a plain object is
    // data, not a reference, and there is nothing to alias.
    const observer = new Observer();
    observer.SetValues({ observer: { name: "from-values" } });

    assert.equal(isModelInstance(observer.observer), false);
    assert.equal(observer.observer.name, "from-values");
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

    const values = observed.GetValues();
    assert.deepEqual(Object.keys(values), [ "name" ]);
    assert.equal(Object.getOwnPropertySymbols(values).length, 0);
});
