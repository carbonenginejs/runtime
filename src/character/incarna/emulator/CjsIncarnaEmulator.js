// Not Carbon: our emulation of Incarna interiors as SOF data (operator,
// 2026-10-25). Current Carbon has no renderer for a Tr2InteriorStatic's areas,
// and EveSOF builds only from SOF data, so each piece becomes an EveSOF hull
// whose areas draw the quad shader from the piece's own maps
// (`dynamic:/incarna`), and an assembly of pieces becomes one layout, which a
// space scene builds like any other SOF object. The SOF data classes are made
// by name through Blue's registry, as the Black reader makes them: the
// character layer does not import the SOF layer.
import { blue } from "#blue";
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsMeshConstructor } from "../../../trinity/resources/geometry/CjsMeshConstructor.js";
import { CjsIncarnaTextureConstructor, RegisterIncarnaTextures } from "../texture/CjsIncarnaTextureConstructor.js";

/**
 * How each kind of emulated area is drawn: its shader as an SOF hull names
 * it, the packed shader whose generic entry it takes, its SOF area type, and
 * whether the shader takes the detail maps. The unpacked shaders, because
 * Incarna meshes carry classic tangent and binormal vectors and the plain quad
 * shaders read EVE hulls' angle-packed tangent frames; EVE's generic data lists
 * only the packed ones, which its hulls use.
 */
const AREA_KINDS = {
  opaque: { shader: "quad/unpacked_quaddetailv5.fx", packed: "quad/quaddetailv5.fx", areaType: "TYPE_PRIMARY", details: true },
  glass: { shader: "quad/unpacked_quadglassv5.fx", packed: "quad/quadglassv5.fx", areaType: "TYPE_GLASS", details: false }
};

/** A quad input with no Incarna source: black, a flat normal, or a detail without a mask. */
const BLACK = "dynamic:/color/0,0,0,1";
const FLAT_NORMAL = "dynamic:/color/0.5,0.5,0,1";
const NO_DETAIL = "dynamic:/color/0.5,0.5,0.5,0";

/**
 * Each quad input of an emulated area: the Incarna maps it may be made from,
 * the first one the area sets winning, the `dynamic:/incarna` role that maps
 * it, the constant used when the area sets none of them, and whether it is a
 * detail map, which the glass shader does not take.
 */
const AREA_TEXTURES = [
  [ "AlbedoMap", [ "OverlayMap", "DiffuseMap" ], "albedo", BLACK, false ],
  [ "RoughnessMap", [ "OverlayMap" ], "roughness", BLACK, false ],
  [ "MaterialMap", [ "OverlayMap" ], "material", BLACK, false ],
  [ "GlowMap", [ "OverlayMap" ], "glow", BLACK, false ],
  [ "NormalMap", [ "NormalMap" ], "normal", FLAT_NORMAL, false ],
  [ "DirtMap", [ "NormalMap" ], "dirt", BLACK, false ],
  [ "Detail1Map", [ "DetailDiffuseMap" ], "detail", NO_DETAIL, true ],
  [ "Detail2Map", [], null, NO_DETAIL, true ],
  [ "Detail3Map", [], null, NO_DETAIL, true ],
  [ "PaintMaskMap", [], null, BLACK, false ]
];

/**
 * How strongly the Incarna detail map's mask shows, Detail1Data's y. Ours: an
 * Incarna material has no such value; 0.8 is what EVE's quad hulls commonly
 * author.
 */
const DETAIL_STRENGTH = 0.8;

/**
 * Describes Incarna interior pieces as SOF data in an EveSOFDataMgr.
 *
 * A piece is a loaded, initialized Tr2InteriorStatic: its areas hold the
 * Tr2Effects their Incarna materials became, and its meshes' geometry is
 * loaded. Each of its detail meshes becomes a hull drawing that mesh alone
 * (`dynamic:/mesh`) with one unpacked quad area per Incarna area: an opaque
 * area draws the detail shader with area type Primary, a transparent one, the
 * glass, draws the glass shader with area type Glass (`AREA_KINDS`). An
 * assembly is a stationary root hull drawing the first piece's first mesh,
 * holding one locator set per piece hull for every other mesh, and a layout
 * placing each piece hull at its set, so it builds as an ordinary station with
 * a layout. Faction and race come from the caller; the faction's materials for
 * each area type colour the areas, chosen per texel by the reflection mask
 * (`material`).
 */
@meta.define("CjsIncarnaEmulator")
export class CjsIncarnaEmulator
{

  /** The EveSOFDataMgr the SOF data goes into; set by the constructor. */
  _dataMgr = null;

  /**
   * @param {object} dataMgr The EveSOFDataMgr whose factory builds the result.
   * @param {object} resourceManager The `CjsBlueResMan` that serves the areas' textures; `dynamic:/incarna` is registered on it.
   */
  constructor(dataMgr, resourceManager)
  {
    this._dataMgr = dataMgr;
    RegisterIncarnaTextures(resourceManager);
  }

  /**
   * Puts an assembly of pieces into the data manager and returns its DNA.
   *
   * The root sits where the first piece does; every other mesh is placed
   * relative to it. Two pieces whose meshes draw the same geometry share one
   * hull; its locator set then holds both placements.
   *
   * @param {string} name The root hull's and the layout's name; no `:` or `;`.
   * @param {Array<{object: object, transform: ArrayLike<number>}>} pieces Each Tr2InteriorStatic and where it sits in the assembly.
   * @param {string} faction An SOF faction the data manager has, such as "caldaribase".
   * @param {string} race An SOF race the data manager has, such as "caldari".
   * @returns {string} The assembly's DNA, `<name>:<faction>:<race>:layout?<name>`.
   * @throws {Error} When a piece's geometry is not loaded, or the generic data lacks a packed quad shader.
   * @throws {TypeError} When the pieces have no mesh.
   */
  @meta.implemented
  AddAssembly(name, pieces, faction, race)
  {
    this._RegisterAreaShaders();
    const meshes = pieces.flatMap(({ object, transform }) => object.detailMeshes.map(mesh => ({ mesh, transform })));
    if (meshes.length === 0) throw new TypeError(`CjsIncarnaEmulator: assembly ${name} has no mesh`);

    const [ first ] = meshes;
    const toRoot = mat4.invert(mat4.create(), first.transform);
    const placements = new Map();
    for (const { mesh, transform } of meshes.slice(1))
    {
      const hullName = CjsIncarnaEmulator.hullName(mesh);
      if (!placements.has(hullName))
      {
        this._dataMgr.UpdateHull(hullName, this.CreateHull(hullName, mesh));
        placements.set(hullName, { sphere: this._dataMgr.GetHullData(hullName).boundingSphere, transforms: [] });
      }
      placements.get(hullName).transforms.push(mat4.multiply(mat4.create(), toRoot, transform));
    }

    const root = this.CreateHull(name, first.mesh);
    root.buildClass = blue.enums.GetEnum("trinity.EveSOFDataHull.BuildClass").BUILDCLASS_STATIONARY;
    root.locatorSets = [ ...placements ].map(([ hullName, { transforms } ]) => CjsIncarnaEmulator.locatorSet(hullName, transforms));
    root.boundingSphere = CjsIncarnaEmulator.assemblySphere([ { sphere: root.boundingSphere, transforms: [ mat4.create() ] }, ...placements.values() ]);
    this._dataMgr.UpdateHull(name, root);

    const layout = blue.classes.CreateInstanceFromName("EveSOFDataLayout");
    layout.name = name;
    layout.placements = [ ...placements.keys() ].map(hullName => CjsIncarnaEmulator.placement(hullName));
    this._dataMgr.UpdateLayout(name, layout);

    return CjsIncarnaEmulator.assemblyDna(name, faction, race);
  }

  /**
   * Lists the unpacked quad shaders among the generic data's area shaders,
   * each with its packed shader's entry: SOF builds an area only when its
   * shader is listed (EveSOF.cpp:786-791), and each pair takes the same
   * parameters and textures.
   *
   * @throws {Error} When the generic data lacks a packed quad shader.
   */
  @meta.implemented
  _RegisterAreaShaders()
  {
    const shaders = this._dataMgr.GetGenericData().areaShaderData;
    for (const { shader, packed } of Object.values(AREA_KINDS))
    {
      if (shaders.has(shader)) continue;
      const entry = shaders.get(packed);
      if (!entry) throw new Error(`CjsIncarnaEmulator: the SOF generic data has no ${packed} to list ${shader} as`);
      shaders.set(shader, entry);
    }
  }

  /**
   * The DNA `AddAssembly` returns for an assembly: its root hull, the faction
   * and race, and its layout.
   *
   * @param {string} name The assembly's name.
   * @param {string} faction The SOF faction.
   * @param {string} race The SOF race.
   * @returns {string} `<name>:<faction>:<race>:layout?<name>`.
   */
  @meta.implemented
  static assemblyDna(name, faction, race)
  {
    return `${name}:${faction}:${race}:layout?${name}`;
  }

  /**
   * The hull one Incarna detail mesh becomes.
   *
   * @param {string} name The hull's name.
   * @param {object} mesh A Tr2Mesh of an initialized piece, its geometry loaded.
   * @returns {object} The EveSOFDataHull.
   * @throws {Error} When the mesh's geometry is not loaded.
   */
  @meta.implemented
  CreateHull(name, mesh)
  {
    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood())
    {
      throw new Error(`CjsIncarnaEmulator: ${mesh.geometryResPath} must be loaded before its hull is made`);
    }

    const hull = blue.classes.CreateInstanceFromName("EveSOFDataHull");
    hull.name = name;
    hull.geometryResFilePath = CjsMeshConstructor.meshPath(mesh.GetMeshIndex(), mesh.geometryResPath);
    // The sphere around the mesh's box: a granny mesh has a box once its
    // bounds are rebuilt, but holds a zero sphere (TriGeometryRes.GetBoundingSphere).
    const min = vec3.create(), max = vec3.create();
    geometry.GetBoundingBox(mesh.GetMeshIndex(), min, max);
    const center = vec3.lerp(vec3.create(), min, max, 0.5);
    hull.boundingSphere = vec4.fromValues(center[0], center[1], center[2], vec3.distance(min, max) / 2);
    hull.opaqueAreas = mesh.opaquePrepassAreas.map(area => CjsIncarnaEmulator.hullArea(area, AREA_KINDS.opaque));
    hull.transparentAreas = mesh.transparentAreas.map(area => CjsIncarnaEmulator.hullArea(area, AREA_KINDS.glass));
    return hull;
  }

  /**
   * The quad area one Incarna area becomes.
   *
   * @param {object} area A Tr2MeshArea holding the Tr2Effect its material became.
   * @param {{shader: string, areaType: string, details: boolean}} kind How the area is drawn, an `AREA_KINDS` entry.
   * @returns {object} The EveSOFDataHullArea.
   */
  @meta.implemented
  static hullArea(area, kind)
  {
    const effect = area.GetMaterialInterface();
    const sources = new Map();
    for (const resource of effect.resources)
    {
      if (resource.resourcePath) sources.set(resource.name, resource.resourcePath);
    }
    const tile = effect.parameters.find(parameter => parameter.name === "DetailDiffuseTile")?.value[0] ?? 1;

    const value = blue.classes.CreateInstanceFromName("EveSOFDataHullArea");
    value.name = area.name;
    value.index = area.index;
    value.count = area.count;
    value.shader = kind.shader;
    value.areaType = blue.enums.GetEnum("trinity.EveSOFDataArea.AreaType")[kind.areaType];
    value.textures = AREA_TEXTURES.filter(([ , , , , detail ]) => kind.details || !detail).map(([ input, maps, role, fill ]) =>
    {
      const source = maps.map(map => sources.get(map)).find(Boolean);
      return CjsIncarnaEmulator.namedValue("EveSOFDataTexture", input, "resFilePath",
        source ? CjsIncarnaTextureConstructor.texturePath(role, source) : fill);
    });
    const detailParameters = [
      [ "Detail1Data", [ tile, DETAIL_STRENGTH, 0, 0 ] ],
      [ "Detail2Data", [ 0, 0, 0, 0 ] ],
      [ "Detail3Data", [ 0, 0, 0, 0 ] ],
      [ "DetailSelector", [ 1, 1, 1, 1 ] ],
      [ "DetailAlbedoColor", [ 0, 0, 0, 0 ] ],
      [ "DetailFresnelColor", [ 0, 0, 0, 0 ] ]
    ];
    value.parameters = [ ...(kind.details ? detailParameters : []), [ "GeneralData", [ 1, 1, 0, 0 ] ] ]
      .map(([ parameter, values ]) => CjsIncarnaEmulator.namedValue("EveSOFDataParameter", parameter, "value", vec4.fromValues(...values)));
    return value;
  }

  /**
   * The hull name a detail mesh's geometry gets: the file's name and the mesh
   * index, so two pieces drawing the same mesh share it.
   *
   * @param {object} mesh A Tr2Mesh.
   * @returns {string} Such as "incarna_walkway_04_cal_1".
   */
  @meta.implemented
  static hullName(mesh)
  {
    const file = String(mesh.geometryResPath).split("/").pop().replace(/\.[^.]*$/u, "").toLowerCase();
    return `incarna_${file}_${mesh.GetMeshIndex()}`;
  }

  /**
   * A locator set holding one locator per placement of a piece hull. A
   * locator is an EveSOFDataTransform, so each transform is decomposed as
   * Carbon's layout code decomposes one (`mat4.decomposeCarbon`).
   *
   * @param {string} name The set's name, the piece hull's.
   * @param {Array<ArrayLike<number>>} transforms Where each placement sits in the assembly.
   * @returns {object} The EveSOFDataHullLocatorSet.
   */
  @meta.implemented
  static locatorSet(name, transforms)
  {
    const set = blue.classes.CreateInstanceFromName("EveSOFDataHullLocatorSet");
    set.name = name;
    set.locators = transforms.map(transform =>
    {
      const locator = blue.classes.CreateInstanceFromName("EveSOFDataTransform");
      mat4.decomposeCarbon(transform, locator.rotation, locator.position, locator.scaling);
      return locator;
    });
    return set;
  }

  /**
   * The layout placement putting a piece hull at every locator of its set.
   * Not instanced: each placement is an EveChildMesh with its own areas.
   *
   * @param {string} hullName The piece hull, whose locator set has the same name.
   * @returns {object} The EveSOFDataHullExtensionPlacement.
   */
  @meta.implemented
  static placement(hullName)
  {
    const placement = blue.classes.CreateInstanceFromName("EveSOFDataHullExtensionPlacement");
    placement.name = hullName;
    placement.locatorSetName = hullName;
    placement.isInstanced = false;
    placement.descriptor.hull = hullName;
    return placement;
  }

  /**
   * A sphere around every placed piece: the box around each placement's
   * transformed sphere, then the sphere around that box.
   *
   * @param {Array<{sphere: ArrayLike<number>, transforms: Array<ArrayLike<number>>}>} hulls Each piece hull's sphere and placements.
   * @returns {Float32Array} The sphere, centre then radius.
   */
  @meta.implemented
  static assemblySphere(hulls)
  {
    const min = vec3.fromValues(Infinity, Infinity, Infinity);
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    const center = vec3.create();
    for (const { sphere, transforms } of hulls)
    {
      for (const transform of transforms)
      {
        vec3.transformMat4(center, vec3.fromValues(sphere[0], sphere[1], sphere[2]), transform);
        vec3.min(min, min, vec3.subtract(vec3.create(), center, [ sphere[3], sphere[3], sphere[3] ]));
        vec3.max(max, max, vec3.add(vec3.create(), center, [ sphere[3], sphere[3], sphere[3] ]));
      }
    }
    vec3.lerp(center, min, max, 0.5);
    return vec4.fromValues(center[0], center[1], center[2], vec3.distance(min, max) / 2);
  }

  /**
   * A named SOF value: an EveSOFDataTexture or EveSOFDataParameter.
   *
   * @param {string} className The registered class.
   * @param {string} name The value's name.
   * @param {string} field The field holding the value.
   * @param {*} value The value.
   * @returns {object} The instance.
   */
  @meta.implemented
  static namedValue(className, name, field, value)
  {
    const instance = blue.classes.CreateInstanceFromName(className);
    instance.name = name;
    instance[field] = value;
    return instance;
  }

}

export default CjsIncarnaEmulator;
