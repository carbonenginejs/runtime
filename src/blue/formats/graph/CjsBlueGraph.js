// Blue's side of the independent graph (global/model/graph), which imports nothing of Blue.
// Blue supplies its classes, as definitions with their flags as data, and as a class library.
// Disconnected: DictReader and DictWriter stay the live path until the one reviewed cutover.
import * as graph from "../../../global/model/graph/index.js";
import { ClassInfo } from "../../../global/model/graph/ClassInfo.js";
import { CjsSchema } from "#schema";
import { baseList, exposureChainTo, mappedInterfaces } from "../../compose/interface.js";
import { getDeclaredEditFlags } from "../../schema/compileClassInfo.js";
import { ICustomPersist } from "../../exposure/ICustomPersist.js";
import { IInitialize } from "../../exposure/IInitialize.js";
import { IList } from "../../exposure/IList.js";
import { IListNotify } from "../../exposure/IListNotify.js";
import { INotify } from "../../exposure/INotify.js";
import { getClassRegistrations } from "../../exposure/classes/registry.js";
import { IBlueObjectProxy } from "../../interfaces/IBlueObjectProxy.js";
import { BeObjectMetadata } from "../../services/BlueObjectMetadata.js";
import { IRootReaderBase } from "../../format/IRootReaderBase.js";
import { DeclaredClassName } from "../../format/IRootWriter.js";

const { CjsGraph, GRAPH_TYPES, GraphMemberFlags } = graph;

/** The element class of a typed array, as its name in the graph's type table. */
const arrayType = name => name.charAt(0).toLowerCase() + name.slice(1);

/** How each object kind holds its object. `type.object.ref.weak` is a rootRef on the edge `refWeak`. */
const KIND_EDGES = { rootRef: "ref", rootWeak: "weak", root: "embed", rawStruct: "embed", list: "ref", array: "ref", structList: "embed" };

/**
 * Registers Blue's classes with the graph, from the same declarations the values path reads.
 * @cjs Our adapter: the graph may not import the schema.
 */
export class CjsBlueGraph
{

  /**
   * Defines every registered class that has no definition yet, and adds Blue's class library.
   * @param {object} classes The class library, normally blue.classes.
   * @returns {void}
   */
  static register(classes)
  {
    for (const { name, type } of getClassRegistrations())
    {
      if (!CjsGraph.isDefined(type)) this.define(type, name);
    }

    CjsGraph.registerLibrary(classes);
    CjsGraph.setMetadataStore(BeObjectMetadata);
  }

  /**
   * Defines one class from its own transported declarations; the graph walks the exposure chain
   * for the rest. A member Blue's table has a row for is that row, which the graph fills; a typed
   * member with no exposure has none, and the graph makes it.
   * A recompile of the class fills the same rows again, so the definition keeps holding them.
   * @param {Function} ctor The class.
   * @param {string} name Its registered name.
   * @returns {object} Graph class info.
   */
  static define(ctor, name)
  {
    const { fields, levels } = IRootReaderBase.getDictionaryDeclarations(ctor);
    const mapped = mappedInterfaces(ctor);
    // The class's own level: what it declares, and what unregistered helper classes below its registered parent do.
    const own = new Set([ ...levels[0].members, ...levels[0].properties ]);
    const rows = this._getRows(levels[0]);

    return CjsGraph.define(ctor, {
      name,
      initialize: mapped.has(IInitialize),
      notify: mapped.has(INotify),
      listNotify: mapped.has(IListNotify),
      customPersist: mapped.has(ICustomPersist),
      list: mapped.has(IList),
      proxy: mapped.has(IBlueObjectProxy),
      layout: this._getLayout(ctor),
      ui: () => this._getUI(ctor),
      ownValues: ctor.ownValues === true,
      interfaces: Array.from(mapped, item => CjsSchema.getClassName(item)),
      bases: this._getBases(ctor),
      chainTo: this._getChainTo(ctor),
      members: fields.filter(field => own.has(field)).map(field =>
      {
        const member = this._getMember(field);
        const row = rows.get(field);
        if (row !== undefined) member.row = row;
        return member;
      })
    });
  }

  /**
   * The row Blue's member table holds for each of a class's own declarations.
   * @param {{type: Function, members: object[], properties: object[]}} level The class's own exposure level.
   * @returns {Map<object, object>} Declaration to row.
   */
  static _getRows(level)
  {
    const rows = new Map();
    const table = ClassInfo.exposeToBlue(level.type).memberTable;

    for (const declarations of [ level.members, level.properties ])
    {
      for (const field of declarations)
      {
        const key = field.key ?? field.name, index = field.index ?? -1;
        const row = table.find(each => each.name === field.name && each.key === key && each.index === index);
        if (row !== undefined) rows.set(field, row);
      }
    }

    return rows;
  }

  /**
   * A class's own presentation, from `meta.ui`.
   * @param {Function} ctor The class.
   * @returns {{members: object}} Graph presentation.
   */
  static _getUI(ctor)
  {
    const members = {};

    for (const field of IRootReaderBase.getDictionaryDeclarations(ctor).fields)
    {
      if (field.jessica) members[field.name] = field.jessica;
    }

    return { members };
  }

  /**
   * A structure record's layout, or null for a class declaring none.
   * @param {Function} ctor The class.
   * @returns {object|null} { size, boundaries, fields: [ { name, key, offset, dataType } ] }.
   */
  static _getLayout(ctor)
  {
    const schema = CjsSchema.getSchema(ctor);
    const definition = schema.structureDefinition;
    if (!definition) return null;

    const { size, boundaries, members } = definition;
    const keys = new Map(schema.members.map(member => [ member.name, member.key ]));

    return {
      size,
      boundaries: boundaries ?? [],
      fields: members.map(({ name: field, offset, type }) => ({ name: field, key: keys.get(field), offset, dataType: type }))
    };
  }

  /**
   * One graph member. A kind the type table does not name stays Invalid, which throws when used.
   * @param {object} field Schema declaration.
   * @returns {object} Graph member.
   */
  static _getMember(field)
  {
    const kind = field.type?.kind;
    const map = this._getMapType(field.type);
    if (map !== undefined) return this._getMapMember(field, map);

    if (kind === "map")
    {
      const item = this._getItem(field.type.valueType);
      if (item !== undefined) return { ...this._getFlags(field), type: "valuesMap", item };
    }

    const item = this._getValuesItem(field.type);
    if (item !== null) return { ...this._getFlags(field), type: "values", item, collection: kind };

    const edge = this._getEdgeKind(field);
    const name = kind === "typedArray" ? arrayType(field.type.arrayType) : kind === "array" ? "list" : kind;

    return {
      ...this._getFlags(field),
      type: Object.hasOwn(GRAPH_TYPES, name) && (edge || (name !== "map" && name !== "list")) ? name : undefined,
      wrapped: field.type?.wrapped,
      options: kind === "path" || kind === "wpath" ? { accepts: field.type.accepts ?? [] } : undefined,
      edge: edge ? {
        kind: edge,
        collection: kind === "structList" ? "list" : kind === "list" || kind === "array" ? kind : null,
        type: this._getDeclaredTypes(field.type)
      } : null
    };
  }

  /**
   * How a member holds its objects, or undefined for a value. A private field cannot be walked,
   * and an array of plain values is not an object list.
   * @param {object} field Schema declaration.
   * @returns {string|undefined} An edge kind.
   */
  static _getEdgeKind(field)
  {
    if (typeof field.key === "string" && field.key.startsWith("#")) return undefined;

    const kind = field.type?.kind;
    const held = DeclaredClassName(field.type);
    if (kind === "array" && (!held || held === "unknown" || Object.hasOwn(GRAPH_TYPES, held))) return undefined;

    return field.type?.owned === false ? "refWeak" : KIND_EDGES[kind];
  }

  /**
   * The classes a member may hold, the declared one first, as declared: whether each is defined is
   * the graph's question when the member is used, so a class may be defined before the ones it names.
   * A member that declares no class is dynamic.
   * @param {object} type Schema type.
   * @returns {string[]} Class names.
   */
  static _getDeclaredTypes(type)
  {
    const names = (type.accepts ?? [ DeclaredClassName(type) ]).map(name => typeof name === "function" ? CjsSchema.getClassName(name) : name);

    return names.every(name => name && name !== "unknown") ? names : [];
  }

  /**
   * A member's identity and Carbon's flags, as data. A values bag carries no binary block, and a
   * runtime-only member claims its name unread.
   * @param {object} field Schema declaration.
   * @returns {object} Member fields.
   */
  static _getFlags(field)
  {
    return {
      name: field.name, key: field.key, index: field.index, role: field.role,
      flags: getDeclaredEditFlags(field)
        | (field.type?.binary === true ? GraphMemberFlags.BINARY : 0)
        | (field.type?.runtimeOnly === true ? GraphMemberFlags.RUNTIMEONLY : 0)
    };
  }

  /**
   * The declared class of a Map of objects, or undefined when the member is not one. A Map of
   * anything else stays Invalid.
   * @param {object|undefined} type Schema type.
   * @returns {string|undefined} Class name.
   */
  static _getMapType(type)
  {
    if (type?.kind !== "map") return undefined;

    const value = type.valueType;
    const name = typeof value === "string" ? value : value?.kind === "rootRef" ? value.className : undefined;
    if (name === undefined || Object.hasOwn(GRAPH_TYPES, name)) return undefined;

    return name;
  }

  /**
   * One Map member.
   * @param {object} field Schema declaration.
   * @param {string} type Declared class of its values.
   * @returns {object} Graph member.
   */
  static _getMapMember(field, type)
  {
    return {
      ...this._getFlags(field),
      type: "map",
      edge: { kind: "ref", collection: "map", type }
    };
  }

  /**
   * A class's C++ base list by name: what it extends, then its own `@be.inherit`. A platform class
   * such as Error has no name of ours and is left out.
   * @param {Function} ctor A class.
   * @returns {string[]} Class names, in base order.
   */
  static _getBases(ctor)
  {
    const parent = Object.getPrototypeOf(ctor);
    const bases = parent === Function.prototype ? baseList(ctor) : [ parent, ...baseList(ctor) ];

    return bases.map(base => CjsSchema.getClassName(base)).filter(name => name !== undefined);
  }

  /**
   * The class a class's `@be.exposureChainTo` names, or null where its table ends.
   * @param {Function} ctor A class.
   * @returns {string|null} A class name.
   */
  static _getChainTo(ctor)
  {
    const chained = exposureChainTo(ctor);
    return chained === null ? null : CjsSchema.getClassName(chained);
  }

  /**
   * What a Map or list of plain values holds: a type name, or a nested list of one.
   * @param {string|object|undefined} type Declared item.
   * @returns {string|object|undefined} The graph's item, or undefined when it is not plain.
   */
  static _getItem(type)
  {
    if (typeof type === "string") return Object.hasOwn(GRAPH_TYPES, type) && !KIND_EDGES[type] ? type : undefined;
    if (type?.kind !== "list" && type?.kind !== "array") return undefined;

    const item = this._getItem(type.itemType);
    return item === undefined ? undefined : { type: "values", item, collection: type.kind };
  }

  /**
   * The item type of a list or array of plain values, or null for any other member.
   * @param {object|undefined} type Schema type.
   * @returns {string|null} A type name.
   */
  static _getValuesItem(type)
  {
    if (type?.kind !== "list" && type?.kind !== "array") return null;

    const item = typeof type.itemType === "string" ? type.itemType : type.itemType?.kind;

    return Object.hasOwn(GRAPH_TYPES, item) && !KIND_EDGES[item] ? item : null;
  }

  /** Stable class identity. */
  static className = "CjsBlueGraph";

}
