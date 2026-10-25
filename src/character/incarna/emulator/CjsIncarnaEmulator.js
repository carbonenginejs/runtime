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

/** The shader every emulated area draws, as an SOF hull names it. */
const AREA_SHADER = "quad/quaddetailv5.fx";

/** A quad input with no Incarna source: black, a flat normal, or a detail without a mask. */
const BLACK = "dynamic:/color/0,0,0,1";
const FLAT_NORMAL = "dynamic:/color/0.5,0.5,0,1";
const NO_DETAIL = "dynamic:/color/0.5,0.5,0.5,0";

/**
 * Each quad input of an emulated area: the Incarna maps it may be made from,
 * the first one the area sets winning, the `dynamic:/incarna` role that maps
 * it, and the constant used when the area sets none of them.
 */
const AREA_TEXTURES = [
  [ "AlbedoMap", [ "OverlayMap", "DiffuseMap" ], "albedo", BLACK ],
  [ "RoughnessMap", [ "OverlayMap" ], "roughness", BLACK ],
  [ "MaterialMap", [ "OverlayMap" ], "material", BLACK ],
  [ "GlowMap", [ "OverlayMap" ], "glow", BLACK ],
  [ "NormalMap", [ "NormalMap" ], "normal", FLAT_NORMAL ],
  [ "DirtMap", [ "NormalMap" ], "dirt", BLACK ],
  [ "Detail1Map", [ "DetailDiffuseMap" ], "detail", NO_DETAIL ],
  [ "Detail2Map", [], null, NO_DETAIL ],
  [ "Detail3Map", [], null, NO_DETAIL ],
  [ "PaintMaskMap", [], null, BLACK ]
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
 * (`dynamic:/mesh`) with one quad area per Incarna area, opaque and
 * transparent alike, all of area type Primary. An assembly is an
 * extension-class root hull, which has no geometry of its own, holding one
 * locator set per piece hull, and a layout placing each piece hull at its set.
 * Faction and race come from the caller; the faction's Primary materials
 * colour every area, chosen per texel by the reflection mask (`material`).
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
   * Two pieces whose meshes draw the same geometry share one hull; its locator
   * set then holds both placements.
   *
   * @param {string} name The root hull's and the layout's name; no `:` or `;`.
   * @param {Array<{object: object, transform: ArrayLike<number>}>} pieces Each Tr2InteriorStatic and where it sits in the assembly.
   * @param {string} faction An SOF faction the data manager has, such as "caldaribase".
   * @param {string} race An SOF race the data manager has, such as "caldari".
   * @returns {string} The assembly's DNA, `<name>:<faction>:<race>:layout?<name>`.
   * @throws {Error} When a piece's geometry is not loaded.
   */
  @meta.implemented
  AddAssembly(name, pieces, faction, race)
  {
    const placements = new Map();
    for (const { object, transform } of pieces)
    {
      for (const mesh of object.detailMeshes)
      {
        const hullName = CjsIncarnaEmulator.hullName(mesh);
        if (!placements.has(hullName))
        {
          this._dataMgr.UpdateHull(hullName, this.CreateHull(hullName, mesh));
          placements.set(hullName, { sphere: this._dataMgr.GetHullData(hullName).boundingSphere, transforms: [] });
        }
        placements.get(hullName).transforms.push(transform);
      }
    }

    const root = blue.classes.CreateInstanceFromName("EveSOFDataHull");
    root.name = name;
    root.buildClass = blue.enums.GetEnum("trinity.EveSOFDataHull.BuildClass").BUILDCLASS_EXTENSION;
    root.locatorSets = [ ...placements ].map(([ hullName, { transforms } ]) => CjsIncarnaEmulator.locatorSet(hullName, transforms));
    root.boundingSphere = CjsIncarnaEmulator.assemblySphere([ ...placements.values() ]);
    this._dataMgr.UpdateHull(name, root);

    const layout = blue.classes.CreateInstanceFromName("EveSOFDataLayout");
    layout.name = name;
    layout.placements = [ ...placements.keys() ].map(hullName => CjsIncarnaEmulator.placement(hullName));
    this._dataMgr.UpdateLayout(name, layout);

    return CjsIncarnaEmulator.assemblyDna(name, faction, race);
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
    hull.opaqueAreas = [ ...mesh.opaquePrepassAreas, ...mesh.transparentAreas ].map(area => CjsIncarnaEmulator.hullArea(area));
    return hull;
  }

  /**
   * The quad area one Incarna area becomes.
   *
   * @param {object} area A Tr2MeshArea holding the Tr2Effect its material became.
   * @returns {object} The EveSOFDataHullArea.
   */
  @meta.implemented
  static hullArea(area)
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
    value.shader = AREA_SHADER;
    value.areaType = blue.enums.GetEnum("trinity.EveSOFDataArea.AreaType").TYPE_PRIMARY;
    value.textures = AREA_TEXTURES.map(([ input, maps, role, fill ]) =>
    {
      const source = maps.map(map => sources.get(map)).find(Boolean);
      return CjsIncarnaEmulator.namedValue("EveSOFDataTexture", input, "resFilePath",
        source ? CjsIncarnaTextureConstructor.texturePath(role, source) : fill);
    });
    value.parameters = [
      [ "Detail1Data", [ tile, DETAIL_STRENGTH, 0, 0 ] ],
      [ "Detail2Data", [ 0, 0, 0, 0 ] ],
      [ "Detail3Data", [ 0, 0, 0, 0 ] ],
      [ "DetailSelector", [ 1, 1, 1, 1 ] ],
      [ "DetailAlbedoColor", [ 0, 0, 0, 0 ] ],
      [ "DetailFresnelColor", [ 0, 0, 0, 0 ] ],
      [ "GeneralData", [ 1, 1, 0, 0 ] ]
    ].map(([ parameter, values ]) => CjsIncarnaEmulator.namedValue("EveSOFDataParameter", parameter, "value", vec4.fromValues(...values)));
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
