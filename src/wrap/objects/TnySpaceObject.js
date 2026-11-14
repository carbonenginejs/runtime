import { CjsSchema, meta, type } from "#schema";
import { vec4 } from "#math/vec4";
import { ICjsGraphRoot } from "../../global/model/graph/ICjsGraphRoot.js";
import { INotify } from "../../blue/exposure/INotify.js";
import { CjsBlueGraph } from "../../blue/formats/graph/CjsBlueGraph.js";
import { CjsLibrary } from "../../core/CjsLibrary.js";
import { EveSpaceObject2 } from "../../trinity/eve/spaceObject/EveSpaceObject2.js";
import { Tr2ExternalParameter } from "../../trinity/core/binding/Tr2ExternalParameter.js";
import { EveSOFDNA } from "../../sof/EveSOFDNA.js";
import { blue } from "../../blue/index.js";
import { TnyControllers } from "./TnyControllers.js";
import { TnyOverlays } from "./TnyOverlays.js";
import { TnySpaceObjectIdentity } from "./TnySpaceObjectIdentity.js";

/**
 * The dirt level for weeks since a ship was last cleaned. Ours, client
 * behaviour as found in ccpwgl (EveSpaceObject2.getDirtLevelFromWeeks); Carbon
 * only consumes m_dirtLevel. Moved here from Graphene's TrinityShipAge.
 *
 * @param {number} weeks Weeks since the last clean.
 * @returns {number} The dirt level, never below 0.
 * @cjs
 */
export function dirtLevelFromWeeks(weeks)
{
    return Math.max(0.7 - 1 / (Math.pow(Math.max(weeks, 0), 0.65) + 1 / 2.7), 0);
}

/** The module animations on the impact overlay, by their native names (EveSpaceObject2.SetImpactAnimation). */
const ANIMATIONS = [ "shieldboost", "shieldhardening", "armorhardening", "armorrepair", "hullrepair" ];

/** Members a UI writes and the wrapper hears, as a member flag set. */
const VALUE = meta.READWRITE | meta.NOTIFY;

/**
 * A schema member's edit facts as Carbon's EDITFLAGS bitmask, for the type info.
 * @param {object|null} edit Schema member edit flags, or null.
 * @returns {number}
 * @cjs
 */
function EditFlags(edit)
{
    if (!edit) return 0;
    return (edit.read ? meta.READ : 0) | (edit.write ? meta.WRITE : 0) | (edit.notify ? meta.NOTIFY : 0)
        | (edit.hidden ? meta.HIDDEN : 0) | (edit.persist ? meta.PERSIST : 0) | (edit.rpersist ? meta.RPERSIST : 0);
}

/** Wrappers made so far; each takes the next as its id. */
let wrapperCount = 0;

/**
 * Sits between a live space object and a UI: declares what the object
 * exposes, holds the values, and pushes writes down to the native owners. A UI
 * reads only the wrapper: its type info, its values and its notifications.
 * Ours, after ccpwgl's TnySpaceObject (our own code there); the client's
 * Python role (tny.md, operator 2026-11-07).
 *
 * Every declared member is always present; null means the object does not
 * support it, writes to it are ignored and a UI does not draw it. Hull facts
 * are discovered once, after the object is built.
 * @cjs
 */
@meta.define({ name: "TnySpaceObject" })
@meta.exposureChainTo(ICjsGraphRoot)
@meta.mapInterface(INotify)
export class TnySpaceObject extends ICjsGraphRoot
{

    /**
     * The user's name for the object, written to the native `name` too.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.string
    name = null;

    /**
     * What the object is, filled in by the library (TnySpaceObjectIdentity), read-only.
     * @type {TnySpaceObjectIdentity|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.object.ref("TnySpaceObjectIdentity")
    identity = null;

    /**
     * Weeks since the last clean, written to the native dirtLevel (which is
     * not a value here). Ours, client behaviour as found in ccpwgl; Graphene's
     * TrinityShipAge.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    age = null;

    /**
     * EveSpaceObject2.activationStrength.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    activationStrength = null;

    /**
     * Shield left, 1 full to 0 gone: SetImpactDamageState's `shield`, which
     * drives the core damage overlays and the ShieldDamage controller variable
     * (Carbon gives that variable what remains, despite its name).
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    shield = null;

    /**
     * Armour left, 1 to 0 (SetImpactDamageState `armor`).
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    armor = null;

    /**
     * Hull left, 1 to 0 (SetImpactDamageState `hull`).
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    hull = null;

    /**
     * Shield booster animation (SetImpactAnimation).
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    shieldboost = null;

    /**
     * Shield hardener animation.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    shieldhardening = null;

    /**
     * Armour hardener animation.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    armorhardening = null;

    /**
     * Armour repairer animation.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    armorrepair = null;

    /**
     * Hull repairer animation.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    hullrepair = null;

    /**
     * The client's cloak: res:/fisfx/cloaking/cloaking(_skinned).black as an overlay (TnyOverlays).
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    cloak = null;

    /**
     * The borrowed native object; a UI never reads it.
     * @type {EveSpaceObject2|null}
     * @cjs
     */
    wrapped = null;

    /**
     * This wrapper's id, kept for its life (across skin changes too).
     * @type {number}
     * @cjs
     */
    id = 0;

    /**
     * Called with a member's name after the wrapper handled a change to it; set by a UI.
     * @type {Function|null}
     * @cjs
     */
    _onModified = null;

    /**
     * Called when this wrapper's type info changes (a skin change); set by a UI.
     * @type {Function|null}
     * @cjs
     */
    _onTypeInfoModified = null;

    /**
     * Members discovery found supported.
     * @type {Set}
     * @cjs
     */
    _supported = new Set();

    /**
     * Tr2ExternalParameter bindings by target and attribute, built on first write.
     * @type {Map}
     * @cjs
     */
    _bindings = new Map();

    /**
     * The object's controllers (TnyControllers); built on first use.
     * @type {TnyControllers|null}
     * @cjs
     */
    _controllers = null;

    /**
     * The object's overlays (TnyOverlays); built on first use.
     * @type {TnyOverlays|null}
     * @cjs
     */
    _overlays = null;

    /**
     * The JS constructor is the no-argument one; wrap a live object with `fromWrapped`.
     * @cjs
     */
    constructor()
    {
        super();
        this.id = ++wrapperCount;
    }

    /**
     * The object's world-space bounding sphere, through the native bounds
     * (`UpdateWorldBounds`, `GetBoundingSphere`), or null while it has none.
     * For the host's camera framing.
     *
     * @returns {{centre: number[], radius: number}|null} The sphere.
     * @cjs
     */
    GetBoundingSphere()
    {
        this.wrapped.UpdateWorldBounds();
        const { vec4_0 } = TnySpaceObject.scratch;
        if (!this.wrapped.GetBoundingSphere(vec4_0, 0)) return null;
        return { centre: [ vec4_0[0], vec4_0[1], vec4_0[2] ], radius: vec4_0[3] };
    }

    /**
     * What the object's controllers expose (TnyControllers).
     * @returns {TnyControllers}
     * @cjs
     */
    get controllers()
    {
        return this._controllers ??= new TnyControllers(this);
    }

    /**
     * The object's mesh overlays beyond its core damage ones (TnyOverlays).
     * @returns {TnyOverlays}
     * @cjs
     */
    get overlays()
    {
        return this._overlays ??= new TnyOverlays(this);
    }

    /**
     * Every declared value; null where the object does not support it.
     *
     * @param {object} [options] Graph get options; `full` is the default.
     * @returns {object} The values.
     * @cjs
     */
    GetValues(options)
    {
        return super.GetValues({ full: true, ...options });
    }

    /**
     * Discovers what the object supports and takes its current values. Hull
     * facts are found once here; a skin change runs it again.
     *
     * @param {string|null} dna The DNA it was built from.
     * @cjs
     */
    _Discover(dna)
    {
        const object = this.wrapped;
        this._supported.clear();
        const take = (member, value) =>
        {
            this._supported.add(member);
            this[member] = value;
        };

        take("name", object.name ?? "");
        take("age", 0);
        take("activationStrength", object.activationStrength);
        take("cloak", false);
        // Every hull has the core damage overlays; an object without an impact overlay has none.
        if (object.impactOverlay)
        {
            for (const member of [ "shield", "armor", "hull" ]) take(member, 1);
            for (const member of ANIMATIONS) take(member, false);
        }
        this.identity = this._Identity(dna);
    }

    /**
     * What the object is, from its DNA through the SOF's own parser; SDE facts
     * (typeID, typeName, graphicID) stay null until a service supplies them.
     * @param {string|null} dna SOF DNA, or null when unknown.
     * @returns {TnySpaceObjectIdentity}
     * @cjs
     */
    _Identity(dna)
    {
        const identity = new this.constructor.identityClass();
        if (!dna) return identity;
        identity.dna = dna;
        // A library started without a SOF cannot parse DNA; the rest stays unknown.
        if (!blue.sof) return identity;
        const parsed = new EveSOFDNA();
        parsed.Setup(dna, blue.sof.dataMgr);
        if (parsed.IsValid())
        {
            identity.hull = parsed.GetHullNames()[0] ?? null;
            identity.faction = parsed.GetFactionName() || null;
            identity.race = parsed.GetRaceName() || null;
        }
        return identity;
    }

    /**
     * A member changed (SetValues, UpdateValues): ignore it when unsupported,
     * clamp it to its range, push it down to the native owner, then tell the UI.
     *
     * @param {string} name The member.
     * @returns {boolean} True.
     * @cjs
     */
    OnModified(name)
    {
        if (!this._supported.has(name))
        {
            this[name] = null;
            return true;
        }
        const range = this.constructor.ranges[name];
        if (range && typeof this[name] === "number") this[name] = Math.min(range[1], Math.max(range[0], this[name]));
        this._Push(name);
        if (this._onModified) this._onModified(name);
        return true;
    }

    /**
     * Writes one supported member to its native owner.
     * @param {string} name Member or registration name.
     * @cjs
     */
    _Push(name)
    {
        const object = this.wrapped;
        switch (name)
        {
            case "name": object.name = this.name; return;
            case "activationStrength": this._Bind(object, name).SetValue(this[name]); return;
            case "age": this._Bind(object, "dirtLevel").SetValue(dirtLevelFromWeeks(this.age)); return;
            case "shield": case "armor": case "hull":
                object.SetImpactDamageState(this.shield, this.armor, this.hull, true);
                return;
            case "cloak": this._SetCloak(this.cloak); return;
            default:
                if (ANIMATIONS.includes(name)) object.SetImpactAnimation(name, this[name], TnySpaceObject.animationDuration);
        }
    }

    /**
     * Adds or removes the cloak overlay; a load failure is logged and the value restored.
     * @param {boolean} on Whether the cloak overlay should be present.
     * @cjs
     */
    _SetCloak(on)
    {
        const path = this._CloakPath();
        const change = on ? (this.overlays.Has(path) ? Promise.resolve() : this.overlays.Add(path)) : Promise.resolve(this.overlays.Remove(path));
        change.catch(error =>
        {
            console.error(`${CjsSchema.getClassName(this.constructor)} cloak failed`, error);
            this.cloak = false;
            if (this._onModified) this._onModified("cloak");
        });
    }

    /**
     * The cloak overlay for this hull: skinned when its opaque areas use skinned shaders, as Graphene picks.
     * @returns {string}
     * @cjs
     */
    _CloakPath()
    {
        const skinned = this.wrapped.mesh?.opaqueAreas.some(area => /skinned/i.test(area.effect?.effectFilePath ?? "")) ?? false;
        return `res:/fisfx/cloaking/${skinned ? "cloaking_skinned" : "cloaking"}.black`;
    }

    /**
     * A Carbon Tr2ExternalParameter on one member, whose SetValue converts and
     * notifies the owner (Tr2ExternalParameter.cpp:137-163), as Graphene's
     * editor writes these members.
     * @param {object|null} target Target consumed by the operation; null clears it where supported.
     * @param {string} attribute Exposed destination attribute name.
     * @returns {Tr2ExternalParameter}
     * @cjs
     */
    _Bind(target, attribute)
    {
        let byAttribute = this._bindings.get(target);
        if (!byAttribute) this._bindings.set(target, byAttribute = new Map());
        let binding = byAttribute.get(attribute);
        if (!binding)
        {
            binding = new Tr2ExternalParameter();
            binding.SetName(attribute);
            binding.SetDestinationObject(target);
            binding.SetDestinationAttribute(attribute);
            byAttribute.set(attribute, binding);
        }
        return binding;
    }

    /**
     * Carbon's GetTypeInfo shape (blueexposure/TypeInfo.cpp:70-195), made up by
     * this wrapper for this instance: never the native class's. The class name
     * carries the wrapper's id so nothing caches one object's answer as a
     * class's. Interfaces are the Tny layers and capabilities it has; members
     * only what it supports; methods only the actions that work on it.
     *
     * @returns {Array<object>} `[classInfo, interfaces, members, methods]`.
     * @cjs
     */
    GetTypeInfo()
    {
        const className = CjsSchema.getClassName(this.constructor);
        const classInfo = { module: "tny", classname: `${className}_${this.id}`, description: this._Description(), autovar: 0, signatures: {} };
        const interfaces = {};
        for (const name of this._Interfaces()) interfaces[name] = 0;
        const members = {};
        for (const member of CjsSchema.getSchema(this.constructor).members)
        {
            if (this[member.key] === null && member.key !== "identity") continue;
            const range = this.constructor.ranges[member.key];
            members[member.name] = { type: member.type?.kind ?? member.type, iid_name: "", iid_ver: 0, description: "",
                editflags: EditFlags(member.edit), min: range ? range[0] : null, max: range ? range[1] : null,
                choosers: this._Choices(member.key) };
        }
        return [ classInfo, interfaces, members, this._Methods() ];
    }

    /**
     * The Tny layers and capabilities this instance has.
     * @returns {string[]}
     * @cjs
     */
    _Interfaces()
    {
        return CjsSchema.getClassNames(this.constructor).filter(name => name.startsWith("Tny")).reverse();
    }

    /**
     * The actions that work on this instance, with signatures: Destruct, and
     * Trigger with the content's actions (TnyControllers.GetActions).
     * @returns {object}
     * @cjs
     */
    _Methods()
    {
        const actions = this.controllers.GetActions().map(action => action.name);
        return { Destruct: "()", ...(actions.length ? { Trigger: `(action: ${actions.join("|")})` } : {}) };
    }

    /**
     * Runs one of the content's actions (a controller event, or a trigger
     * variable the content resets): TnyControllers.Trigger.
     *
     * @param {string} action The action's name.
     * @returns {boolean} Whether it was an action.
     * @cjs
     */
    Trigger(action)
    {
        return this.controllers.Trigger(action);
    }

    /**
     * Reads back what the content changes by itself and announces it; the space object has nothing to read.
     * @cjs
     */
    Sync()
    {
    }

    /**
     * A member's choices, `[[value, name], ...]`, or null.
     * @param {string} _name Member name reserved for subclass choices.
     * @returns {Array|null}
     * @cjs
     */
    _Choices(_name)
    {
        return null;
    }

    /**
     * A one-line description for the type info.
     * @returns {string}
     * @cjs
     */
    _Description()
    {
        return this.identity?.dna ?? "";
    }

    /**
     * Detaches the UI and this wrapper; the native object is the library's.
     * @cjs
     * @param {object} [options] What Destruct was given.
     * @returns {boolean} What the parent's OnDestruct answers.
     */
    OnDestruct(options)
    {
        this._onModified = null;
        this._onTypeInfoModified = null;
        return super.OnDestruct(options);
    }

    /**
     * Acquires a fresh object through the library and wraps it in this class.
     * The library owns DNA hydration and the resource wait.
     *
     * @param {object} options What to fetch.
     * @param {string} [options.dna] DNA; give this or `resPath`.
     * @param {string} [options.resPath] Object resource path; give this or `dna`.
     * @param {boolean} [options.awaitResources=false] Resolve once the object's resources have loaded.
     * @param {string} [options.name] The user's name for it.
     * @returns {Promise<TnySpaceObject>} An instance of the class it was called on.
     * @cjs
     */
    static async fetch(options = {})
    {
        return this.fromWrapped(await TnySpaceObject.acquire(options), options);
    }

    /**
     * Wraps a live object: starts its controllers once and discovers what it supports.
     *
     * @param {object} object The live object.
     * @param {{name?: string|null, dna?: string|null}} [options] Fetch options.
     * @returns {TnySpaceObject} The wrapper.
     * @throws {TypeError} When the object is not this class's native class.
     * @cjs
     */
    static fromWrapped(object, { name = null, dna = null } = {})
    {
        const className = CjsSchema.getClassName(this);
        if (!CjsSchema.cast(object, this.wrappedClass))
            throw new TypeError(`${className} requires a live ${CjsSchema.getClassName(this.wrappedClass)}.`);
        const wrapper = new this();
        wrapper.wrapped = object;
        object.StartControllers();
        wrapper._Discover(dna);
        if (name !== null)
        {
            wrapper.name = name;
            wrapper.OnModified("name");
        }
        return wrapper;
    }

    /**
     * Validates fetch options and acquires the object through the library.
     *
     * @param {object} options See `fetch`.
     * @returns {Promise<object|null>} The live object.
     * @cjs
     */
    static async acquire({ dna = null, resPath = null, awaitResources = false, name = null, ...unknown } = {})
    {
        const className = CjsSchema.getClassName(this);
        const library = CjsLibrary.instance;
        if (!library) throw new Error(`${className} requires an initialized CjsLibrary.`);
        const extra = Object.keys(unknown);
        if (extra.length) throw new TypeError(`${className}.fetch does not take ${extra.join(", ")}.`);
        const source = dna ?? resPath;
        if (typeof source !== "string" || !source || (dna !== null && resPath !== null))
            throw new TypeError(`${className} requires DNA or an object path.`);
        if (name !== null && typeof name !== "string") throw new TypeError(`${className} name must be a string.`);
        return library.Fetch(source, { awaitResources });
    }

    /**
     * The native class this wrapper borrows.
     * @type {Function}
     * @cjs
     */
    static wrappedClass = EveSpaceObject2;

    /**
     * Reusable synchronous math scratch; callers must not retain its values.
     * @type {object}
     * @cjs
     */
    static scratch = { vec4_0: vec4.create() };

    /**
     * The identity class this layer fills in.
     * @type {Function}
     * @cjs
     */
    static identityClass = TnySpaceObjectIdentity;

    /**
     * Numeric ranges for the type info; a write is clamped to them. Graphene's editor limits: age in weeks 0-260.
     * @type {object}
     * @cjs
     */
    static ranges = { age: [ 0, 260 ], activationStrength: [ 0, 1 ], shield: [ 0, 1 ], armor: [ 0, 1 ], hull: [ 0, 1 ] };

    /**
     * Seconds a module animation fades over (a quarter of it); Graphene's demo value.
     * @type {number}
     * @cjs
     */
    static animationDuration = 4;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnySpaceObject";

}

CjsBlueGraph.define(TnySpaceObject, "TnySpaceObject");
