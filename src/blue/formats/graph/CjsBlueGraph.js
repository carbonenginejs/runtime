// Blue's side of the independent graph (global/model/graph), which imports nothing of Blue.
// Blue supplies its classes, as definitions with their flags as data, and as a class library.
// A class is defined to the graph when it is declared: the schema's compile calls `define` (bottom of this file).
// Disconnected: DictReader and DictWriter stay the live path until the one reviewed cutover.
import * as graph from "../../../global/model/graph/index.js";
import { ClassInfo } from "../../../global/model/graph/ClassInfo.js";
import { CjsSchema } from "#schema";
import { getRegisteredClassName } from "../../compose/className.js";
import { isTransportedDeclaration } from "../../compose/fieldFlags.js";
import { baseList, exposureChainTo, mappedInterfaces } from "../../compose/interface.js";
import { declaredMemberType, getDeclaredEditFlags, installGraphDefine } from "../../schema/compileClassInfo.js";
import { ICustomPersist } from "../../exposure/ICustomPersist.js";
import { IInitialize } from "../../exposure/IInitialize.js";
import { IList } from "../../exposure/IList.js";
import { IListNotify } from "../../exposure/IListNotify.js";
import { INotify } from "../../exposure/INotify.js";
import { getClassRegistrations } from "../../exposure/classes/registry.js";
import { IBlueObjectProxy } from "../../interfaces/IBlueObjectProxy.js";
import { BeObjectMetadata } from "../../services/BlueObjectMetadata.js";
import { IRootReaderBase } from "../../format/IRootReaderBase.js";

const { CjsGraph, GraphMemberFlags } = graph;

/**
 * Registers Blue's classes with the graph, from the same declarations the values path reads.
 * @cjs Our adapter: the graph may not import the schema.
 */
export class CjsBlueGraph
{

  /**
   * Adds Blue's class library and metadata store to the graph. It defines no class: each is defined when declared.
   * @param {object} classes The class library, normally blue.classes.
   * @returns {void}
   */
  static register(classes)
  {
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
    const mapped = mappedInterfaces(ctor);
    const fields = this._getOwnDeclarations(ctor);
    const rows = this._getRows(ctor, fields);

    // A Blue row whose member values do not carry (a live property, not persisted) still gets its type facts, so
    // every row of the table is whole; it stays out of the graph's members. Each row is filled from the declaration
    // it was compiled from.
    const info = ClassInfo.exposeToBlue(ctor), carried = new Set(rows.values());
    for (const row of info.memberTable)
    {
      if (carried.has(row)) continue;
      CjsGraph.compileMember({ ...this._getMember(info.declarationOf(row)), row });
    }

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
      members: fields.map(field =>
      {
        const member = this._getMember(field);
        const row = rows.get(field);
        if (row !== undefined) member.row = row;
        return member;
      })
    });
  }

  /**
   * A class's own declarations, as the values view selects and orders them (IRootReaderBase.getDictionaryDeclarations):
   * what it declares and what unregistered helper classes below its registered parent do, stored members before
   * live properties, each name once, in Carbon's member order where the class has an exposure bag.
   * Read from the declared schema, which resolves no enum: a class is defined when it is declared, and an enum
   * its members name may register after it.
   * @param {Function} ctor The class.
   * @returns {object[]} Schema declarations.
   */
  static _getOwnDeclarations(ctor)
  {
    const schema = CjsSchema.getDeclaredSchema(ctor);
    const own = new Set([ ctor ]);
    for (let helper = Object.getPrototypeOf(ctor); typeof helper === "function" && helper !== Function.prototype && !getRegisteredClassName(helper); helper = Object.getPrototypeOf(helper))
    {
      own.add(helper);
    }

    const fields = [], names = new Set();
    for (const declarations of [ schema.members, schema.properties ])
    {
      for (const field of declarations)
      {
        if (!own.has(field.declaringClass) || names.has(field.name) || !isTransportedDeclaration(field)) continue;
        names.add(field.name);
        fields.push(field);
      }
    }

    return CjsSchema.orderByExposureRows(ctor, fields);
  }

  /**
   * The row Blue's member table holds for each of a class's own declarations: its name, key and index, compiled
   * from a declaration of the same class, so a helper class's member of one name and key keeps its own row.
   * @param {Function} ctor The class.
   * @param {object[]} fields Its own declarations.
   * @returns {Map<object, object>} Declaration to row.
   */
  static _getRows(ctor, fields)
  {
    const rows = new Map();
    const info = ClassInfo.exposeToBlue(ctor), table = info.memberTable;

    for (const field of fields)
    {
      const key = field.key ?? field.name, index = field.index ?? -1;
      const row = table.find(each => each.name === field.name && each.key === key && each.index === index
        && info.declarationOf(each).declaringClass === field.declaringClass);
      if (row !== undefined) rows.set(field, row);
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
    const schema = CjsSchema.getDeclaredSchema(ctor);
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
   * One graph member: its name and flags, and its type facts from the schema's one translation of a declared type
   * (declaredMemberType), so the graph writes what the schema's compile wrote. A type the table does not name stays
   * Invalid, which throws when used.
   * @param {object} field Schema declaration.
   * @returns {object} Graph member.
   */
  static _getMember(field)
  {
    return { ...this._getFlags(field), ...declaredMemberType(field.type, field.key).graph };
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
        | (field.type?.nullable === true ? GraphMemberFlags.NULLABLE : 0)
    };
  }

  /**
   * A class's C++ base list: what it extends, then its own `@be.inherit`. Each is the class itself, not its
   * name, so the graph passes over one it has no record for (a platform class such as Error, or a plain class
   * of ours) and takes it up if it is defined later.
   * @param {Function} ctor A class.
   * @returns {Function[]} Classes, in base order.
   */
  static _getBases(ctor)
  {
    const parent = Object.getPrototypeOf(ctor);
    return parent === Function.prototype ? baseList(ctor).slice() : [ parent, ...baseList(ctor) ];
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

  /** Stable class identity. */
  static className = "CjsBlueGraph";

}

// From here the schema's compile defines each class as it is declared. The classes declared before this module
// loaded, Blue's own that it imports, are defined now, in the order they registered.
installGraphDefine((ctor, name) => CjsBlueGraph.define(ctor, name));
for (const { name, type } of getClassRegistrations())
{
  if (!CjsGraph.isDefined(type)) CjsBlueGraph.define(type, name);
}
