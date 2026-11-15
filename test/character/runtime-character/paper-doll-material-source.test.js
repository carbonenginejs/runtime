import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsPaperDollDefinition, CjsPaperDollMaterialSource, CjsCharacterTextureRoles, PaperDollPalettes } from "../../../npm/dist/character/index.js";
import { Tr2Effect } from "../../../npm/dist/trinity/index.js";
import { installPartsLibrary } from "../../support/partsLibrary.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const TOP = ROOT + "topmiddle/shirtaf01/";
const UNDER = ROOT + "topunderwear/";
const FILES = [
  // A top: the part folder holds the maps; v1 holds its own zone map and a name today's rules do not draw.
  TOP + "types/shirtaf01_amarr.type", TOP + "types/shirtaf01_plain.type", TOP + "metadata.yaml",
  TOP + "colorize_body_l.png", TOP + "colorize_body_z.png", TOP + "shirtaf01_n.png", TOP + "shirtaf01_s_4k.png", TOP + "comp_body_s_512.png",
  TOP + "amarr.color", TOP + "default.color",
  TOP + "v1/colorize_body_z.png", TOP + "v1/comb_body_s.png", TOP + "v1/metadata.yaml", TOP + "v1/comp_body_m.png",
  TOP + "shirtaf01.black", TOP + "shirtaf01_lod1.black",
  ROOT + "dependants/masktuck/standard/comp_body_m.png",
  // Underwear: one option per folder, typed per bloodline.
  UNDER + "bra01/types/bra01_amarr.type", UNDER + "bra01/comp_body_d.png", UNDER + "bra01/default.color",
  UNDER + "bra02/types/bra02_deteis.type", UNDER + "bra02/comp_body_d.png", UNDER + "bra02/white.color", UNDER + "bra02/default.color",
  // The bloodline heads: which archetype each depends on.
  ROOT + "head/amarr_amarr/metadata.yaml", ROOT + "head/caldari_deteis/metadata.yaml"
];
const ARCHETYPES = { Amarr: "archetypes/aashape", Deteis: "archetypes/cdshape" };
const META = "!!python/object:paperDoll.AvatarPartMetaData\n";
const TEXT = {
  [TOP + "types/shirtaf01_amarr.type"]: "!!python/tuple [topmiddle/shirtaf01, v1, amarr]\n",
  [TOP + "metadata.yaml"]: META + "dependantModifiers: []\noccludesModifiers: []\nnumColorAreas: -1\n",
  [TOP + "v1/metadata.yaml"]: META + "dependantModifiers: [dependants/masktuck/standard###0.5, utilityshapes/x]\noccludesModifiers: [topunderwear###1]\nnumColorAreas: 2\n",
  [ROOT + "head/amarr_amarr/metadata.yaml"]: META + "dependantModifiers: [archetypes/aashape###1.0]\noccludesModifiers: null\n",
  [ROOT + "head/caldari_deteis/metadata.yaml"]: META + "dependantModifiers: [archetypes/cdshape###1.0]\noccludesModifiers: null\n"
};

function services(t)
{
  installPartsLibrary(t, ROOT, FILES, { text: TEXT, overrides: {
    FetchPalette: async (path, { specular = false } = {}) => ({ colors: [ 0, 1, 2 ].map(() => Float32Array.of(.5, .5, .5, 1)), specularColors: specular ? [ 0, 1, 2 ].map(() => Float32Array.of(1, 1, 1, 1)) : null, pattern: null, path }),
    FetchMaterialMaskAreas: async () => [ 1, 2, 3 ]
  } });
}

/** A compositor recording textures and layers. */
class StubCompositor
{
  async Texture(path) { return { path, cutoutX: 0, cutoutY: 0, cutoutWidth: 1, cutoutHeight: 1, width: 64, height: 64 }; }
  async ColorAreas() { return [ 1, 2, 3 ]; }
  async Simple(source, region, mask = source) { const effect = new Tr2Effect(); return Object.assign(effect, { kind: "simple", source, mask }); }
  async CreateMaterialLayer(maps, palette)
  {
    const region = Float32Array.of(0, 0, 1, 1);
    return { maps, palette, DiffuseMap: { region }, DiffuseFor: value => ({ diffuse: maps.detail.path, colors: value.colors }),
      NormalMap: maps.normal ? { effect: "normal " + maps.normal.path, region } : null, SpecularMap: maps.specular ? { effect: "specular " + maps.specular.path, region } : null };
  }
}

async function configured(t, bloodline = "Amarr")
{
  services(t);
  const build = { content: { root: ROOT, sex: "female" }, closed: false, errors: [], notes: [], Error(m) { this.errors.push(m); }, Note(m) { this.notes.push(m); }, CheckActive() {}, Ready: value => value };
  const definition = new CjsPaperDollDefinition();
  definition.archetype.option = ARCHETYPES[bloodline];
  let rebuilt = 0;
  definition.Rebuild = () => { rebuilt++; };
  const composition = { compositor: new StubCompositor(), sources: new Map(), SetSource(name, source) { this.sources.set(name, source); } };
  const sources = await CjsPaperDollMaterialSource.prepareAll(composition, definition, build);
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  return { build, definition, sources, composition, rebuilt: () => rebuilt, settle };
}

test("the garment parts are the MATERIAL parts with the body target, their palettes each option's own", async t =>
{
  const { sources, definition } = await configured(t);
  assert.deepEqual([ ...sources.keys() ].sort(), [ "armLeft", "armRight", "bodyAugmentation", "bottomMiddle", "bottomOuter", "bottomUnderwear", "feet", "outer", "topMiddle", "topOuter", "topUnderwear" ]);
  assert.ok([ ...sources.keys() ].every(name => definition[name].constructor.palettes === PaperDollPalettes.OWN));
  assert.equal(sources.has("hair"), false);
});

test("underwear lists one option per folder; every garment starts with no option and off", async t =>
{
  const deteis = await configured(t, "Deteis");
  assert.deepEqual(deteis.definition.topUnderwear.GetOptions().map(option => [ option.id, option.path ]), [ [ "bra01", "topunderwear/bra01" ], [ "bra02", "topunderwear/bra02" ] ], "no recipe option while no recipe names the part's folder");
  deteis.definition.topUnderwear.recipePath = "topunderwear/bra01";
  assert.deepEqual(deteis.definition.topUnderwear.GetOptions().map(option => option.id), [ "bra01", "bra02", "recipe" ], "then the recipe option");
  deteis.definition.topUnderwear.recipePath = "";
  assert.deepEqual([ deteis.definition.topUnderwear.option, deteis.definition.topUnderwear.enabled ], [ "", false ], "no code-picked underwear: the character factory's defaults set it");
  assert.equal(deteis.definition.topMiddle.enabled, false, "a typed garment starts off");
  const [ bra ] = (await deteis.definition.topUnderwear.ResolveOption("bra02")).palettes.length ? [] : [ null ];
  assert.equal(bra, null, "a garment without a zone map offers no palettes");
});

test("a typed option resolves its variation, colour variant and metadata; the host reads its mesh facts first", async t =>
{
  const { definition, sources } = await configured(t);
  const hooked = [];
  sources.get("topMiddle").SetResolveHook(async (part, resolved) => { hooked.push([ part, resolved.id, resolved.type !== null, resolved.folders, resolved.dependants, resolved.shapes ]); });
  const option = await definition.topMiddle.ResolveOption("shirtaf01_amarr");
  assert.deepEqual(option.occludes, [ "topunderwear" ]);
  assert.deepEqual(option.colorAreas, [ 1, 2 ], "numColorAreas from the variation's metadata");
  assert.equal(option.defaultPalette, TOP + "amarr.color", "the colour variant");
  assert.deepEqual(option.palettes.map(record => record.name), [ "amarr", "default" ]);
  assert.deepEqual(hooked, [ [ "topMiddle", "shirtaf01_amarr", true, [ TOP + "v1/", TOP ], [ "dependants/masktuck/standard" ],
    { requests: [ { modifierPath: "utilityshapes/x", targetName: "x", weight: 1, explicitWeight: false } ], occlusions: [] } ] ], "the utility shape decoded, not a dependant");
  assert.equal((await definition.topMiddle.ResolveOption("shirtaf01_plain")).defaultPalette, TOP + "default.color", "no variant: its default palette (ResolveColors)");
});

test("maps follow today's precedence: folder, then tier, then name; undrawn names are reported", async t =>
{
  const { definition, sources, build, rebuilt, settle } = await configured(t);
  await definition.topMiddle.ResolveOption("shirtaf01_amarr");
  const resolved = sources.get("topMiddle").GetResolved("shirtaf01_amarr");
  assert.equal(resolved.maps.zone, TOP + "v1/colorize_body_z.png", "the variation's zone map");
  assert.equal(resolved.maps.detail, TOP + "colorize_body_l.png", "falls back to the part folder");
  assert.equal(resolved.maps.normal, TOP + "shirtaf01_n.png", "<part>_n");
  // The variation folder comes first: its `comb_body_s` (drawn as a comp specular) beats the part folder's.
  assert.equal(resolved.maps.specular, TOP + "v1/comb_body_s.png");
  assert.equal(resolved.maps.cutMask, TOP + "v1/comp_body_m.png");
  const source = sources.get("topMiddle"), value = { option: "shirtaf01_amarr", colors: [] };
  assert.deepEqual(source.GetLayers(value, "body", "DiffuseMap"), [], "maps load on the first draw");
  assert.equal(source.MapsWaiting("shirtaf01_amarr"), true);
  await settle(); await settle();
  assert.equal(rebuilt(), 1, "a landed load rebuilds the definition");
  assert.equal(source.MapsWaiting("shirtaf01_amarr"), false);
  const [ diffuse ] = source.GetLayers(value, "body", "DiffuseMap");
  assert.equal(diffuse.effect.diffuse, TOP + "colorize_body_l.png");
  assert.deepEqual(source.GetLayers(value, "body", "CutMaskMap").map(mask => mask.effect.source.path), [ TOP + "v1/comp_body_m.png", ROOT + "dependants/masktuck/standard/comp_body_m.png" ], "its own mask, then each dependant folder's");
  const [ clear, normal ] = source.GetLayers(value, "body", "NormalMap");
  assert.equal(clear.effect.source.path, "dynamic:/color/0.5,0.5,1,1");
  assert.equal(normal.effect, "normal " + TOP + "shirtaf01_n.png");
  assert.deepEqual(source.GetLayers(value, "head", "DiffuseMap"), []);
  assert.deepEqual(source.GetCutMaskPaths(value), [ TOP + "v1/comp_body_m.png", ROOT + "dependants/masktuck/standard/comp_body_m.png" ]);
  assert.deepEqual(source.Describe()[0].skipped, { overridden: [ "shirtaf01/colorize_body_z", "shirtaf01/shirtaf01_s", "shirtaf01/comp_body_s" ].sort(), unruled: [] },
    "maps a better one hides, apart from names no rule draws");
  assert.deepEqual(build.errors, []);
});

test("the garment names: today's first, then the ruled ones, with folder, tier, name precedence and a `*` fallback", () =>
{
  const F = "res:/graphics/character/female/paperdoll/outer/robef01/";
  const ROLES = new CjsCharacterLibraryManager().GetTextureRoles();
  // A 4k `<part>_s` beats a 512 `comp_body_s` in the same folder: the tier comes before the name.
  assert.equal(CjsCharacterTextureRoles.pickGarmentMaps(ROLES, [ F ], [ F + "robef01_s_4k.png", F + "comp_body_s_512.png" ]).specular, F + "robef01_s_4k.png");
  // Another part's name (`robeam01_n` in `robef01`) draws where nothing else does; two such candidates throw.
  assert.equal(CjsCharacterTextureRoles.pickGarmentMaps(ROLES, [ F ], [ F + "robeam01_n.png" ]).normal, F + "robeam01_n.png");
  assert.throws(() => CjsCharacterTextureRoles.pickGarmentMaps(ROLES, [ F ], [ F + "a_n.png", F + "b_n.png" ]), /Ambiguous garment maps/);
  // A masked normal and a twist normal, and a variation's own authored diffuse ahead of the part folder's detail.
  const maps = CjsCharacterTextureRoles.pickGarmentMaps(ROLES, [ F + "v4/", F ], [ F + "comp_body_mn.png", F + "_tn.png", F + "v4/robef01_d.png", F + "colorize_body_l.png" ]);
  assert.deepEqual([ maps.normal, maps.twist, maps.detail ], [ F + "comp_body_mn.png", F + "_tn.png", F + "v4/robef01_d.png" ]);
  assert.deepEqual(ROLES.garment.specular, [ "comp_body_s", "<part>_s", "_s", "colorize_body_s", "comb_body_s", "<part>_body_s", "*_s" ]);
  // Junk names stay unruled.
  assert.deepEqual(CjsCharacterTextureRoles.garmentSkipped(ROLES, [ F ], [ F + "dots_prv.png", F + "colorize_body_s_resize.png" ], []).unruled.sort(), [ "robef01/colorize_body_s_resize", "robef01/dots_prv" ]);
});

test("the recipe option takes the part folder and variation the component names, read again when forgotten", async t =>
{
  const { definition } = await configured(t);
  const component = definition.topMiddle;
  component.recipePath = "topmiddle/shirtaf01";
  component.recipeVariation = "v1";
  const first = await component.ResolveOption("recipe");
  assert.equal(first.path, "topmiddle/shirtaf01", "the option takes the folder it names");
  assert.deepEqual(first.occludes, [ "topunderwear" ], "the variation folder's metadata");
  component.recipeVariation = "";
  component.ForgetResolution("recipe");
  const second = await component.ResolveOption("recipe");
  assert.deepEqual(second.occludes, [], "the part folder's metadata, once forgotten and read again");
  component.recipePath = "topmiddle/missing01";
  component.ForgetResolution("recipe");
  await assert.rejects(component.ResolveOption("recipe"), /No topMiddle part folder topmiddle\/missing01/);
});
