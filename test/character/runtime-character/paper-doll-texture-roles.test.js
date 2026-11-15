import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataNamedValue, CjsCharacterDataParameter, CjsCharacterDataString, CjsCharacterDataTextureRole, CjsCharacterLibrary, CjsCharacterLibraryManager, CjsCharacterTextureRoles } from "../../../npm/dist/character/index.js";

const ROOT = "res:/graphics/character/female/paperdoll/";

// The shipped texture tables, as the library hands them out.
const ROLES = new CjsCharacterLibraryManager().GetTextureRoles();

test("CjsCharacterTextureRoles reads region, suffix, tier, property and operation from a file name", () =>
{
  const twist = CjsCharacterTextureRoles.lookup(ROLES, ROOT + "makeup/aging/aging_01/comp_head_tn_4k.png");
  assert.deepEqual([ twist.family, twist.region, twist.suffix, twist.tier, twist.property, twist.operation ],
    [ "comp", "head", "tn", "_4k", "NormalMap", "Twist" ]);
  const specular = CjsCharacterTextureRoles.lookup(ROLES, ROOT + "makeup/aging/aging_01/comp_body_s.png");
  assert.deepEqual([ specular.region, specular.tier, specular.property, specular.operation, specular.covered ], [ "body", "", "SpecularMap", "Simple", true ]);
  const zones = CjsCharacterTextureRoles.lookup(ROLES, "colorize_hair_z_512.png");
  assert.deepEqual([ zones.property, zones.operation, zones.inputOf ], [ "DiffuseMap", "", "l" ]);
  assert.equal(CjsCharacterTextureRoles.lookup(ROLES, "comp_body_m_512.png").property, "CutMaskMap");
  assert.equal(CjsCharacterTextureRoles.lookup(ROLES, "comp_head_mn.png").operation, "MaskedNormal");
  assert.equal(CjsCharacterTextureRoles.lookup(ROLES, "colorize_acc_l.png").operation, "Colorized");
  // A family's own role: the tattoo zone is an input of the bake, not of an `l` map.
  const tattoo = CjsCharacterTextureRoles.lookup(ROLES, ROOT + "tattoo/head/tattoofacea01/comp_head_z.png");
  assert.deepEqual([ tattoo.family, tattoo.suffix, tattoo.operation, tattoo.inputOf ], [ "comp", "z", "", "" ]);
  assert.match(tattoo.derived, /5a7e30d/);
});

test("CjsCharacterTextureRoles cites a source for every role", () =>
{
  for (const [ suffix, role ] of Object.entries(ROLES.table))
    assert.ok(role.source.length > 20 && role.property && role.channels, suffix);
});

test("CjsCharacterTextureRoles throws for a name it does not source", () =>
{
  // Unknown suffix, a known suffix under a family it is not sourced for, an unknown region, a non-png, a bare name.
  for (const name of [ "comp_head_q.png", "colorize_head_tn.png", "colorize_body_n_4k.png", "comp_face_d.png", "comp_head_d_256.dds", "normal_n.png" ])
    assert.throws(() => CjsCharacterTextureRoles.lookup(ROLES, name), /paper doll texture/, name);
});

test("the texture tables are the generic's: the shipped set, or an installed library's whole", () =>
{
  const installed = new CjsCharacterLibrary(), role = new CjsCharacterDataTextureRole();
  role.name = "d";
  role.families = [ Object.assign(new CjsCharacterDataString(), { str: "comp" }) ];
  role.property = "DiffuseMap";
  role.operation = "Simple";
  role.plan = "replace";
  role.source = "test";
  installed.generic.textureRoles.push(role);
  installed.generic.textureRegions.push(Object.assign(new CjsCharacterDataString(), { str: "head" }));
  const library = new CjsCharacterLibraryManager(installed);
  assert.throws(() => library.GetTextureRoles(), /texture roles need their regions, atlas, atlas tolerance and garment names/, "an installed set is complete");

  installed.generic.textureAtlas.push(Object.assign(new CjsCharacterDataParameter(), { name: "head", value: Float32Array.of(0, 0, 1, 1) }));
  installed.generic.textureAtlasTolerance = 0.01;
  installed.generic.textureGarmentMaps.push(Object.assign(new CjsCharacterDataNamedValue(), { name: "detail", value: "comp_body_d" }));
  library.InstallLibrary(installed);
  const roles = library.GetTextureRoles();
  assert.deepEqual([ Object.keys(roles.table), roles.regions, roles.atlas, roles.atlasTolerance, roles.garment ],
    [ [ "d" ], [ "head" ], { head: [ 0, 0, 1, 1 ] }, 0.01, { detail: [ "comp_body_d" ] } ], "whole, never mixed with the shipped set");
  assert.equal(CjsCharacterTextureRoles.lookup(roles, "comp_head_d.png").operation, "Simple");
  assert.throws(() => CjsCharacterTextureRoles.lookup(roles, "comp_head_n.png"), /Unknown paper doll texture role/, "the shipped n is not in force");
  assert.deepEqual(Object.keys(new CjsCharacterLibraryManager(installed.GetData()).GetTextureRoles().table), [ "d" ], "and reads back");
  roles.table.d.operation = "changed";
  assert.equal(library.GetTextureRoles().table.d.operation, "Simple", "the caller's own copy");
  assert.equal(Object.keys(new CjsCharacterLibraryManager().GetTextureRoles().table).length, 9, "nothing installed: the shipped set");
});
