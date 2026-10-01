import assert from "node:assert/strict";
import test from "node:test";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { IInitialize } from "../../npm/dist/global/blue/IInitialize.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { ITr2BoundingBox } from "../../npm/dist/global/interfaces/ITr2BoundingBox.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { applyReaderMember, finalizeReaderObject } from "../../npm/dist/global/schema/hydration.js";
import { Tr2Mesh } from "../../npm/dist/trinity/core/mesh/Tr2Mesh.js";
import { IEveSpaceObject2 } from "../../npm/dist/trinity/eve/IEveSpaceObject2.js";
import { IEveTransform } from "../../npm/dist/trinity/eve/IEveTransform.js";
import { EveMissileWarhead } from "../../npm/dist/trinity/eve/spaceObject/EveMissileWarhead.js";
import { EveRootTransform } from "../../npm/dist/trinity/eve/spaceObject/EveRootTransform.js";
import { EveTransform } from "../../npm/dist/trinity/eve/spaceObject/EveTransform.js";

// Synthetic, resource-free data exercises exposure-driven completion, not an
// authored asset or the unfinished declarations of the wider transform family.
function MakeMesh(name)
{
  const mesh = new Tr2Mesh();
  mesh.name = name;
  mesh.deferGeometryLoad = true;
  return mesh;
}

function AssertMeshCopy(copy, source)
{
  assert.ok(copy);
  assert.equal(CjsSchema.cast(copy, Tr2Mesh), copy);
  assert.notEqual(copy, source);
  assert.equal(copy.name, source.name);
}

test("transform exposure distinguishes Root from ordinary transforms and inherited Warhead completion", () =>
{
  const ordinary = mappedInterfaces(EveTransform);
  for (const Interface of [ EveTransform, IEveTransform, IEveSpaceObject2, IInitialize, ITr2BoundingBox ])
  {
    assert.equal(ordinary.has(Interface), true);
  }

  // Warhead's own concrete table is a separate class-owned declaration. This
  // prerequisite only checks the inherited EveTransform and IInitialize route.
  const warhead = mappedInterfaces(EveMissileWarhead);
  assert.equal(warhead.has(EveTransform), true);
  assert.equal(warhead.has(IInitialize), true);

  // EveRootTransform_Blue.cpp chains directly to Tr2Transform, bypassing the
  // EveTransform exposure table while retaining ordinary C++/JS inheritance.
  const root = new EveRootTransform();
  const rootInterfaces = mappedInterfaces(EveRootTransform);
  for (const Interface of [ EveRootTransform, IEveSpaceObject2, ITr2BoundingBox ])
  {
    assert.equal(rootInterfaces.has(Interface), true);
  }
  for (const Interface of [ EveTransform, IEveTransform, IInitialize ])
  {
    assert.equal(rootInterfaces.has(Interface), false);
  }
  assert.equal(CjsSchema.cast(root, EveTransform), root);
  assert.equal(root.Initialize, EveTransform.prototype.Initialize);
});

const cases = [
  [ "EveTransform", EveTransform, true ],
  [ "EveMissileWarhead", EveMissileWarhead, true ],
  [ "EveRootTransform", EveRootTransform, false ]
];

for (const [ name, Constructor, initializes ] of cases)
{
  test(`${name} Copier completion follows its mapped initializer for a lone LOD mesh`, () =>
  {
    const source = new Constructor();
    const lod = MakeMesh("synthetic lod");
    source.meshLod = lod;
    assert.equal(source.mesh, null);

    const copy = new Copier().CloneTo(source);

    assert.ok(copy);
    assert.equal(copy.constructor, Constructor);
    assert.notEqual(copy, source);
    if (initializes)
    {
      AssertMeshCopy(copy.mesh, lod);
      assert.equal(copy.meshLod, null, "EveTransform.Initialize moves the LOD reference");
    }
    else
    {
      assert.equal(copy.mesh, null, "an inherited method alone must not trigger initialization");
      AssertMeshCopy(copy.meshLod, lod);
    }
    assert.equal(source.mesh, null);
    assert.equal(source.meshLod, lod, "copy completion leaves the source graph untouched");
  });

  test(`${name} Copier preserves both authored mesh fields when a primary mesh exists`, () =>
  {
    const source = new Constructor();
    source.mesh = MakeMesh("synthetic primary");
    source.meshLod = MakeMesh("synthetic lod");

    const copy = new Copier().CloneTo(source);

    assert.ok(copy);
    AssertMeshCopy(copy.mesh, source.mesh);
    AssertMeshCopy(copy.meshLod, source.meshLod);
    assert.notEqual(copy.mesh, copy.meshLod);
    assert.equal(source.mesh.name, "synthetic primary");
    assert.equal(source.meshLod.name, "synthetic lod");
  });

  test(`${name} canonical reader completion preserves decoded identities and the primary-mesh guard`, t =>
  {
    const members = CjsSchema.getSchema(Constructor).members;
    const meshMember = members.find(member => member.key === "mesh");
    const lodMember = members.find(member => member.key === "meshLod");
    assert.ok(meshMember);
    assert.ok(lodMember);

    for (const hasPrimary of [ false, true ])
    {
      const target = new Constructor();
      const lod = MakeMesh("decoded lod");
      const primary = hasPrimary ? MakeMesh("decoded primary") : null;
      const initialize = t.mock.method(target, "Initialize");
      applyReaderMember(target, lodMember, lod);
      if (primary) applyReaderMember(target, meshMember, primary);

      assert.equal(target.mesh, primary, "member writes do not complete the object early");
      assert.equal(target.meshLod, lod);
      assert.equal(initialize.mock.callCount(), 0);
      assert.equal(finalizeReaderObject(target), target);
      assert.equal(initialize.mock.callCount(), initializes ? 1 : 0);
      if (initializes && !hasPrimary)
      {
        assert.equal(target.mesh, lod, "completion promotes the exact decoded mesh reference");
        assert.equal(target.meshLod, null);
      }
      else
      {
        assert.equal(target.mesh, primary);
        assert.equal(target.meshLod, lod);
      }
    }
  });
}
