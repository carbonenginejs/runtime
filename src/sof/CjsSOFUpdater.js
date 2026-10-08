import { CjsSchema, meta } from "#schema";
import { getRegisteredClassName } from "../global/compose/className.js";
import { EveSOF } from "./EveSOF.js";
import { EveSOFDNA } from "./EveSOFDNA.js";

/**
 * Updates existing SOF graphs using the standard factory's values as the oracle.
 * Handles resource inserts and mesh materials. It retains lists, objects and unrelated
 * live state; structural incompatibility requests a full rebuild before writes.
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
   * Applies a supported DNA edit after validating the entire graph.
   * No list is passed to the values service. Notifications are left to that
   * service, once per changed member. Build errors reject without applying edits.
   * Superseded requests return false. Application errors propagate; arbitrary
   * consumer notification side effects cannot be rolled back transactionally.
   * @param {object} object A live, schema-registered SOF root with its original DNA.
   * @param {string} newDna Requested DNA.
   * @param {object} [options] The original build options, including layout seed/time.
   * @returns {Promise<Array<object>|false|null>} Changed values per object, false
   * for no changes or superseded work, null when the caller must rebuild.
   */
  @meta.ours
  async UpdateFromDNA(object, newDna, options = {})
  {
    if (!object || typeof object.dna !== "string" || typeof newDna !== "string") return null;
    const request = {};
    this._updates.set(object, request);
    const originalDna = object.dna;
    const oldSelection = await this._sof.CreateDna(originalDna, options);
    const newSelection = await this._sof.CreateDna(newDna, options);
    if (this._updates.get(object) !== request || object.dna !== originalDna) return false;
    if (!this._CompatibleDNA(oldSelection, newSelection)) return null;

    const values = await this._sof.BuildValuesFromDNA(newDna, options);
    if (this._updates.get(object) !== request || object.dna !== originalDna) return false;
    if (!values) return null;
    const anchors = new Map();
    if (!this._IndexValues(values, anchors, new WeakSet())) return null;
    const changes = [];
    const visited = new WeakMap();
    const owners = new WeakMap();
    if (!this._CollectChanges(object, values, anchors, visited, owners, changes)) return null;

    // Children are visited before their owner; publish the root DNA last.
    for (const change of changes) CjsSchema.setValues(change.object, change.values);
    return changes.length ? changes.map(change => ({ _type: change.type, ...change.values })) : false;
  }

  /**
   * Compares parsed commands and catalog selections, allowing insert/material edits.
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
      .filter(command => !/^(respathinsert|material|mesh)\?/.test(command));
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
}
