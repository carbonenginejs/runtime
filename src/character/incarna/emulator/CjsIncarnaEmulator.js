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
import { mat3 } from "#math/mat3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsMeshConstructor } from "../../../trinity/resources/geometry/CjsMeshConstructor.js";
import { CjsIncarnaTextureConstructor, RegisterIncarnaTextures } from "../texture/CjsIncarnaTextureConstructor.js";

/** A quad input with no Incarna source: black, a flat normal, or a detail without a mask. */
const BLACK = "dynamic:/color/0,0,0,1";
const FLAT_NORMAL = "dynamic:/color/0.5,0.5,0,1";
const NO_DETAIL = "dynamic:/color/0.5,0.5,0.5,0";

/**
 * The glass's transparency. The quad glass shader takes its alpha from the
 * paint mask, 1 - `PaintMaskMap.r` (`quad/unpacked_quadglassv5.sm_depth`,
 * pass 0 pixel); a black mask draws it opaque. Incarna's transparent shader
 * takes its opacity from the overlay map's alpha, raised toward 1 at grazing
 * angles (`IncarnaDetailedTransparent` row 0). Under the Caldari walkway's
 * glass that alpha is 0.36 to 0.56 with a mean of 0.38, and a pack channel
 * cannot be inverted (`Tr2TexturePipelineStepPack.h:18-20`: path, channel,
 * fill), so the glass takes the mean: alpha 0.38.
 */
const GLASS_PAINT_MASK = "dynamic:/color/0.62,0,0,1";

/**
 * How each kind of emulated area is drawn: its shader as an SOF hull names
 * it, the packed shader whose generic entry it takes, its SOF area type,
 * whether the shader takes the detail maps, and the constants it takes in
 * place of `AREA_TEXTURES`' own. The unpacked shaders, because Incarna meshes
 * carry classic tangent and binormal vectors and the plain quad shaders read
 * EVE hulls' angle-packed tangent frames; EVE's generic data lists only the
 * packed ones, which its hulls use.
 */
const AREA_KINDS = {
  opaque: { shader: "quad/unpacked_quaddetailv5.fx", packed: "quad/quaddetailv5.fx", areaType: "TYPE_PRIMARY", details: true, fills: {} },
  glass: { shader: "quad/unpacked_quadglassv5.fx", packed: "quad/quadglassv5.fx", areaType: "TYPE_GLASS", details: false, fills: { PaintMaskMap: GLASS_PAINT_MASK } }
};

/**
 * Each quad input of an emulated area: the Incarna maps it may be made from,
 * the first one the area sets winning, the `dynamic:/incarna` role that maps
 * it, the constant used when the area sets none of them, and whether it is a
 * detail map, which the glass shader does not take. The glow mask is used only
 * by an area that glows (`glows`).
 *
 * The dirt map is black: quad replaces the material colour with the dust
 * colour by the dirt amount, keeping (1 - dirt)^3 of it
 * (`quad/unpacked_quaddetailv5.sm_depth`, pass 0 pixel), and the `_nm`
 * grime channel (`dynamic:/incarna/dirt`) averages 0.72 under the Caldari
 * walkway, so a hull with one material in every slot still drew mostly dust
 * (operator, 2026-10-26: one material in all four slots must make the hull one
 * colour). Incarna's own row 0 draws no grime.
 */
const AREA_TEXTURES = [
  [ "AlbedoMap", [ "OverlayMap", "DiffuseMap" ], "albedo", BLACK, false ],
  [ "RoughnessMap", [ "OverlayMap" ], "roughness", BLACK, false ],
  [ "MaterialMap", [ "OverlayMap" ], "material", BLACK, false ],
  [ "GlowMap", [ "OverlayMap" ], "glow", BLACK, false ],
  [ "NormalMap", [ "NormalMap" ], "normal", FLAT_NORMAL, false ],
  [ "DirtMap", [], null, BLACK, false ],
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
 * The most texels one triangle's glow is read at (`gatherGlow`): a triangle
 * whose map coordinates cover more, as a tiled one can, is read on a coarser
 * grid.
 */
const MAX_TRIANGLE_TEXELS = 1 << 18;

/** The least glowing surface, in square metres, a glow light is put in front of. */
const MIN_GLOW_AREA = 1e-4;

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
   * hull; its locator set then holds both placements. The lights, in the
   * root's space, become the root hull's one light set, named as the assembly.
   *
   * @param {string} name The root hull's and the layout's name; no `:` or `;`.
   * @param {Array<{object: object, transform: ArrayLike<number>}>} pieces Each Tr2InteriorStatic and where it sits in the assembly.
   * @param {string} faction An SOF faction the data manager has, such as "caldaribase".
   * @param {string} race An SOF race the data manager has, such as "caldari".
   * @param {Array<{position: ArrayLike<number>, radius: number, innerRadius: number, brightness: number, lightColor: number}>} [lights] Point lights, each coloured by a faction colour (`lightColor`, a `SOFDataFactionColorChooser::ColorType`).
   * @returns {string} The assembly's DNA, `<name>:<faction>:<race>:layout?<name>`.
   * @throws {Error} When a piece's geometry is not loaded, or the generic data lacks a packed quad shader.
   * @throws {TypeError} When the pieces have no mesh.
   */
  @meta.implemented
  AddAssembly(name, pieces, faction, race, lights = [])
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
    root.lightSets = lights.length === 0 ? [] : [ CjsIncarnaEmulator.lightSet(name, lights) ];
    this._dataMgr.UpdateHull(name, root);

    const layout = blue.classes.CreateInstanceFromName("EveSOFDataLayout");
    layout.name = name;
    layout.placements = [ ...placements.keys() ].map(hullName => CjsIncarnaEmulator.placement(hullName));
    this._dataMgr.UpdateLayout(name, layout);

    return CjsIncarnaEmulator.assemblyDna(name, faction, race);
  }

  /**
   * Where an assembly's lights go: one place in front of each glowing patch of
   * its areas, in the root's space, as `AddAssembly` takes them. An Incarna
   * interior's lights are objects of its scene, not of its pieces, so the
   * glow is what shows where they were (operator, 2026-10-26).
   *
   * Every texel of a glowing area's mask (`glows`; `dynamic:/incarna/glow`,
   * its overlay map's alpha) at or above `threshold` is found through the
   * triangles that map it (`gatherGlow`). Touching glowing cells form a
   * patch, and a patch longer than `spacing` is cut along its longest side,
   * so a strip takes a row of lights (`glowPositions`).
   *
   * With `mirror`, only glow on that axis's positive side is read, and each
   * place found is mirrored across the axis's zero plane, except a place
   * within one cell of the plane, which is put on it once.
   *
   * @param {object} resourceManager The `CjsBlueResMan` that serves the areas' textures, as the constructor takes it; `dynamic:/incarna` is registered on it.
   * @param {Array<{object: object, transform: ArrayLike<number>}>} pieces As `AddAssembly` takes them, their geometry loaded.
   * @param {object} [options]
   * @param {number} [options.threshold=0.25] The glow, 0 to 1, a texel needs to count.
   * @param {number} [options.cell=0.25] The size, in metres, of the cubes glowing texels are gathered in.
   * @param {number} [options.spacing=0.8] The longest stretch of glow, in metres, one place stands for.
   * @param {number} [options.distance=0.1] How far in front of its glow a place sits, in metres.
   * @param {number|null} [options.mirror=null] The axis, 0 to 2, whose positive side is read and mirrored; null reads every side.
   * @returns {Promise<Float32Array[]>} The places.
   */
  @meta.implemented
  static async findGlowLightPositions(resourceManager, pieces, { threshold = 0.25, cell = 0.25, spacing = 0.8, distance = 0.1, mirror = null } = {})
  {
    RegisterIncarnaTextures(resourceManager);
    const meshes = pieces.flatMap(({ object, transform }) => object.detailMeshes.map(mesh => ({ mesh, transform })));
    if (meshes.length === 0) return [];

    const toRoot = mat4.invert(mat4.create(), meshes[0].transform);
    const glowing = [];
    for (const { mesh, transform } of meshes)
    {
      for (const area of [ ...mesh.opaquePrepassAreas, ...mesh.transparentAreas ])
      {
        const source = CjsIncarnaEmulator.areaSources(area).get("OverlayMap");
        if (source && CjsIncarnaEmulator.glows(area)) glowing.push({ mesh, transform, area, source });
      }
    }
    const sources = [ ...new Set(glowing.map(({ source }) => source)) ];
    const masks = new Map(await Promise.all(sources.map(async source => [ source, await CjsIncarnaEmulator.glowMask(resourceManager, source) ])));

    const cells = new Map();
    for (const { mesh, transform, area, source } of glowing)
    {
      const mask = masks.get(source);
      if (!mask || mask.max < threshold * 255) continue;
      const toAssembly = mat4.multiply(mat4.create(), toRoot, transform);
      CjsIncarnaEmulator.gatherGlow(cells, mesh.GetGeometryResource().GetMeshData(mesh.GetMeshIndex()), area, mask, toAssembly, { threshold, cell, mirror });
    }
    return CjsIncarnaEmulator.glowPositions(cells, { cell, spacing, distance, mirror });
  }

  /**
   * One overlay map's glow mask, as the areas draw it.
   *
   * @param {object} resourceManager The `CjsBlueResMan` serving `dynamic:/incarna`.
   * @param {string} source The overlay map's resource path.
   * @returns {Promise<{data: Uint8Array, width: number, height: number, max: number}|null>} The mask's top level and its brightest texel; null when it did not load.
   */
  @meta.implemented
  static async glowMask(resourceManager, source)
  {
    const texture = resourceManager.GetResource(CjsIncarnaTextureConstructor.texturePath("glow", source));
    try
    {
      await texture.Ready();
    }
    catch
    {
      // A mask that fails to load draws black, so it shows no glow.
      return null;
    }
    const bitmap = texture.GetBitmap();
    if (!bitmap) return null;
    const data = bitmap.GetMipRawData(0);
    let max = 0;
    for (let index = 0; index < data.length; index++) if (data[index] > max) max = data[index];
    return { data, width: bitmap.GetWidth(), height: bitmap.GetHeight(), max };
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
   * @param {{shader: string, areaType: string, details: boolean, fills: Object<string, string>}} kind How the area is drawn, an `AREA_KINDS` entry.
   * @returns {object} The EveSOFDataHullArea.
   */
  @meta.implemented
  static hullArea(area, kind)
  {
    const effect = area.GetMaterialInterface();
    const sources = CjsIncarnaEmulator.areaSources(area);
    const glows = CjsIncarnaEmulator.glows(area);
    const tile = effect.parameters.find(parameter => parameter.name === "DetailDiffuseTile")?.value[0] ?? 1;

    const value = blue.classes.CreateInstanceFromName("EveSOFDataHullArea");
    value.name = area.name;
    value.index = area.index;
    value.count = area.count;
    value.shader = kind.shader;
    value.areaType = blue.enums.GetEnum("trinity.EveSOFDataArea.AreaType")[kind.areaType];
    value.textures = AREA_TEXTURES.filter(([ , , , , detail ]) => kind.details || !detail).map(([ input, maps, role, fill ]) =>
    {
      const source = role === "glow" && !glows ? null : maps.map(map => sources.get(map)).find(Boolean);
      return CjsIncarnaEmulator.namedValue("EveSOFDataTexture", input, "resFilePath",
        source ? CjsIncarnaTextureConstructor.texturePath(role, source) : kind.fills[input] ?? fill);
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
   * Whether an area's glow mask shows: its material has a glow colour that is
   * not black. Incarna's transparent materials (IncarnaDetailedTransparent,
   * IncarnaSimpleTransparent) have none, so their overlay map's alpha is not
   * glow, and an opaque material can set black to hide the mask it shares.
   *
   * @param {object} area A Tr2MeshArea holding the Tr2Effect its material became.
   * @returns {boolean} True when the area glows.
   */
  @meta.implemented
  static glows(area)
  {
    const color = area.GetMaterialInterface().parameters.find(parameter => parameter.name === "MaterialGlowColor");
    return !!color && (color.value[0] > 0 || color.value[1] > 0 || color.value[2] > 0);
  }

  /**
   * The Incarna maps an area's material sets, by parameter name.
   *
   * @param {object} area A Tr2MeshArea holding the Tr2Effect its material became.
   * @returns {Map<string, string>} Resource paths, such as "OverlayMap" to the `_os` map's.
   */
  @meta.implemented
  static areaSources(area)
  {
    const sources = new Map();
    for (const resource of area.GetMaterialInterface().resources)
    {
      if (resource.resourcePath) sources.set(resource.name, resource.resourcePath);
    }
    return sources;
  }

  /**
   * Adds where one area glows to the gathering cells. Each triangle is walked
   * over the texels its map coordinates cover, wrapping as a sampler does; a
   * texel at or above the threshold adds its place on the triangle, weighted
   * by its glow times the surface it covers, with the mesh normal there. A
   * triangle covering no texel centre is read once at its middle.
   *
   * @param {Map<string, {weight: number, sum: Float32Array, normal: Float32Array}>} cells The cells, by `x,y,z` cell coordinates: each one's glow, glow-weighted place sum and glow-weighted normal sum.
   * @param {object} data The mesh's CPU record (`TriGeometryRes.GetMeshData`).
   * @param {object} area A Tr2MeshArea, whose index groups are read.
   * @param {{data: Uint8Array, width: number, height: number}} mask The area's glow mask.
   * @param {ArrayLike<number>} transform The mesh's place in the assembly's root.
   * @param {{threshold: number, cell: number, mirror: number|null}} options As `findGlowLightPositions` takes them.
   */
  @meta.implemented
  static gatherGlow(cells, data, area, mask, transform, { threshold, cell, mirror })
  {
    const { position, normal, texcoord0 } = data.vertex;
    if (!position || !texcoord0) return;
    const normalMatrix = mat3.normalFromMat4(mat3.create(), transform);
    const { width, height } = mask;
    const least = threshold * 255;
    const points = [ vec3.create(), vec3.create(), vec3.create() ];
    const normals = [ vec3.create(), vec3.create(), vec3.create() ];
    const uv = new Float64Array(6), weights = new Float64Array(3);
    const at = vec3.create(), facing = vec3.create(), edge1 = vec3.create(), edge2 = vec3.create();

    const add = value =>
    {
      for (let axis = 0; axis < 3; axis++)
      {
        at[axis] = points[0][axis] * weights[0] + points[1][axis] * weights[1] + points[2][axis] * weights[2];
        facing[axis] = normals[0][axis] * weights[0] + normals[1][axis] * weights[1] + normals[2][axis] * weights[2];
      }
      if (mirror !== null && at[mirror] < 0) return;
      const key = `${Math.floor(at[0] / cell)},${Math.floor(at[1] / cell)},${Math.floor(at[2] / cell)}`;
      let entry = cells.get(key);
      if (!entry)
      {
        entry = { weight: 0, sum: vec3.create(), normal: vec3.create() };
        cells.set(key, entry);
      }
      entry.weight += value;
      vec3.scaleAndAdd(entry.sum, entry.sum, at, value);
      vec3.scaleAndAdd(entry.normal, entry.normal, facing, value);
    };
    const texel = (x, y) => mask.data[(((Math.floor(y) % height) + height) % height) * width + (((Math.floor(x) % width) + width) % width)];

    for (let group = area.index; group < area.index + area.count; group++)
    {
      const { faces } = data.indices[group];
      for (let face = 0; face + 2 < faces.length; face += 3)
      {
        for (let corner = 0; corner < 3; corner++)
        {
          const vertex = faces[face + corner];
          vec3.transformMat4(points[corner], vec3.set(points[corner], position[vertex * 3], position[vertex * 3 + 1], position[vertex * 3 + 2]), transform);
          if (normal) vec3.transformMat3(normals[corner], vec3.set(normals[corner], normal[vertex * 3], normal[vertex * 3 + 1], normal[vertex * 3 + 2]), normalMatrix);
          uv[corner * 2] = texcoord0[vertex * 2] * width;
          uv[corner * 2 + 1] = texcoord0[vertex * 2 + 1] * height;
        }
        const surface = vec3.length(vec3.cross(facing, vec3.subtract(edge1, points[1], points[0]), vec3.subtract(edge2, points[2], points[0]))) / 2;
        if (surface === 0) continue;
        if (!normal)
        {
          vec3.normalize(facing, facing);
          for (const corner of normals) vec3.copy(corner, facing);
        }

        const [ ax, ay, bx, by, cx, cy ] = uv;
        const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        const texels = Math.abs(denominator) / 2;
        const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx);
        const minY = Math.min(ay, by, cy), maxY = Math.max(ay, by, cy);
        const step = Math.max(1, Math.sqrt((maxX - minX) * (maxY - minY) / MAX_TRIANGLE_TEXELS));
        let read = 0;
        if (texels > 0)
        {
          for (let y = Math.floor(minY / step) * step + step / 2; y < maxY; y += step)
          {
            for (let x = Math.floor(minX / step) * step + step / 2; x < maxX; x += step)
            {
              weights[0] = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denominator;
              weights[1] = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denominator;
              weights[2] = 1 - weights[0] - weights[1];
              if (weights[0] < 0 || weights[1] < 0 || weights[2] < 0) continue;
              read++;
              const value = texel(x, y);
              if (value >= least) add(value / 255 * surface / texels * step * step);
            }
          }
        }
        if (read === 0)
        {
          weights.fill(1 / 3);
          const value = texel((ax + bx + cx) / 3, (ay + by + cy) / 3);
          if (value >= least) add(value / 255 * surface);
        }
      }
    }
  }

  /**
   * The light places for the gathered glow. Cells touching on a face, edge or
   * corner form one patch; a patch is cut across its longest side into
   * stretches no longer than `spacing`, and each stretch glowing over at least
   * `MIN_GLOW_AREA` gives one place: its glow-weighted centre, `distance`
   * along its mean normal, or on the surface where the normals cancel, as a
   * pane's two sides do.
   *
   * @param {Map<string, {weight: number, sum: Float32Array, normal: Float32Array}>} cells From `gatherGlow`, by `x,y,z` cell coordinates.
   * @param {{cell: number, spacing: number, distance: number, mirror: number|null}} options As `findGlowLightPositions` takes them.
   * @returns {Float32Array[]} The places.
   */
  @meta.implemented
  static glowPositions(cells, { cell, spacing, distance, mirror })
  {
    const parents = new Map([ ...cells.keys() ].map(key => [ key, key ]));
    const root = key =>
    {
      while (parents.get(key) !== key)
      {
        parents.set(key, parents.get(parents.get(key)));
        key = parents.get(key);
      }
      return key;
    };
    for (const key of cells.keys())
    {
      const [ x, y, z ] = key.split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
      {
        const other = `${x + dx},${y + dy},${z + dz}`;
        if (cells.has(other)) parents.set(root(key), root(other));
      }
    }
    const patches = new Map();
    for (const [ key, entry ] of cells)
    {
      const patch = root(key);
      if (!patches.has(patch)) patches.set(patch, []);
      patches.get(patch).push(entry);
    }

    const positions = [];
    for (const entries of patches.values())
    {
      const centres = entries.map(entry => vec3.scale(vec3.create(), entry.sum, 1 / entry.weight));
      const min = vec3.fromValues(Infinity, Infinity, Infinity), max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
      for (const centre of centres)
      {
        vec3.min(min, min, centre);
        vec3.max(max, max, centre);
      }
      const extent = vec3.subtract(vec3.create(), max, min);
      const axis = extent[0] >= extent[1] && extent[0] >= extent[2] ? 0 : extent[1] >= extent[2] ? 1 : 2;
      const count = Math.max(1, Math.ceil((extent[axis] + cell) / spacing));
      const stretches = Array.from({ length: count }, () => ({ weight: 0, sum: vec3.create(), normal: vec3.create() }));
      entries.forEach((entry, index) =>
      {
        const stretch = stretches[Math.min(count - 1, Math.floor((centres[index][axis] - min[axis]) / (extent[axis] + cell) * count))];
        stretch.weight += entry.weight;
        vec3.add(stretch.sum, stretch.sum, entry.sum);
        vec3.add(stretch.normal, stretch.normal, entry.normal);
      });

      for (const { weight, sum, normal } of stretches)
      {
        if (weight < MIN_GLOW_AREA) continue;
        const place = vec3.scale(vec3.create(), sum, 1 / weight);
        if (vec3.length(normal) > weight / 2) vec3.scaleAndAdd(place, place, vec3.normalize(normal, normal), distance);
        if (mirror !== null && Math.abs(place[mirror]) < cell)
        {
          place[mirror] = 0;
        }
        else if (mirror !== null)
        {
          const mirrored = vec3.clone(place);
          mirrored[mirror] = -mirrored[mirror];
          positions.push(mirrored);
        }
        positions.push(place);
      }
    }
    return positions;
  }

  /**
   * A light set of point lights (`EveSOFDataHullLightSetItem`, whose type is
   * POINT_LIGHT), named in order.
   *
   * @param {string} name The set's name.
   * @param {Array<{position: ArrayLike<number>, radius: number, innerRadius: number, brightness: number, lightColor: number}>} lights The lights, in the hull's space.
   * @returns {object} The EveSOFDataHullLightSet.
   */
  @meta.implemented
  static lightSet(name, lights)
  {
    const set = blue.classes.CreateInstanceFromName("EveSOFDataHullLightSet");
    set.name = name;
    set.items = lights.map((light, index) =>
    {
      const item = blue.classes.CreateInstanceFromName("EveSOFDataHullLightSetItem");
      item.name = `${name}_${index}`;
      vec3.copy(item.position, light.position);
      item.radius = light.radius;
      item.innerRadius = light.innerRadius;
      item.brightness = light.brightness;
      item.lightColor = light.lightColor;
      return item;
    });
    return set;
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
