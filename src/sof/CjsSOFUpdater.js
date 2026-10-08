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

/**
 * Updates mesh materials and inserts directly from prepared SOF selections.
 * Complex layouts and pattern changes retain the full-values comparison path.
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

    if (this._CanUpdateMesh(oldSelection, newSelection))
      return this._UpdateMesh(object, oldSelection, newSelection, options,
        () => isCurrent() && this._updates.get(object) === request && object.dna === originalDna);

    const values = await this._sof.BuildValuesFromDNA(newDna, options);
    if (!isCurrent() || this._updates.get(object) !== request || object.dna !== originalDna) return false;
    if (!values) return null;
    const anchors = new Map();
    if (!this._IndexValues(values, anchors, new WeakSet())) return null;
    let changes = [];
    const visited = new WeakMap();
    const owners = new WeakMap();
    if (!this._CollectChanges(object, values, anchors, visited, owners, changes)) return null;

    // SOF creates banner ImageMap slots empty and exposes them through external
    // parameters. Their paths belong to the host; do not clear and reload them.
    const externalTextures = new Set((object.externalParameters ?? [])
      .filter(parameter => getRegisteredClassName(parameter.constructor) === "Tr2ExternalParameter"
        && parameter.destinationAttribute === "resourcePath")
      .map(parameter => parameter.destinationObject));
    changes = changes.filter(change => change.type !== "TriTextureParameter" || !externalTextures.has(change.object));

    // Children are visited before their owner; publish the root DNA last.
    for (const change of changes) this._ApplyChange(change);
    return changes.length ? changes.map(change => ({ _type: change.type, ...change.values })) : false;
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
    const pattern = dna => dna.GetDnaCommandArgs(EveSOFDNA.DnaCommand.CMD_PATTERN)?.[0] ?? "";
    return pattern(before) === pattern(after)
      && !after.GetLayoutCount() && !before.GetLayoutCount()
      && !after.GetHullInstancedMeshes().length && !before.GetHullInstancedMeshes().length
      && after.GetBuildClass() !== EveSOFDataHull.BuildClass.BUILDCLASS_EXTENSION;
  }

  /**
   * Calculates only requested mesh constants and/or inserted texture paths.
   * The full builder remains a test oracle, not a dependency of this path.
   * @param {object} object Live root.
   * @param {EveSOFDNA} before Previous selection.
   * @param {EveSOFDNA} after Current prepared selection.
   * @param {object} options Original build options.
   * @param {Function} isCurrent Host and request guard.
   * @returns {Promise<Array<object>|false|null>} Applied records or fallback.
   */
  @meta.ours
  async _UpdateMesh(object, before, after, options, isCurrent)
  {
    const changed = command => JSON.stringify(before.GetDnaCommandArgs(command)) !== JSON.stringify(after.GetDnaCommandArgs(command));
    let materials = changed(EveSOFDNA.DnaCommand.CMD_MATERIAL) || changed(EveSOFDNA.DnaCommand.CMD_PATTERN);
    let textures = changed(EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
    // Equal selections may resolve changed catalog data; they are not snapshots.
    if (!materials && !textures) materials = textures = true;
    let plan = this._PlanMesh(object, after, materials, textures);
    if (!plan) return null;
    if (plan.textures.length)
    {
      const previous = plan;
      const paths = await this._sof.ModifyTextureResPaths(after.GetDnaString(), plan.textures.map(value => value.path), options);
      if (!isCurrent()) return false;
      if (!paths) return null;
      // A user may edit a mesh while file existence is pending. Revalidate the
      // small target set before applying anything, including material changes.
      plan = this._PlanMesh(object, after, materials, textures);
      if (!plan || plan.textures.length !== previous.textures.length) return null;
      for (let index = 0; index < paths.length; index++)
      {
        const target = plan.textures[index], earlier = previous.textures[index];
        if (target.object !== earlier.object || target.path !== earlier.path) return null;
        if (target.object.resourcePath !== paths[index])
          plan.changes.push({ object: target.object, type: "TriTextureParameter", values: { resourcePath: paths[index] } });
      }
    }
    if (!isCurrent()) return false;
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
   * Does not visit masks, controllers, boosters, attachments or other live state.
   * @param {object} object Live root.
   * @param {EveSOFDNA} dna Current prepared selection.
   * @param {boolean} materials Calculate constants.
   * @param {boolean} textures Calculate authored texture insert targets.
   * @returns {object|null} Validated patches and texture targets, or fallback.
   */
  @meta.ours
  _PlanMesh(object, dna, materials, textures)
  {
    const mesh = object.mesh;
    if (!CjsSchema.isInstanceOf("Tr2Mesh", mesh) || mesh.geometryResPath !== dna.GetHullGeometryResPath()) return null;
    const plan = { changes: [], textures: [] }, effects = new Map(), targets = new Map();
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
      return true;
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
    return plan;
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
   * Validates topology and collects leaf edits without mutating the live graph.
   * Runtime scalar state is deliberately not compared with factory defaults.
   * @param {*} live Live field or model.
   * @param {*} desired Corresponding values field or model.
   * @param {Map} anchors Values reference targets.
   * @param {WeakMap} visited Values-to-live correspondence.
   * @param {WeakMap} owners Live-to-values correspondence.
   * @param {Array<object>} changes Pending member-only patches.
   * @param {boolean} [boosterGlows] Sprite set whose items the booster generates.
   * @returns {boolean} Whether every incoming structure can be matched.
   */
  @meta.ours
  _CollectChanges(live, desired, anchors, visited, owners, changes, boosterGlows = false)
  {
    if (desired === null) return live === null || live === undefined;
    if (typeof desired !== "object") return live === null || typeof live !== "object";
    if (Object.hasOwn(desired, "_ref"))
    {
      if (!anchors.has(desired._ref)) return false;
      return this._CollectChanges(live, anchors.get(desired._ref), anchors, visited, owners, changes, boosterGlows);
    }
    if (!live || typeof live !== "object") return false;
    if (visited.has(desired)) return visited.get(desired) === live;
    if (owners.has(live)) return owners.get(live) === desired;
    visited.set(desired, live);
    owners.set(live, desired);
    if (Array.isArray(desired))
    {
      if ((!Array.isArray(live) && !ArrayBuffer.isView(live)) || live.length !== desired.length) return false;
      return desired.every((value, index) => this._CollectChanges(live[index], value, anchors, visited, owners, changes));
    }

    const type = getRegisteredClassName(live.constructor);
    if (desired._type && type !== desired._type) return false;
    if (Object.hasOwn(desired, "name") && desired.name !== live.name) return false;
    const patch = {};
    for (const [key, value] of Object.entries(desired))
    {
      if (key === "_type" || key === "_id") continue;
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
        key === "glows" && (type === "EveBoosterSet2" || type === "EveChildBoosterSet"))) return false;
    }
    if (Object.keys(patch).length) changes.push({ object: live, type, values: patch });
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
    const names = new Set(), constants = Object.create(null);
    for (let index = 0; index < desired.length; index++)
    {
      let value = desired[index];
      if (value && Object.hasOwn(value, "_ref")) value = anchors.get(value._ref);
      const current = live[index];
      if (!value || !CjsSchema.isInstanceOf("Tr2ConstantEffectParameter", current)
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
   * Applies preflighted leaf patches using each owner's established values route.
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
