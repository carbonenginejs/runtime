import { CjsCharacterPdpType } from "../formats/characterPdpType.js";
import { CjsSchema } from "#schema";
import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
import { CjsCharacterGeneric } from "../model/source/CjsCharacterGeneric.js";
import { genericDefaults } from "../factory/defaults/generic.js";

/** The file-shape values a source type may name. */
const PDP_TYPES = new Set(Object.values(CjsCharacterPdpType));

/**
 * The character library's indexing configuration, read from a generic's source members (`CjsCharacterGeneric`
 * `sourceRoots`, `sourceExcludes`, `sourceTypes`, `sourceRows`, `sourceBlackPatterns`, `sourceStaticNames`,
 * `sourceListForms`) into the shapes the builder and the reader use: `roots`, `excludes`, `kinds` (each source type's
 * declaration by name), `rows` (`{ match, kind }`), `blackPatterns`, `staticNames` and `sourceLists` (each record
 * class's list forms by file key, as `normalizeCharacterYamlValues` reads them). The statics are the shipped generic's
 * (`factory/defaults/generic.js`); an installed library's generic does not change the indexing yet.
 *
 * Ours (no Carbon counterpart): the client's paper doll is Python.
 */
export class CjsCharacterLibraryConfiguration
{
    /**
     * Reads a generic's source members, refusing what the library could not read with: a file shape that is no
     * `CjsCharacterPdpType` value (or is `NONE`), a file shape two source types name, a record class that is not
     * registered, a repeated source type or list form, a row of an unknown source type, or a list form that is the bare
     * base class.
     * @param {CjsCharacterGeneric} generic The generic.
     * @throws {Error} For any of those.
     */
    constructor(generic)
    {
        /** @type {string[]} The `res:` roots the library indexes. */
        this.roots = Array.from(generic.sourceRoots);
        /** @type {string[]} The patterns below the roots it never indexes. */
        this.excludes = Array.from(generic.sourceExcludes);
        /** @type {string[]} The `.black`/`.red` resource patterns it indexes by path, without their extension. */
        this.blackPatterns = Array.from(generic.sourceBlackPatterns);
        /** @type {string[]} The `res:/staticdata/<name>.fsdbinary` files it indexes by path. */
        this.staticNames = Array.from(generic.sourceStaticNames);

        /** @type {Object<string, { className: string, pdpType: number, envelope?: true, generic?: true, pathOnly?: true, derived?: true, slots?: string[] }>} */
        this.kinds = {};
        for (const type of generic.sourceTypes)
        {
            if (Object.hasOwn(this.kinds, type.name)) throw new Error("Repeated character source type " + type.name);
            if (!PDP_TYPES.has(type.pdpType) || type.pdpType === CjsCharacterPdpType.NONE) throw new Error(`Character source type ${type.name} names no file shape: ${type.pdpType}`);
            const shared = Object.keys(this.kinds).find(name => this.kinds[name].pdpType === type.pdpType);
            if (shared) throw new Error(`Character source types ${shared} and ${type.name} name one file shape ${type.pdpType}`);
            if (!CjsSchema.getConstructor(type.className)) throw new Error(`Character source type ${type.name} names an unregistered class ${type.className}`);
            const kind = { className: type.className, pdpType: type.pdpType };
            for (const flag of [ "envelope", "generic", "pathOnly", "derived" ]) if (type[flag]) kind[flag] = true;
            if (type.slots.length) kind.slots = Array.from(type.slots);
            this.kinds[type.name] = kind;
        }

        /** @type {Array<{ match: string, kind: string }>} */
        this.rows = generic.sourceRows.map(row =>
        {
            if (!Object.hasOwn(this.kinds, row.sourceType)) throw new Error(`Character source row ${row.match} names an unknown source type ${row.sourceType}`);
            return { match: row.match, kind: row.sourceType };
        });

        /** @type {Object<string, Object<string, (string[]|object)>>} */
        this.sourceLists = {};
        for (const form of generic.sourceListForms)
        {
            if (!CjsSchema.getConstructor(form.className)) throw new Error(`Character list form ${form.className}.${form.key} names an unregistered class`);
            const forms = this.sourceLists[form.className] ??= {};
            if (Object.hasOwn(forms, form.key)) throw new Error(`Repeated character list form ${form.className}.${form.key}`);
            forms[form.key] = CjsCharacterLibraryConfiguration._ReadListForm(form);
        }
    }

    /**
     * The path rows, with the black-resource patterns (both spellings) and the static files as rows of their own.
     * @returns {Array<{ match: string, kind: string }>} The caller's own rows.
     */
    getRows()
    {
        const rows = this.rows.map(row => ({ ...row }));
        for (const prefix of this.blackPatterns)
        {
            rows.push({ match: prefix + ".red", kind: "blackResources" });
            rows.push({ match: prefix + ".black", kind: "blackResources" });
        }
        for (const name of this.staticNames) rows.push({ match: `res:/staticdata/${name}.fsdbinary`, kind: "staticResources" });
        return rows;
    }

    /**
     * The source type a file shape is stored under: a shared family's file (cameras, posts) is read before its shape is
     * known.
     * @param {number} pdpType A `CjsCharacterPdpType` value.
     * @returns {string} The source type's name.
     * @throws {Error} For a value no source type declares.
     */
    kindOf(pdpType)
    {
        for (const [ kind, declaration ] of Object.entries(this.kinds)) if (declaration.pdpType === pdpType) return kind;
        throw new Error("No character kind has file shape " + pdpType);
    }

    /**
     * One list form in the reader's shape: a positional form's field names, or a records form's
     * `{ keyed?, value?, tuple?, rest? }` (`tuple` the field names, or the field names by tuple length).
     * @param {object} form A `CjsCharacterDataListForm` subclass record.
     * @returns {string[]|object} The form.
     * @throws {Error} For the bare base class, which names no form.
     */
    static _ReadListForm(form)
    {
        const className = CjsSchema.getClassName(form.constructor);
        if (className === "CjsCharacterDataListFormPositional") return Array.from(form.fields);
        if (className !== "CjsCharacterDataListFormRecords") throw new Error(`Character list form ${form.className}.${form.key} names no form (${className})`);
        const result = {};
        if (form.keyed) result.keyed = form.keyed;
        if (form.value) result.value = form.value;
        if (form.tuple.length) result.tuple = Array.from(form.tuple);
        else if (form.tupleByLength.length) result.tuple = Object.fromEntries(form.tupleByLength.map(shape => [ shape.length, Array.from(shape.fields) ]));
        if (form.rest) result.rest = form.rest;
        return result;
    }

    /** @type {?CjsCharacterGeneric} The shipped generic, built once (`shippedGeneric`). */
    static _shippedGeneric = null;

    /** @type {?CjsCharacterLibraryConfiguration} The shipped generic's configuration, built once (`shipped`). */
    static _shipped = null;

    /**
     * The shipped generic (`factory/defaults/generic.js`, in the generic's own values shape), built with the graph once,
     * so a member the generic does not declare fails the build.
     * @returns {CjsCharacterGeneric} The shipped generic; not to be changed.
     */
    static shippedGeneric()
    {
        if (this._shippedGeneric === null) this._shippedGeneric = CjsGraph.from(CjsCharacterGeneric, genericDefaults);
        return this._shippedGeneric;
    }

    /**
     * The shipped generic's configuration.
     * @returns {CjsCharacterLibraryConfiguration} The configuration; not to be changed.
     */
    static shipped()
    {
        if (this._shipped === null) this._shipped = new CjsCharacterLibraryConfiguration(this.shippedGeneric());
        return this._shipped;
    }

    /** The shipped `roots`. @returns {string[]} */
    static get roots() { return this.shipped().roots; }

    /** The shipped `excludes`. @returns {string[]} */
    static get excludes() { return this.shipped().excludes; }

    /** The shipped `kinds`. @returns {Object<string, object>} */
    static get kinds() { return this.shipped().kinds; }

    /** The shipped `rows`. @returns {Array<{ match: string, kind: string }>} */
    static get rows() { return this.shipped().rows; }

    /** The shipped `blackPatterns`. @returns {string[]} */
    static get blackPatterns() { return this.shipped().blackPatterns; }

    /** The shipped `staticNames`. @returns {string[]} */
    static get staticNames() { return this.shipped().staticNames; }

    /** The shipped `sourceLists`. @returns {Object<string, Object<string, (string[]|object)>>} */
    static get sourceLists() { return this.shipped().sourceLists; }

    /**
     * The shipped configuration's rows (`getRows`).
     * @returns {Array<{ match: string, kind: string }>} The caller's own rows.
     */
    static getRows() { return this.shipped().getRows(); }

    /**
     * The shipped configuration's source type of a file shape (`kindOf`).
     * @param {number} pdpType A `CjsCharacterPdpType` value.
     * @returns {string} The source type's name.
     */
    static kindOf(pdpType) { return this.shipped().kindOf(pdpType); }
}
