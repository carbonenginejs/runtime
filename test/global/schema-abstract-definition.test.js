import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../src/global/schema/index.js";
import { CjsBlueClasses } from "../../src/global/blue/CjsBlueClasses.js";
import * as classRegistry from "../../src/global/blue/classes/registry.js";

const { ClassRegistrarNullFactory, getClassRegistrationRevision } = classRegistry;

const registry = new CjsBlueClasses();
const routes = [
  ["explicit", (Constructor, definition) => CjsSchema.define(Constructor, definition)],
  ["type", (Constructor, definition) => meta.define(definition)(Constructor)],
  ["stage3", (Constructor, definition, metadata = {}) => meta.define(definition)(Constructor, {kind: "class", metadata})],
];

function remove(...names)
{
  registry.UnregisterClasses(names.map(name => ({name})));
}

for (const [route, define] of routes)
{
  test(`${route} definition registers abstract identity and aliases with a shared callable refusal`, () =>
  {
    let constructions = 0;
    class Abstract
    {
      value = 3;
      constructor() { constructions++; }
    }
    const name = `AbstractDefinition_${route}`;
    const alias = `${name}_alias`;
    const secondAlias = `${name}_second`;
    const revision = getClassRegistrationRevision();
    const before = CjsSchema.getSchema(Abstract);
    assert.equal(Object.hasOwn(before, "abstract"), false);
    define(Abstract, {
      className: name, aliases: [alias, alias], alias: secondAlias,
      abstract: true, fields: {value: meta.type.float32},
    });
    try
    {
      assert.equal(getClassRegistrationRevision(), revision + 3, "one atomic registration per distinct name");
      for (const registeredName of [name, alias, secondAlias])
      {
        assert.deepEqual(registry.GetClassRegistration(registeredName), {
          name: registeredName, type: Abstract, createFn: ClassRegistrarNullFactory, flags: 1,
        });
        assert.strictEqual(CjsSchema.GetConstructor(registeredName), Abstract);
        assert.equal(registry.FindClsid(registeredName), registeredName);
        assert.equal(registry.CreateInstance(registeredName), null);
        assert.equal(registry.CreateInstanceFromName(registeredName), null);
        assert.equal(registry.GetClassRegistration(registeredName).createFn(), null);
      }
      const schema = CjsSchema.getSchema(Abstract);
      assert.notStrictEqual(schema, before);
      assert.equal(Object.hasOwn(schema, "abstract"), true);
      assert.equal(schema.abstract, true);
      assert.equal(schema.members[0].type.kind, "float32");
      assert.equal(CjsSchema.getSchema(Abstract, {namespaces: ["type"]}).abstract, true);
      assert.equal(constructions, 0, "registration, inspection and refused creation do not construct");
      assert.equal(new Abstract().value, 3, "direct construction remains usable");
      assert.equal(constructions, 1);
    }
    finally { remove(name, alias, secondAlias); }
  });
}

test("abstract registration is own-class policy rather than inherited metadata or static state", () =>
{
  let constructions = 0;
  class Base
  {
    static abstract = true;
    constructor() { constructions++; }
  }
  class Concrete extends Base {}
  class ExplicitConcrete extends Base {}
  class AbstractChild extends Base {}
  class UnregisteredChild extends Base {}
  const names = ["OwnAbstractBase", "OwnConcreteChild", "OwnExplicitConcrete", "OwnAbstractChild"];
  CjsSchema.define(Base, {className: names[0], abstract: true});
  CjsSchema.define(Concrete, {className: names[1]});
  meta.define({className: names[2], abstract: false})(ExplicitConcrete);
  meta.define({className: names[3], abstract: true})(AbstractChild);
  try
  {
    assert.equal(CjsSchema.getSchema(Base).abstract, true);
    assert.equal(Object.hasOwn(CjsSchema.getSchema(Concrete), "abstract"), false, "omitted declaration does not change ordinary schema shape");
    assert.equal(CjsSchema.getSchema(ExplicitConcrete).abstract, false);
    assert.equal(Object.hasOwn(CjsSchema.getSchema(UnregisteredChild), "abstract"), false);
    assert.equal(CjsSchema.getSchema(AbstractChild).abstract, true);
    assert.equal(registry.CreateInstance(names[0]), null);
    assert.equal(registry.CreateInstance(names[3]), null);
    assert.equal(constructions, 0);
    assert.strictEqual(Object.getPrototypeOf(registry.CreateInstance(names[1])), Concrete.prototype);
    assert.strictEqual(Object.getPrototypeOf(registry.CreateInstance(names[2])), ExplicitConcrete.prototype);
    assert.equal(registry.GetClassRegistration(names[1]).flags, 0);
    assert.equal(registry.GetClassRegistration(names[2]).flags, 0);
    assert.equal(constructions, 2);
  }
  finally { remove(...names); }
});

test("abstract method provenance alone does not select class factory refusal", () =>
{
  class MethodOnly { Work() {} }
  CjsSchema.decorateMethod(MethodOnly, "Work", meta.abstract);
  CjsSchema.define(MethodOnly, {className: "AbstractMethodOnly"});
  try
  {
    assert.equal(CjsSchema.getMethod(MethodOnly, "Work").impl.status, "abstract");
    assert.equal(Object.hasOwn(CjsSchema.getSchema(MethodOnly), "abstract"), false);
    assert.strictEqual(Object.getPrototypeOf(registry.CreateInstance("AbstractMethodOnly")), MethodOnly.prototype);
  }
  finally { remove("AbstractMethodOnly"); }
});

for (const [route, define] of routes)
{
  test(`${route} rejects nonboolean abstract declarations before registration and permits a corrected retry`, () =>
  {
    const invalid = [undefined, null, 0, 1, "true", "false", {}, [], new Boolean(true)];
    for (const [index, value] of invalid.entries())
    {
      class Invalid {}
      const name = `InvalidAbstract_${route}_${index}`;
      const alias = `${name}_alias`;
      const revision = getClassRegistrationRevision();
      assert.throws(() => define(Invalid, {className: name, aliases: [alias], abstract: value}), /abstract must be a boolean/);
      assert.equal(registry.GetClassRegistration(name), null);
      assert.equal(registry.GetClassRegistration(alias), null);
      assert.equal(CjsSchema.getClassName(Invalid), null);
      assert.equal(getClassRegistrationRevision(), revision);
      define(Invalid, {className: name, aliases: [alias], abstract: false});
      try
      {
        assert.equal(CjsSchema.getSchema(Invalid).abstract, false);
        assert.strictEqual(Object.getPrototypeOf(registry.CreateInstance(alias)), Invalid.prototype);
      }
      finally { remove(name, alias); }
    }
  });
}

test("invalid Stage-3 declaration does not consume field metadata before a corrected retry", () =>
{
  class Staged {}
  const metadata = {};
  meta.type.float32(undefined, {kind: "field", name: "value", metadata, addInitializer() {}});
  const context = {kind: "class", metadata};
  assert.throws(() => meta.define({className: "InvalidAbstractStaged", abstract: null})(Staged, context), /abstract must be a boolean/);
  assert.deepEqual(CjsSchema.getSchema(Staged).members, []);
  meta.define({className: "ValidAbstractStaged", abstract: true})(Staged, context);
  try
  {
    assert.equal(CjsSchema.getSchema(Staged).members[0].type.kind, "float32");
    assert.equal(registry.CreateInstance("ValidAbstractStaged"), null);
  }
  finally { remove("ValidAbstractStaged"); }
});

test("inherited definition properties do not declare an abstract construction policy", () =>
{
  class Concrete {}
  const definition = Object.assign(Object.create({abstract: true}), {className: "InheritedDefinitionAbstract"});
  CjsSchema.define(Concrete, definition);
  try
  {
    assert.equal(Object.hasOwn(CjsSchema.getSchema(Concrete), "abstract"), false);
    assert.strictEqual(Object.getPrototypeOf(registry.CreateInstance("InheritedDefinitionAbstract")), Concrete.prototype);
  }
  finally { remove("InheritedDefinitionAbstract"); }
});
