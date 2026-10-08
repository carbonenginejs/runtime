import { CjsSchema, meta } from "#schema";
import { getRegisteredClassName } from "../global/compose/className.js";
import { normalizeCarbonValue } from "../global/schema/types/index.js";
import { IRootReaderBase } from "../global/blue/IRootReaderBase.js";
import { EveSOF } from "./EveSOF.js";
import { EveSOFDNA } from "./EveSOFDNA.js";
import { TriBatchType } from "#consts/graphics";
import { EveSOFDataHull } from "./hull/EveSOFDataHull.js";
import { EveSOFDataHullDecalSetItem } from "./hull/EveSOFDataHullDecalSetItem.js";
import { BeObjectMetadata } from "#blue";
import { addChild, removeChild } from "../global/blue/children.js";
import { SofValuesBuilder } from "./SofValuesBuilder.js";

/**
 * Updates mesh materials and inserts directly from prepared SOF selections.
 * Ordinary pattern changes calculate only masks and affected mesh bindings.
 * Complex layouts and shared depth bindings retain full-values comparison.
 * Live objects and unrelated state are retained; incompatible targets rebuild.
 */
@meta.define({ className: "CjsSOFUpdater", family: "sof" })
export class CjsSOFUpdater
{
  /** The caller's factory, including its catalog, resource resolvers and options. */
  _sof;

  /** Latest request per live root; pending work must not keep retired roots indexed. */
  _updates = new WeakMap();

  /**
   * Borrows the factory used to build the live objects.
   * @param {EveSOF} sof Standard factory with the same build configuration.
   */
  constructor(sof)
  {
    if (!CjsSchema.cast(sof, EveSOF)) throw new TypeError("CjsSOFUpdater requires an EveSOF factory.");
    this._sof = sof;
  }

  /**
   * Applies a supported DNA edit after validating its affected targets.
   * No list is passed to the values service. Notifications are left to that
   * service, once per changed member. Build errors reject without applying edits.
   * Superseded requests return false. Application errors propagate; arbitrary
   * consumer notification side effects cannot be rolled back transactionally.
   * @param {object} object A live, schema-registered SOF root with its original DNA.
   * @param {string} newDna Requested DNA.
   * @param {object} [options] The original build options, including layout seed/time.
   * @param {Function} [isCurrent] Host selection/lifetime guard, checked before writes.
   * @returns {Promise<Array<object>|false|null>} Changed values per object, false
   * for no changes or superseded work, null when the caller must rebuild.
   */
  @meta.ours
  async UpdateFromDNA(object, newDna, options = {}, isCurrent = () => true)
  {
    if (!isCurrent()) return false;
    if (!object || typeof object.dna !== "string" || typeof newDna !== "string") return null;
    const request = {};
    this._updates.set(object, request);
    const originalDna = object.dna;
    const oldSelection = await this._sof.CreateDna(originalDna, options);
    const newSelection = await this._sof.CreateDna(newDna, options);
    if (!isCurrent() || this._updates.get(object) !== request || object.dna !== originalDna) return false;
    if (!this._CompatibleDNA(oldSelection, newSelection)) return null;

    const patterns = this._CanUpdatePatterns(object, oldSelection, newSelection);
    if (patterns || this._CanUpdateMesh(oldSelection, newSelection))
      return this._UpdateMesh(object, oldSelection, newSelection, options,
        () => isCurrent() && this._updates.get(object) === request && object.dna === originalDna, patterns);

    const values = await this._sof.BuildValuesFromDNA(newDna, options);
    if (!isCurrent() || this._updates.get(object) !== request || object.dna !== originalDna) return false;
    if (!values) return null;
    const anchors = new Map();
    if (!this._IndexValues(values, anchors, new WeakSet())) return null;
    let changes = [];
    const visited = new WeakMap();
    const owners = new WeakMap();
    const patternTargets = this._PatternTargets(object, oldSelection, newSelection);
    if (!this._CollectChanges(object, values, anchors, visited, owners, changes, false, patternTargets)) return null;

    // SOF creates banner ImageMap slots empty and exposes them through external
    // parameters. Their paths belong to the host; do not clear and reload them.
    const externalTextures = new Set((object.externalParameters ?? [])
      .filter(parameter => getRegisteredClassName(parameter.constructor) === "Tr2ExternalParameter"
        && parameter.destinationAttribute === "resourcePath")
      .map(parameter => parameter.destinationObject));
    changes = changes.filter(change => change.type !== "TriTextureParameter" || !externalTextures.has(change.object));
    for (const change of changes)
    {
      if (change.values.textures && change.object.resources.some(texture => externalTextures.has(texture)
        && Object.hasOwn(change.values.textures, texture.name))) return null;
    }

    // Masks have no resource lifecycle. Hydrate only new slots, after the entire
    // graph passes preflight and before mutating any existing object.
    for (const change of changes)
      if (change.masks) change.masks.added = change.masks.added.map(value => CjsSchema.from("EveCustomMask", value));

    // Children are visited before their owner; publish the root DNA last.
    for (const change of changes) this._ApplyChange(change);
    return changes.length ? changes.map(change => ({ _type: change.type, ...change.values })) : false;
  }

  /**
   * Restricts list edits to ordinary root masks and root mesh pattern bindings.
   * Layouts and instanced attachments retain strict topology matching.
   * @param {object} object Live root.
   * @param {EveSOFDNA} before Previous selection resolved against current data.
   * @param {EveSOFDNA} after Requested selection.
   * @returns {object|null} Eligible owners and pattern texture names.
   */
  @meta.ours
  _PatternTargets(object, before, after)
  {
    if (JSON.stringify(before.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN))
      === JSON.stringify(after.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN))
      || before.GetLayoutCount() || after.GetLayoutCount()
      || before.GetHullInstancedMeshes().length || after.GetHullInstancedMeshes().length
      || after.GetBuildClass() === EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION) return null;
    const textures = new Set(), samplers = new Set(), effects = new Set();
    for (const dna of [before, after])
    {
      const application = dna.GetPatternApplicationData();
      for (let index = 0; index < dna.GetPatternLayerCount(); index++)
      {
        const layer = dna.GetPatternLayerData(application, index);
        if (typeof layer?.textureName === "string")
        {
          textures.add(layer.textureName);
          samplers.add(`${layer.textureName}Sampler`);
        }
      }
    }
    for (const category of ["opaqueAreas", "transparentAreas", "additiveAreas", "distortionAreas", "depthAreas"])
      for (const area of object.mesh?.[category] ?? []) if (area.effect) effects.add(area.effect);
    return { root: object, effects, textures, samplers };
  }

  /**
   * Limits direct mesh matching to ordinary hulls with unchanged projections.
   * Layout/shared and authored instanced meshes need separate source bindings;
   * keep the established values comparison for those graphs until then.
   * @param {EveSOFDNA} before Previous selection.
   * @param {EveSOFDNA} after Current selection.
   * @returns {boolean} Whether only root mesh and decal targets are needed.
   */
  @meta.ours
  _CanUpdateMesh(before, after)
  {
    // An absent command inherits the default pattern; an explicit empty name
    // disables it. Those selections can have different masks/resources.
    const pattern = dna => dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN)?.[0] ?? null;
    return pattern(before) === pattern(after)
      && !after.GetLayoutCount() && !before.GetLayoutCount()
      && !after.GetHullInstancedMeshes().length && !before.GetHullInstancedMeshes().length
      && after.GetBuildClass() !== EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  }

  /**
   * Selects the direct projection path without shared generated-depth resources.
   * Combined insert edits share resolved hull paths with the binding planner.
   * This does not alter the material-only path's query footprint.
   * @param {object} object Live root.
   * @param {EveSOFDNA} before Previous selection.
   * @param {EveSOFDNA} after Requested selection.
   * @returns {boolean} Whether ordinary pattern bindings can be planned directly.
   */
  @meta.ours
  _CanUpdatePatterns(object, before, after)
  {
    return !before.GetLayoutCount() && !after.GetLayoutCount()
      && !before.GetHullInstancedMeshes().length && !after.GetHullInstancedMeshes().length
      && after.GetBuildClass() !== EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION
      && object.mesh?.depthAreas.length === 0
      && (before.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN)?.[0] ?? null)
        !== (after.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN)?.[0] ?? null);
  }

  /**
   * Calculates only requested mesh constants and/or inserted texture paths.
   * The full builder remains a test oracle, not a dependency of this path.
   * @param {object} object Live root.
   * @param {EveSOFDNA} before Previous selection.
   * @param {EveSOFDNA} after Current prepared selection.
   * @param {object} options Original build options.
   * @param {Function} isCurrent Host and request guard.
   * @param {boolean} [patterns] Also calculate ordinary projection changes.
   * @returns {Promise<Array<object>|false|null>} Applied records or fallback.
   */
  @meta.ours
  async _UpdateMesh(object, before, after, options, isCurrent, patterns = false)
  {
    const changed = command => JSON.stringify(before.GetDnaCommandArgs(command)) !== JSON.stringify(after.GetDnaCommandArgs(command));
    let materials = changed(EveSOFDNA.DnaCommand.CMD_MATERIAL) || changed(EveSOFDNA.DnaCommand.CMD_PATTERN);
    let textures = changed(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
    // Equal selections may resolve changed catalog data; they are not snapshots.
    if (!materials && !textures) materials = textures = true;
    const patternTargets = patterns ? this._PatternTargets(object, before, after) : null;
    // Resolve authored insert paths before comparing pattern bindings: a hull
    // texture can also own a pattern slot, or be shared with another effect.
    let plan = this._PlanMesh(object, after, materials, textures, textures ? null : patternTargets);
    if (!plan) return null;
    if (textures)
    {
      const previous = plan;
      const paths = plan.textures.length
        ? await this._sof.ModifyTextureResPaths(after.GetDnaString(), plan.textures.map(value => value.path), options) : [];
      if (!isCurrent()) return false;
      if (!paths || paths.length !== previous.textures.length) return null;
      const resolvedTextures = new Map(previous.textures.map((target, index) => [target.object, paths[index]]));
      // A user may edit a mesh while file existence is pending. Revalidate the
      // small target set before applying anything, including material changes.
      plan = this._PlanMesh(object, after, materials, textures, patternTargets, resolvedTextures);
      if (!plan || plan.textures.length !== previous.textures.length) return null;
      for (let index = 0; index < paths.length; index++)
      {
        const target = plan.textures[index], earlier = previous.textures[index];
        if (target.object !== earlier.object || target.path !== earlier.path) return null;
        const existing = plan.changes.find(change => change.object === target.object);
        if (existing && existing.values.resourcePath !== paths[index]) return null;
        if (!existing && target.object.resourcePath !== paths[index])
          plan.changes.push({ object: target.object, type: "TriTextureParameter", values: { resourcePath: paths[index] } });
      }
    }
    if (!isCurrent()) return false;
    for (const change of plan.changes)
      if (change.masks) change.masks.added = change.masks.added.map(value => CjsSchema.from("EveCustomMask", value));
    const dna = after.GetDnaString();
    for (const decal of object.decals ?? [])
    {
      if (decal.__bluemetadata__?.SofDna === before.GetDnaString() && decal.__bluemetadata__.SofDna !== dna)
        plan.changes.push({ object: decal, type: getRegisteredClassName(decal.constructor), values: { __bluemetadata__: { SofDna: dna } } });
    }
    if (object.dna !== dna) plan.changes.push({ object, type: getRegisteredClassName(object.constructor), values: { dna } });
    for (const change of plan.changes) this._ApplyChange(change);
    return plan.changes.length ? plan.changes.map(change => ({ _type: change.type, ...change.values })) : false;
  }

  /**
   * Matches only SOF mesh areas and, for inserts, their inherited decal textures.
   * Only the optional pattern branch visits masks. Controllers, boosters,
   * attachments and other unrelated live state are never traversed.
   * @param {object} object Live root.
   * @param {EveSOFDNA} dna Current prepared selection.
   * @param {boolean} materials Calculate constants.
   * @param {boolean} textures Calculate authored texture insert targets.
   * @param {object|null} [patternTargets] Eligible pattern binding owners/names.
   * @param {Map<object,string>|null} [resolvedTextures] Current insert query results by live texture.
   * @returns {object|null} Validated patches and texture targets, or fallback.
   */
  @meta.ours
  _PlanMesh(object, dna, materials, textures, patternTargets = null, resolvedTextures = null)
  {
    const mesh = object.mesh;
    if (!CjsSchema.isInstanceOf("Tr2Mesh", mesh) || mesh.geometryResPath !== dna.GetHullGeometryResPath()) return null;
    const plan = { changes: [], textures: [] }, effects = new Map(), targets = new Map();
    const patterns = patternTargets && { ...patternTargets, resolvedTextures, processed: new Map(), records: new Map(),
      visited: new WeakMap(), owners: new WeakMap(), anchors: new Map(),
      external: new Set((object.externalParameters ?? []).filter(value => value.destinationAttribute === "resourcePath").map(value => value.destinationObject)) };
    const addTexture = (texture, path) =>
    {
      if (!CjsSchema.isInstanceOf("TriTextureParameter", texture) || typeof path !== "string") return false;
      if (targets.has(texture)) return targets.get(texture) === path;
      targets.set(texture, path); plan.textures.push({ object: texture, path }); return true;
    };
    const categories = [
      ["opaqueAreas", TriBatchType.TRIBATCHTYPE_OPAQUE], ["opaqueAreas", TriBatchType.TRIBATCHTYPE_DECAL],
      ["transparentAreas", TriBatchType.TRIBATCHTYPE_TRANSPARENT], ["additiveAreas", TriBatchType.TRIBATCHTYPE_ADDITIVE],
      ["distortionAreas", TriBatchType.TRIBATCHTYPE_DISTORTION]
    ];
    const positions = { opaqueAreas: 0, transparentAreas: 0, additiveAreas: 0, distortionAreas: 0, depthAreas: 0 };
    const depthShader = dna.GetGenericAreaShaderData("depthonlyv5.fx");
    const match = (live, area, shader, indexOffset, depth = false) =>
    {
      const effect = live?.effect;
      if (!CjsSchema.isInstanceOf("Tr2MeshArea", live) || live.name !== area.name
        || live.index !== area.index + indexOffset || live.count !== area.count
        || !CjsSchema.isInstanceOf("Tr2Effect", effect)
        || effect.effectFilePath !== dna.GetCompleteShaderPath(depth && depthShader ? "depthonlyv5.fx" : area.shader)) return false;
      if (materials)
      {
        const desired = [], names = new Set();
        if (!depth || !depthShader)
        {
          for (const name of shader.parameters)
          {
            const value = dna.GetMeshAreaParameter(area.areaType, name, area.parameters, area.blockedMaterials);
            if (value) { desired.push({ name, value: Array.from(value) }); names.add(name); }
          }
          for (const name of [...shader.defaultParameters.keys()].sort())
            if (!names.has(name)) desired.push({ name, value: Array.from(shader.defaultParameters.get(name)) });
        }
        const signature = JSON.stringify(desired);
        if (effects.has(effect) && effects.get(effect) !== signature) return false;
        if (!effects.has(effect))
        {
          effects.set(effect, signature);
          const values = {};
          if (!this._CollectConstants(effect.constParameters, desired, new Map(), values)) return false;
          if (Object.keys(values).length) plan.changes.push({ object: effect, type: "Tr2Effect", values });
        }
      }
      if (textures)
      {
        const names = new Set();
        for (const texture of effect.resources)
        {
          if (names.has(texture.name)) return false;
          names.add(texture.name);
        }
        for (const [name, source] of area.textures)
        {
          if (depth && depthShader && depthShader.transparencyTextureName !== name) continue;
          const texture = effect.resources.find(value => value.name === name);
          if (!addTexture(texture, source.resFilePath)) return false;
        }
      }
      return !patterns || this._PlanPatternEffect(effect, area, shader, dna, patterns, plan.changes);
    };
    let offset = 0;
    for (let hull = 0; hull < dna.GetMultiHullCount(); hull++)
    {
      let count = 0;
      for (const [key, batch] of categories)
      {
        const source = dna.GetHullMeshAreas(batch, hull) ?? [];
        count += source.length;
        for (const area of source)
        {
          const shader = dna.GetGenericAreaShaderData(area.shader);
          if (!shader || !match(mesh[key]?.[positions[key]++], area, shader, offset)) return null;
          if (batch === TriBatchType.TRIBATCHTYPE_TRANSPARENT && shader.doGenerateDepthArea
            && !match(mesh.depthAreas?.[positions.depthAreas++], area, shader, offset, true)) return null;
        }
      }
      offset += count;
    }
    if (Object.keys(positions).some(key => mesh[key]?.length !== positions[key])) return null;
    if (textures && !this._PlanDecalTextures(object, dna, addTexture)) return null;
    if (patterns)
    {
      // A decal/hull insert and a pattern layer may point at the same live
      // texture. They must agree even when one side needs no value change.
      if (resolvedTextures)
        for (const target of plan.textures)
        {
          const desired = patterns.records.get(target.object);
          if (desired && desired.resourcePath !== resolvedTextures.get(target.object)) return null;
        }
      // Reuse the prepared mask stage, emitting at most two small values records.
      // No mesh, controller, attachment or complete desired graph is constructed.
      const document = new SofValuesBuilder(), fields = { customMasks: [] };
      this._sof.SetupCustomMask(document, fields, dna);
      document.AddRoot("default", document.AddNode(getRegisteredClassName(object.constructor), fields));
      const desired = document.ToValues().customMasks;
      if (!this._CollectMasks(object, desired, patterns.anchors, patterns.visited, patterns.owners, plan.changes)) return null;
    }
    return plan;
  }

  /**
   * Calculates only pattern-owned bindings and the PPT option for one mesh effect.
   * Hull textures win over layers; the first applicable layer wins over shader
   * defaults. Sampler selection is independent of that texture precedence.
   * Unrelated live resource paths remain untouched, including host overrides.
   * @param {object} effect Matched live effect.
   * @param {object} area Authored mesh area.
   * @param {object} shader Generic shader data.
   * @param {EveSOFDNA} dna Prepared requested selection.
   * @param {object} context Per-plan permissions and identity maps.
   * @param {Array<object>} changes Deferred owner/leaf changes.
   * @returns {boolean} Whether all affected names and shared owners agree.
   */
  @meta.ours
  _PlanPatternEffect(effect, area, shader, dna, context, changes)
  {
    const layerCount = dna.GetPatternLayerCount(), application = dna.GetPatternApplicationData();
    const layers = new Map();
    for (let index = 0; index < layerCount; index++)
    {
      const layer = dna.GetPatternLayerData(application, index);
      if (dna.IsPatternLayerApplicableToArea(layer, area.areaType) && !layers.has(layer.textureName)) layers.set(layer.textureName, layer);
    }
    const current = new Map(effect.resources.map(value => [value.name, value]));
    if (current.size !== effect.resources.length) return false;
    for (const name of area.textures.keys()) if (!current.has(name)) return false;
    for (const name of shader.defaultTextures.keys()) if (!context.textures.has(name) && !current.has(name)) return false;
    const paths = new Map(effect.resources.map(value => [value.name, value.resourcePath]));
    if (context.resolvedTextures)
      for (const name of area.textures.keys())
      {
        const record = current.get(name);
        if (!context.resolvedTextures.has(record)) return false;
        paths.set(name, context.resolvedTextures.get(record));
      }
    for (const name of context.textures)
    {
      if (area.textures.has(name)) continue;
      if (layers.has(name)) paths.set(name, layers.get(name).textureResFilePath);
      else if (shader.defaultTextures.has(name)) paths.set(name, shader.defaultTextures.get(name).resFilePath);
      else paths.delete(name);
    }
    const samplerFields = ["addressU", "addressV", "addressW", "filter", "mipFilter", "lodBias", "maxMipLevel", "maxAnisotropy"];
    const samplers = effect.samplerOverrides.filter(value => !context.samplers.has(value.name)).map(value => ({
      _type: "Tr2SamplerOverride", name: value.name, ...Object.fromEntries(samplerFields.map(key => [key, value[key]]))
    }));
    for (const layer of layers.values()) samplers.push({ _type: "Tr2SamplerOverride", name: `${layer.textureName}Sampler`,
      addressU: layer.projectionAddressModeU, addressV: layer.projectionAddressModeV, addressW: 1,
      filter: 3, mipFilter: 2, lodBias: 0, maxMipLevel: 0, maxAnisotropy: 4 });
    const option = effect.options.filter(value => value.name === "SPACE_OBJECT_PPT_ENABLED");
    if (option.length !== 1 || !CjsSchema.isInstanceOf("Tr2ShaderOption", option[0])) return false;
    const ppt = layerCount > 0 ? "SOPPT_ENABLED" : "SOPPT_DISABLED";
    const signature = JSON.stringify({ paths: [...paths], samplers, ppt });
    if (context.processed.has(effect)) return context.processed.get(effect) === signature;
    context.processed.set(effect, signature);
    for (const [name, record] of current)
      if (context.external.has(record) && paths.get(name) !== record.resourcePath) return false;
    const resources = [];
    for (const [name, resourcePath] of paths)
    {
      const record = current.get(name);
      let value = record && context.records.get(record);
      if (value && value.resourcePath !== resourcePath) return false;
      if (!value)
      {
        value = { _type: "TriTextureParameter", name, resourcePath };
        if (record) context.records.set(record, value);
      }
      resources.push(value);
    }
    const existing = changes.find(change => change.object === effect);
    const patch = existing ? existing.values : {};
    if (!this._CollectPatternBindings(effect, "resources", resources, context.anchors, context.visited, context.owners, changes, patch, context)
      || !this._CollectPatternBindings(effect, "samplerOverrides", samplers, context.anchors, context.visited, context.owners, changes, patch, context)) return false;
    if (option[0].value !== ppt) patch.options = { SPACE_OBJECT_PPT_ENABLED: { value: ppt } };
    if (!existing && Object.keys(patch).length) changes.push({ object: effect, type: "Tr2Effect", values: patch });
    return true;
  }

  /**
   * Inserts affect decal parent textures only; authored/default/logo slots stay put.
   * Matches Carbon's filtered decal order without allocating effects or buffers.
   * @param {object} object Live root.
   * @param {EveSOFDNA} dna Prepared selection.
   * @param {Function} addTexture Deduplicated target collector.
   * @returns {boolean} Whether all eligible decal targets match.
   */
  @meta.ours
  _PlanDecalTextures(object, dna, addTexture)
  {
    const shaders = ["decalv5.fx", "decalcounterv5.fx", "decalholev5.fx", "decalcylindricv5.fx",
      "decalglowcylindricv5.fx", "decalglowv5.fx", "decalv5.fx"];
    let index = 0;
    for (let hull = 0; hull < dna.GetMultiHullCount(); hull++)
    {
      for (const set of dna.GetHullDecalSets(hull))
      {
        if (!dna.IsInVisibilityData(set.visibilityGroup)) continue;
        for (const item of set.items)
        {
          const name = shaders[Number(item.usage)];
          if (!name || (Number(item.usage) === EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO && !dna.HasLogoSet(item.logoType))) continue;
          const decal = object.decals?.[index++], effect = decal?.decalEffect;
          if (!CjsSchema.isInstanceOf("EveSpaceObjectDecal", decal) || !CjsSchema.isInstanceOf("Tr2Effect", effect)
            || effect.effectFilePath !== `${dna.GetDecalShaderLocationResPath()}/${dna.GetShaderPrefix(false)}${name}`) return false;
          const sourceId = BeObjectMetadata.Get(item, "sof_source_id");
          if (decal.__bluemetadata__?.sof_source_id !== undefined && decal.__bluemetadata__.sof_source_id !== sourceId) return false;
          if (decal.__bluemetadata__?.SofParentHullName !== undefined
            && decal.__bluemetadata__.SofParentHullName !== dna.GetHullNames()[hull]) return false;
          const shader = dna.GetGenericDecalShaderData(name);
          if (!shader || item.meshIndex === -1) continue;
          for (const textureName of shader.parentTextures)
          {
            if (item.textures.has(textureName) || shader.defaultTextures.has(textureName)) continue;
            const path = dna.GetHullTextureWithMeshIndex(textureName, item.meshIndex, hull);
            if (path === null) continue;
            const targets = effect.resources.filter(value => value.name === textureName);
            if (targets.length !== 1 || !addTexture(targets[0], path)) return false;
          }
        }
      }
    }
    return (object.decals?.length ?? 0) === index;
  }

  /**
   * Compares parsed commands and selections, allowing insert/material/pattern edits.
   * @param {EveSOFDNA|null} before Previous selection.
   * @param {EveSOFDNA|null} after Requested selection.
   * @returns {boolean} Whether positional matching is supported for this edit.
   */
  @meta.ours
  _CompatibleDNA(before, after)
  {
    if (!before || !after || before.GetParseError() || after.GetParseError()) return false;
    if (before.factionName !== after.factionName || before.raceName !== after.raceName
      || JSON.stringify(before.hullNames) !== JSON.stringify(after.hullNames)) return false;
    // Compare all authored commands, including unknown ones, without depending
    // on private parser state. Unknown commands must also remain unchanged.
    const commands = dna => dna.GetDnaString().split(":").slice(3)
      .filter(command => !/^(respathinsert|material|mesh|pattern)\?/.test(command));
    if (JSON.stringify(commands(before)) !== JSON.stringify(commands(after))) return false;
    const insert = after.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
    const previousInsert = before.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
    return (!insert || insert.length === 1) && (!previousInsert || previousInsert.length === 1);
  }

  /**
   * Indexes values anchors before traversal so forward references can resolve.
   * @param {*} value Values subtree.
   * @param {Map} anchors Model-values identity anchors.
   * @param {WeakSet} seen Already indexed records.
   * @returns {boolean} False for conflicting anchors.
   */
  @meta.ours
  _IndexValues(value, anchors, seen)
  {
    if (!value || typeof value !== "object" || seen.has(value)) return true;
    seen.add(value);
    if (Object.hasOwn(value, "_id"))
    {
      if (anchors.has(value._id) && anchors.get(value._id) !== value) return false;
      anchors.set(value._id, value);
    }
    for (const child of Object.values(value))
      if (!this._IndexValues(child, anchors, seen)) return false;
    return true;
  }

  /**
   * Validates topology and collects leaf and permitted pattern-list edits.
   * Runtime scalar state is deliberately not compared with factory defaults.
   * @param {*} live Live field or model.
   * @param {*} desired Corresponding values field or model.
   * @param {Map} anchors Values reference targets.
   * @param {WeakMap} visited Values-to-live correspondence.
   * @param {WeakMap} owners Live-to-values correspondence.
   * @param {Array<object>} changes Pending member-only patches.
   * @param {boolean} [boosterGlows] Sprite set whose items the booster generates.
   * @param {object|null} [patterns] Ordinary root pattern list-edit permissions.
   * @returns {boolean} Whether every incoming structure can be matched.
   */
  @meta.ours
  _CollectChanges(live, desired, anchors, visited, owners, changes, boosterGlows = false, patterns = null)
  {
    if (desired === null) return live === null || live === undefined;
    if (typeof desired !== "object") return live === null || typeof live !== "object";
    if (Object.hasOwn(desired, "_ref"))
    {
      if (!anchors.has(desired._ref)) return false;
      return this._CollectChanges(live, anchors.get(desired._ref), anchors, visited, owners, changes, boosterGlows, patterns);
    }
    if (!live || typeof live !== "object") return false;
    if (visited.has(desired)) return visited.get(desired) === live;
    if (owners.has(live)) return owners.get(live) === desired;
    visited.set(desired, live);
    owners.set(live, desired);
    if (Array.isArray(desired))
    {
      if ((!Array.isArray(live) && !ArrayBuffer.isView(live)) || live.length !== desired.length) return false;
      return desired.every((value, index) => this._CollectChanges(live[index], value, anchors, visited, owners, changes, false, patterns));
    }

    const type = getRegisteredClassName(live.constructor);
    if (desired._type && type !== desired._type) return false;
    if (Object.hasOwn(desired, "name") && desired.name !== live.name) return false;
    const patch = {};
    for (const [key, value] of Object.entries(desired))
    {
      if (key === "_type" || key === "_id") continue;
      if (live === patterns?.root && key === "customMasks")
      {
        if (!this._CollectMasks(live, value, anchors, visited, owners, changes)) return false;
        continue;
      }
      if (type === "Tr2Effect" && patterns?.effects.has(live) && (key === "resources" || key === "samplerOverrides"))
      {
        if (!this._CollectPatternBindings(live, key, value, anchors, visited, owners, changes, patch, patterns)) return false;
        continue;
      }
      if (type === "EveCustomMask")
      {
        const field = CjsSchema.getField(live.constructor, key);
        if (!field || !["boolean", "uint8", "vec3", "vec4", "quat"].includes(field.type?.kind)) return false;
        const next = normalizeCarbonValue(value, field.type);
        if (!IRootReaderBase.areEquivalent(live[key], next)) patch[key] = next;
        continue;
      }
      if (type === "Tr2Effect" && (key === "options" || key === "samplerOverrides"))
      {
        const named = this._CollectPackedFields(live[key], value,
          key === "options" ? "Tr2ShaderOption" : "Tr2SamplerOverride", anchors);
        if (named === null) return false;
        if (Object.keys(named).length) patch[key] = named;
        continue;
      }
      if (type === "Tr2Effect" && key === "constParameters")
      {
        if (!this._CollectConstants(live.constParameters, value, anchors, patch)) return false;
        continue;
      }
      const field = type && CjsSchema.getField(live.constructor, key);
      if (field?.type?.kind === "structList")
      {
        if (!this._CollectStructureList(live[key], value, field.type.className, anchors, changes)) return false;
        continue;
      }
      // Both booster classes clear and generate their glow sprites during
      // Initialize. An empty authored list is not the live list's topology.
      // This exception is owner-specific; ordinary sprite lists still match.
      if (boosterGlows && type === "EveSpriteSet" && key === "sprites"
        && Array.isArray(value) && value.length === 0 && Array.isArray(live.sprites)) continue;
      if (type === "Tr2RuntimeInstanceData" && key === "rows")
      {
        // Tr2RuntimeInstanceData's values factory accepts named rows and stores
        // them in layout order (#normalizeRow). Compare that existing shape
        // without constructing/repacking an instance stream or touching its GPU data.
        if (!Array.isArray(value) || !Array.isArray(desired.layout)) return false;
        const rows = value.map(row => Array.isArray(row) ? row
          : desired.layout.map(element => row[element.name]));
        if (!this._CollectChanges(live.rows, rows, anchors, visited, owners, changes)) return false;
        continue;
      }
      if (key === "__bluemetadata__")
      {
        // Preserve source identity. Only DNA provenance follows this edit.
        const current = live.__bluemetadata__ || {};
        if (value.sof_source_id !== undefined && value.sof_source_id !== current.sof_source_id) return false;
        if (typeof value.SofDna === "string" && value.SofDna !== current.SofDna)
          patch.__bluemetadata__ = { SofDna: value.SofDna };
        continue;
      }
      if ((type === "TriTextureParameter" && key === "resourcePath")
        || (desired._type && (key === "dna" || key === "sofDna")))
      {
        if (typeof value !== "string" || typeof live[key] !== "string") return false;
        if (value !== live[key]) patch[key] = value;
      }
      else if (!this._CollectChanges(live[key], value, anchors, visited, owners, changes,
        key === "glows" && (type === "EveBoosterSet2" || type === "EveChildBoosterSet"), patterns)) return false;
    }
    if (Object.keys(patch).length) changes.push({ object: live, type, values: patch });
    return true;
  }

  /**
   * Reuses compacted mask output slots and plans only appended/removed slots.
   * Mask index is an output slot, not a stable SOF source-layer identity.
   * @param {object} root Ordinary SOF root.
   * @param {Array<object>} desired Requested masks.
   * @param {Map} anchors Values references.
   * @param {WeakMap} visited Values-to-live correspondence.
   * @param {WeakMap} owners Live-to-values correspondence.
   * @param {Array<object>} changes Pending changes.
   * @returns {boolean} Whether every mask has a supported shape.
   */
  @meta.ours
  _CollectMasks(root, desired, anchors, visited, owners, changes)
  {
    const live = root.customMasks, Mask = CjsSchema.GetConstructor("EveCustomMask");
    if (!Array.isArray(live) || !Array.isArray(desired)
      || live.length > Mask.CUSTOM_MASK_COUNT || desired.length > Mask.CUSTOM_MASK_COUNT
      || new Set(live).size !== live.length || live.some(mask => !CjsSchema.isInstanceOf("EveCustomMask", mask))) return false;
    const added = [];
    for (let index = 0; index < desired.length; index++)
    {
      let value = desired[index];
      if (value && Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
      if (!value || value._type !== "EveCustomMask") return false;
      const fields = {};
      for (const [key, incoming] of Object.entries(value))
      {
        if (key === "_type" || key === "_id") continue;
        const field = CjsSchema.getField(Mask, key);
        if (!field || !["boolean", "uint8", "vec3", "vec4", "quat"].includes(field.type?.kind)) return false;
        fields[key] = normalizeCarbonValue(incoming, field.type);
      }
      if (index < live.length)
      {
        if (!this._CollectChanges(live[index], value, anchors, visited, owners, changes)) return false;
      }
      else
      {
        if (visited.has(value)) return false;
        visited.set(value, null);
        added.push(fields);
      }
    }
    if (live.length !== desired.length)
      changes.push({ object: root, type: getRegisteredClassName(root.constructor),
        values: { customMasks: desired }, masks: { length: desired.length, added } });
    return true;
  }

  /**
   * Matches effect bindings by name, permitting only pattern-owned additions/removals.
   * Desired paths already include hull/pattern/default precedence from the builder.
   * Existing texture objects use their normal notifications; list mutations use
   * effect setters so attachment/detachment and cache refresh remain owner-managed.
   * @param {object} effect Live effect.
   * @param {string} key Resource or sampler collection.
   * @param {Array<object>} desired Requested bindings.
   * @param {Map} anchors Values references.
   * @param {WeakMap} visited Values-to-live correspondence.
   * @param {WeakMap} owners Live-to-values correspondence.
   * @param {Array<object>} changes Pending changes.
   * @param {object} patch Pending owner values.
   * @param {object} patterns Allowed pattern binding names.
   * @returns {boolean} Whether bindings can be reconciled without unrelated edits.
   */
  @meta.ours
  _CollectPatternBindings(effect, key, desired, anchors, visited, owners, changes, patch, patterns)
  {
    const texture = key === "resources", className = texture ? "TriTextureParameter" : "Tr2SamplerOverride";
    const allowed = texture ? patterns.textures : patterns.samplers, current = new Map(), incoming = new Map(), edits = Object.create(null);
    if (!Array.isArray(effect[key]) || !Array.isArray(desired)) return false;
    for (const record of effect[key])
    {
      if (!CjsSchema.isInstanceOf(className, record) || typeof record.name !== "string" || current.has(record.name)) return false;
      current.set(record.name, record);
    }
    for (let value of desired)
    {
      if (value && Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
      if (!value || value._type !== className || typeof value.name !== "string" || incoming.has(value.name)) return false;
      incoming.set(value.name, value);
      const record = current.get(value.name);
      if (!record && !allowed.has(value.name)) return false;
      if (texture)
      {
        if (typeof value.resourcePath !== "string"
          || Object.keys(value).some(field => !["_type", "_id", "name", "resourcePath"].includes(field))) return false;
        if (record)
        {
          if (!this._CollectChanges(record, value, anchors, visited, owners, changes)) return false;
        }
        else
        {
          // Creating two named parameters cannot preserve a shared values anchor.
          // Leave that topology to replacement rather than silently split identity.
          if (visited.has(value)) return false;
          visited.set(value, null);
          edits[value.name] = value.resourcePath;
        }
      }
      else if (record)
      {
        const fields = this._CollectPackedFields([record], [value], className, anchors);
        if (fields === null) return false;
        if (fields[value.name]) edits[value.name] = fields[value.name];
      }
      else
      {
        const fields = {}, Type = CjsSchema.GetConstructor(className);
        for (const [field, scalar] of Object.entries(value))
        {
          if (field === "_type" || field === "_id" || field === "name") continue;
          if (!["addressU", "addressV", "addressW", "filter", "mipFilter", "lodBias", "maxMipLevel", "maxAnisotropy"].includes(field)
            || typeof scalar !== "number" || !Number.isFinite(scalar)) return false;
          fields[field] = normalizeCarbonValue(scalar, CjsSchema.getField(Type, field).type);
        }
        edits[value.name] = fields;
      }
    }
    for (const name of current.keys())
    {
      if (incoming.has(name)) continue;
      if (!allowed.has(name)) return false;
      edits[name] = null;
    }
    if (Object.keys(edits).length) patch[texture ? "textures" : "samplerOverrides"] = edits;
    return true;
  }

  /**
   * Matches packed structure slots by value rather than pointer identity.
   * Carbon's DictReader::ReadStructureList copies each record into its slot;
   * the JS reader likewise copies referenced records. Each slot therefore has
   * its own correspondence map, while ordinary object lists retain shared maps.
   * @param {Array<object>} live Existing packed records.
   * @param {Array<object>} desired Incoming structure values.
   * @param {string} className Declared structure type.
   * @param {Map} anchors Enclosing values reference targets.
   * @param {Array<object>} changes Pending leaf edits.
   * @returns {boolean} Whether every structure slot is compatible.
   */
  @meta.ours
  _CollectStructureList(live, desired, className, anchors, changes)
  {
    if (!Array.isArray(live) || !Array.isArray(desired) || live.length !== desired.length) return false;
    const slots = new Set();
    for (let index = 0; index < desired.length; index++)
    {
      if (!CjsSchema.isInstanceOf(className, live[index]) || slots.has(live[index])) return false;
      slots.add(live[index]);
      if (!this._CollectChanges(live[index], desired[index], anchors, new WeakMap(), new WeakMap(), changes)) return false;
    }
    return true;
  }

  /**
   * Collects changed packed constants into the effect's existing named setter.
   * Records have no notification hook; SetConstParameters refreshes their owner
   * and retains each existing record and vec4. Float32 comparison matches storage.
   * Topology changes are left to the caller's rebuild path.
   * @param {Array<object>} live Existing constant records.
   * @param {Array<object>} desired Requested constant records.
   * @param {Map} anchors Enclosing reference targets.
   * @param {object} patch Pending effect values.
   * @returns {boolean} Whether constants have compatible names and shapes.
   */
  @meta.ours
  _CollectConstants(live, desired, anchors, patch)
  {
    if (!Array.isArray(live) || !Array.isArray(desired) || live.length !== desired.length) return false;
    const names = new Set(), constants = Object.create(null), currentByName = new Map();
    for (const current of live)
    {
      if (!CjsSchema.isInstanceOf("Tr2ConstantEffectParameter", current)
        || typeof current.name !== "string" || currentByName.has(current.name)) return false;
      currentByName.set(current.name, current);
    }
    for (let index = 0; index < desired.length; index++)
    {
      let value = desired[index];
      if (value && Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
      const current = value && currentByName.get(value.name);
      if (!value || !current
        || (value._type && value._type !== "Tr2ConstantEffectParameter")
        || typeof value.name !== "string" || value.name !== current.name || names.has(value.name)
        || !Array.isArray(value.value) || value.value.length !== 4 || current.value.length !== 4
        || !value.value.every(Number.isFinite)) return false;
      names.add(value.name);
      const vector = value.value.map(Math.fround);
      if (vector.some((component, axis) => !Object.is(current.value[axis], component))) constants[value.name] = vector;
    }
    if (Object.keys(constants).length) patch.constParameters = constants;
    return true;
  }

  /**
   * Collects scalar differences in same-shape option/sampler records by name.
   * These records require effect-owner methods rather than record notifications.
   * @param {Array<object>} live Existing packed records.
   * @param {Array<object>} desired Incoming packed records.
   * @param {string} className Required registered type.
   * @param {Map} anchors Enclosing reference targets.
   * @returns {object|null} Changed fields by name, or null for incompatible input.
   */
  @meta.ours
  _CollectPackedFields(live, desired, className, anchors)
  {
    if (!Array.isArray(live) || !Array.isArray(desired) || live.length !== desired.length) return null;
    const counts = new Map(), result = Object.create(null);
    for (const record of live) counts.set(record?.name, (counts.get(record?.name) ?? 0) + 1);
    for (let index = 0; index < desired.length; index++)
    {
      let value = desired[index];
      if (value && Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
      const current = live[index];
      if (!value || !CjsSchema.isInstanceOf(className, current)
        || (value._type && value._type !== className) || typeof value.name !== "string"
        || value.name !== current.name) return null;
      const fields = {};
      for (const [key, incoming] of Object.entries(value))
      {
        if (key === "_id" || key === "_type" || key === "name") continue;
        const field = CjsSchema.getField(current.constructor, key);
        if (!field || (incoming !== null && typeof incoming === "object")) return null;
        const next = normalizeCarbonValue(incoming, field.type);
        if (!Object.is(current[key], next)) fields[key] = next;
      }
      if (Object.keys(fields).length)
      {
        if (counts.get(value.name) !== 1) return null;
        result[value.name] = fields;
      }
    }
    return result;
  }

  /**
   * Applies preflighted leaves and pattern-list edits through owner mutation routes.
   * Effect options use SetOption; other collections use SetValues name maps.
   * Multiple owner changes share one existing update batch, without closing a
   * caller-owned batch. This class never replaces the effect's packed lists.
   * @param {object} change Collected target, type and changed fields.
   * @returns {void}
   */
  @meta.ours
  _ApplyChange(change)
  {
    const { object, type, values } = change;
    if (change.masks)
    {
      while (object.customMasks.length > change.masks.length)
        removeChild(object, "customMasks", object.customMasks[object.customMasks.length - 1]);
      for (const mask of change.masks.added) addChild(object, "customMasks", mask);
      return;
    }
    if (type !== "Tr2Effect")
    {
      CjsSchema.setValues(object, values);
      return;
    }
    const { options, ...rest } = values;
    const optionNames = Object.keys(options ?? {});
    const operations = optionNames.length + Object.keys(rest).length;
    const ownBatch = operations > 1 && !object.insideStartUpdate;
    if (ownBatch) object.StartUpdate();
    try
    {
      for (const name of optionNames) object.SetOption(name, options[name].value);
      if (Object.keys(rest).length) CjsSchema.setValues(object, rest);
    }
    finally
    {
      if (ownBatch) object.EndUpdate();
    }
  }
}
