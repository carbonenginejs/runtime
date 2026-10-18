import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta, type } from "../../src/global/schema/index.js";
import { be } from "../../src/global/blue/index.js";
import { mappedInterfaces, exposureChainTo } from "../../src/global/compose/interface.js";

/**
 * Declares one record shape under a fresh class, so two definitions can be
 * compared on everything but their define.
 *
 * @returns {Function} The undeclared class.
 */
function Shape()
{
  return class
  {
    position = 0;
    count = 0;
    Apply() { return this.count; }
  };
}

const FIELDS = { position: [ type.float32, meta.persist ], count: [ type.uint32 ] };
const METHODS = { Apply: [ meta.implemented ] };

/**
 * The schema without the keys that name or attribute the class.
 *
 * @param {Function} Constructor Registered class.
 * @returns {object} Comparable schema.
 */
function Anonymous(Constructor)
{
  const { className, sourceClass, carbon, modelledOn, donors, blue: stamp, ...rest } = CjsSchema.getSchema(Constructor);
  void className; void sourceClass; void carbon; void modelledOn; void donors; void stamp;
  return SelfAsToken(rest, Constructor);
}

/**
 * Copies a schema record with every reference to its own class replaced by a
 * token, so two classes' records compare equal when only their identity differs.
 *
 * @param {*} value Record.
 * @param {Function} Constructor The class the record describes.
 * @returns {*} The copy.
 */
function SelfAsToken(value, Constructor)
{
  if (value === Constructor) return "<self>";
  if (Array.isArray(value)) return value.map(item => SelfAsToken(item, Constructor));
  if (value instanceof Map) return new Map([ ...value ].map(([ key, item ]) => [ key, SelfAsToken(item, Constructor) ]));
  if (value instanceof Set) return new Set([ ...value ].map(item => SelfAsToken(item, Constructor)));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([ key, item ]) => [ key, SelfAsToken(item, Constructor) ]));
  return value;
}

test("meta.define with carbon records provenance and nothing else", () =>
{
  const Plain = Shape();
  CjsSchema.meta.define(Plain, { className: "DefineCarbonPlain", fields: FIELDS, methods: METHODS });
  const Ported = Shape();
  CjsSchema.meta.define(Ported, { className: "DefineCarbonPorted", carbon: "DefineCarbonOwner::Nested", fields: FIELDS, methods: METHODS });

  const schema = CjsSchema.getSchema(Ported);
  assert.equal(schema.carbon, "DefineCarbonOwner::Nested", "the donor is recorded as replicated");
  assert.equal(Object.hasOwn(schema, "blue"), false, "no Blue stamp");
  assert.equal(Object.hasOwn(schema, "modelledOn"), false);
  assert.equal(Object.hasOwn(schema, "donors"), false);

  // Members, properties, methods, struct and status are those of the same class without a donor.
  assert.deepEqual(Anonymous(Ported), Anonymous(Plain));
  for (const member of [ ...schema.members, ...schema.properties ])
  {
    assert.equal(Object.hasOwn(member, "carbon"), false, `${member.name} carries no Carbon member stamp`);
  }

  // Registration is class access for both, with the same flags; neither is exposed.
  assert.strictEqual(CjsSchema.getConstructor("DefineCarbonPorted"), Ported);
  assert.equal(be.classes.GetClassRegistration("DefineCarbonPorted").flags, be.classes.GetClassRegistration("DefineCarbonPlain").flags);
  assert.equal(mappedInterfaces(Ported).size, 0);
  assert.equal(exposureChainTo(Ported), null);

  // GetTypeInfo differs only in the class name.
  const [ portedClass, ...portedRest ] = be.classes.GetTypeInfo(new Ported());
  const [ plainClass, ...plainRest ] = be.classes.GetTypeInfo(new Plain());
  assert.deepEqual({ ...portedClass, classname: null }, { ...plainClass, classname: null });
  assert.deepEqual(portedRest, plainRest);
  assert.deepEqual(portedRest[2], {}, "no method is reported as Carbon's");
});

test("donors still read as modelledOn under meta and as the replica under blue", () =>
{
  const Modelled = Shape();
  CjsSchema.meta.define(Modelled, { className: "DefineCarbonModelled", donors: [ "DefineCarbonOwner::Nested" ] });
  assert.equal(CjsSchema.getSchema(Modelled).modelledOn, "DefineCarbonOwner::Nested");
  assert.equal(Object.hasOwn(CjsSchema.getSchema(Modelled), "carbon"), false);

  const Stamped = Shape();
  CjsSchema.blue.define(Stamped, { className: "DefineCarbonStamped", donors: [ "DefineCarbonOwner::Nested" ] });
  assert.equal(CjsSchema.getSchema(Stamped).carbon, "DefineCarbonOwner::Nested");
  assert.equal(CjsSchema.getSchema(Stamped).blue, true, "only blue.define stamps the class as Blue");
});

test("a define takes carbon or modelledOn, not both", () =>
{
  assert.throws(() => CjsSchema.meta.define(Shape(), { className: "DefineCarbonBoth", carbon: "A::B", donors: [ "A::B" ] }), /carbon or modelledOn/);
});
