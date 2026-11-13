import { CjsSchema, meta, type } from "#schema";
import { ICjsGraphRoot } from "../global/model/graph/ICjsGraphRoot.js";
import { INotify } from "../blue/exposure/INotify.js";
import { CjsBlueGraph } from "../blue/formats/graph/CjsBlueGraph.js";
import { CjsLibrary } from "../core/CjsLibrary.js";
import { EveSpaceScene } from "../trinity/eve/scene/EveSpaceScene.js";
import { TnySpaceObject } from "./objects/TnySpaceObject.js";
import { TnyMobile } from "./objects/TnyMobile.js";
import { TnyShip } from "./objects/TnyShip.js";
import { TnyStationary } from "./objects/TnyStationary.js";
import { Tr2PostProcess2 } from "../trinity/postProcess/Tr2PostProcess2.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../trinity/core/context/Tr2RenderContext.js";

/**
 * Application wrapper over an existing space scene: its membership, post
 * process and values. A graph class like the object wrappers: `GetValues`,
 * `SetValues`, `GetTypeInfo`, and `_onModified(name)` after a change.
 * @cjs
 */
@meta.define({ className: "TnyScene" })
@meta.exposureChainTo(ICjsGraphRoot)
@meta.mapInterface(INotify)
export class TnyScene extends ICjsGraphRoot
{

    /**
     * EveSpaceScene.ballpark (IEveBallpark): the scene shifts its origin by
     * the ballpark's reference point each frame (EveUpdateContext.UpdateOrigin),
     * so the world moves past the ego ball. Null when unset; the host owns the
     * park (the runtime never imports Destiny).
     * @type {object|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READWRITE | meta.NOTIFY)
    @type.object.ref("IEveBallpark")
    ballpark = null;

    /**
     * The scene's default post process's Tr2PostProcess2.sharpeningStrength,
     * 0 to 1 (Graphene's range): the CAS strength after tonemapping, off at
     * 0 (Carbon HEAD 2276880b, Tr2PostProcessRenderer.useSharpeningStrength).
     * Null when the scene has no post process, or the backend has no compute
     * (the renderer skips CAS there); the type info says which.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READWRITE | meta.NOTIFY)
    @type.float32
    sharpeningStrength = null;

    /**
     * Existing scene graph; native lists retain their own admission and notifications.
     * @type {EveSpaceScene|null}
     * @cjs
     */
    wrapped = null;

    /**
     * Why each unsupported value is unavailable, by name; absent when it is available.
     * @type {Map}
     * @cjs
     */
    _unavailable = new Map();

    /**
     * The UI's change handler, called with a member's name; null when none.
     * @type {Function|null}
     * @cjs
     */
    _onModified = null;

    /**
     * The UI's type-info change handler; null when none.
     * @type {Function|null}
     * @cjs
     */
    _onTypeInfoModified = null;

    /**
     * The wrappers added through AddObject.
     * @type {Array}
     * @cjs
     */
    _objects = [];

    /**
     * The template SetPostProcess loaded, or null while the authored one is in use.
     * @type {object|null}
     * @cjs
     */
    postProcessPath = null;

    /**
     * The post process captured on the first SetPostProcess call; null is a valid authored value.
     * @type {object|null}
     * @cjs
     */
    _authoredPostProcess = null;

    /**
     * Whether SetPostProcess has captured the authored value.
     * @type {boolean}
     * @cjs
     */
    _hasAuthoredPostProcess = false;

    /**
     * Every declared value; null where unset. The ballpark is the host's own
     * object, not graph data, so it comes back as itself (the graph's
     * copyOverride, Carbon's Copier m_override), and SetValues keeps it so.
     * @param {object} options Options for this operation.
     * @returns {object}
     * @cjs
     */
    GetValues(options)
    {
        return super.GetValues({ full: true, copyOverride: object => object === this.ballpark ? object : undefined, ...options });
    }

    /**
     * Carbon's type info shape for this scene: class `TnyScene`, its Tny layers
     * as interfaces, and its members.
     *
     * @returns {Array<object>} `[classInfo, interfaces, members, methods]`.
     * @cjs
     */
    GetTypeInfo()
    {
        const className = CjsSchema.getClassName(this.constructor);
        const classInfo = { module: "tny", classname: className, description: "", autovar: 0, signatures: {} };
        const interfaces = Object.fromEntries(CjsSchema.getClassNames(this.constructor).filter(name => name.startsWith("Tny")).reverse().map(name => [ name, 0 ]));
        const members = {};
        for (const member of CjsSchema.getSchema(this.constructor).members)
        {
            const range = this.constructor.ranges[member.key], reason = this._unavailable.get(member.key) ?? null;
            members[member.name] = { type: member.type?.kind ?? member.type, iid_name: "", iid_ver: 0, description: "",
                editflags: meta.READWRITE | meta.NOTIFY, min: range ? range[0] : null, max: range ? range[1] : null, choosers: null,
                available: reason === null, reason };
        }
        return [ classInfo, interfaces, members, {} ];
    }

    /**
     * A value changed: ignore it when unavailable, clamp it, push it to the scene, then tell the UI.
     * @param {string} name Member or registration name.
     * @returns {boolean}
     * @cjs
     */
    OnModified(name)
    {
        if (this._unavailable.has(name))
        {
            this[name] = null;
            return true;
        }
        const range = this.constructor.ranges[name];
        if (range && typeof this[name] === "number") this[name] = Math.min(range[1], Math.max(range[0], this[name]));
        if (name === "ballpark") this.wrapped.ballpark = this.ballpark;
        else if (name === "sharpeningStrength") this.wrapped.postprocess.sharpeningStrength = this.sharpeningStrength;
        if (this._onModified) this._onModified(name);
        return true;
    }

    /**
     * Takes the post process's sharpening, or says why there is none.
     * @cjs
     */
    _DiscoverPost()
    {
        const al = Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL();
        this._unavailable.delete("sharpeningStrength");
        if (!al || al.GetCaps().SUPPORTS_COMPUTE === false) this._unavailable.set("sharpeningStrength", "The backend has no compute; the renderer skips sharpening.");
        else if (!this.wrapped.postprocess) this._unavailable.set("sharpeningStrength", "The scene has no post process.");
        this.sharpeningStrength = this._unavailable.has("sharpeningStrength") ? null : this.wrapped.postprocess.sharpeningStrength;
    }

    /**
     * Acquires a space object, wraps it in the most specific wrapper, starts
     * its controllers and adds it to this scene.
     *
     * @param {object} options `TnySpaceObject.fetch` options: `dna` or `resPath`, `awaitResources`, `name`.
     * @returns {Promise<TnySpaceObject>} The wrapper, now in this scene.
     * @throws {TypeError} When the object is no space object.
     * @cjs
     */
    async Fetch(options = {})
    {
        const object = await TnySpaceObject.acquire(options);
        const Wrapper = TnyScene.wrappers.find(Candidate => CjsSchema.cast(object, Candidate.wrappedClass));
        if (!Wrapper) throw new TypeError("TnyScene.Fetch requires a live EveSpaceObject2.");
        const wrapper = Wrapper.fromWrapped(object, options);
        this.AddObject(wrapper);
        return wrapper;
    }

    /**
     * Adds a space object through the native scene list, once. The scene owns registration.
     * @param {TnySpaceObject} object Object to add.
     * @returns {boolean} True when newly added; false when already present.
     * @cjs
     */
    AddObject(object)
    {
        this._ValidateObject(object);
        const objects = this.wrapped.objects;
        if (objects.indexOf(object.wrapped) !== -1) return false;
        if (!objects.Append(object.wrapped)) throw new TypeError("The scene rejected the object.");
        this._objects.push(object);
        return true;
    }

    /**
     * Removes membership without destroying the object or its resources.
     * @param {TnySpaceObject} object Object to remove.
     * @returns {boolean} Whether the ship was present and removed.
     * @cjs
     */
    RemoveObject(object)
    {
        this._ValidateObject(object);
        const objects = this.wrapped.objects;
        const index = objects.indexOf(object.wrapped);
        // BlueList.Remove(-1) clears the list, so absence must never reach it.
        if (index === -1 || !objects.Remove(index)) return false;
        this._objects.splice(this._objects.indexOf(object), 1);
        return true;
    }

    /**
     * The scene's default post process (Carbon's m_sceneDefaultPostProcess)
     * from a shipped environment template, replacing the authored one; null
     * restores the authored one. The scene merges it with any post-process
     * volumes itself.
     *
     * @param {string|null} source A template name under
     *   `res:/dx9/postprocess/environmenttemplate/`, a resource path, or null.
     * @returns {Promise<string|null>} The path now in use, or null for the authored one.
     * @cjs
     */
    async SetPostProcess(source)
    {
        if (!this._hasAuthoredPostProcess)
        {
            this._authoredPostProcess = this.wrapped.postprocess;
            this._hasAuthoredPostProcess = true;
        }
        if (source === null)
        {
            this.wrapped.postprocess = this._authoredPostProcess;
            this.postProcessPath = null;
            this._PostChanged();
            return null;
        }
        if (typeof source !== "string" || !source) throw new TypeError("TnyScene.SetPostProcess requires a template name, a path or null.");

        const library = CjsLibrary.instance;
        if (!library) throw new Error("TnyScene requires an initialized CjsLibrary.");
        const path = source.includes("/") ? source : `${TnyScene.postProcessTemplates}${source}.black`;
        const postProcess = await library.Fetch(path);
        if (!CjsSchema.cast(postProcess, Tr2PostProcess2)) throw new TypeError(`${path} is not a Tr2PostProcess2.`);
        this.wrapped.postprocess = postProcess;
        this.postProcessPath = path;
        this._PostChanged();
        return path;
    }

    /**
     * Another post process is in use: its sharpening is the value now; the UI hears of it.
     * @cjs
     */
    _PostChanged()
    {
        this._DiscoverPost();
        if (this._onTypeInfoModified) this._onTypeInfoModified();
        if (this._onModified) this._onModified("sharpeningStrength");
    }

    /**
     * Lets each wrapper read back what the content changed by itself this frame (TnySpaceObject.Sync).
     * @cjs
     */
    Sync()
    {
        for (let i = 0; i < this._objects.length; i++) this._objects[i].Sync();
    }

    /**
     * @returns {TnySpaceObject[]} The wrappers this scene added, in order.
     * @cjs
     */
    GetObjects()
    {
        return this._objects.slice();
    }

    /**
     * Rejects incompatible wrappers before mutating the native list.
     * @param {TnySpaceObject} object Wrapper to validate before changing scene membership.
     * @cjs
     */
    _ValidateObject(object)
    {
        if (!CjsSchema.cast(object, TnySpaceObject))
            throw new TypeError("TnyScene requires a TnySpaceObject.");
    }

    /**
     * Acquires an authored space scene, preserving acquisition and type failures.
     * @param {string} path Scene resource path.
     * @param {object} [options={}] Passed unchanged to the library.
     * @returns {Promise<TnyScene>} Wrapper over the acquired scene.
     * @cjs
     */
    static async fetch(path, options = {})
    {
        const library = CjsLibrary.instance;
        if (!library) throw new Error("TnyScene requires an initialized CjsLibrary.");
        if (typeof path !== "string" || !path) throw new TypeError("TnyScene requires a scene resource path.");
        return TnyScene.fromWrapped(await library.Fetch(path, options));
    }

    /**
     * Adapts an existing space scene without acquiring or initializing it again.
     * @param {EveSpaceScene} scene Borrowed native scene.
     * @returns {TnyScene}
     * @cjs
     */
    static fromWrapped(scene)
    {
        if (!CjsSchema.cast(scene, EveSpaceScene)) throw new TypeError("TnyScene requires a live EveSpaceScene.");
        const wrapper = new this();
        wrapper.wrapped = scene;
        wrapper.ballpark = scene.ballpark;
        wrapper._DiscoverPost();
        return wrapper;
    }

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyScene";

    /**
     * Numeric ranges for the type info; a write is clamped to them.
     * @type {object}
     * @cjs
     */
    static ranges = { sharpeningStrength: [ 0, 1 ] };

    /**
     * The wrapper classes `Fetch` chooses from, most specific first: the first
     * whose native class the object is wins (ccpwgl's TnyScene.EVE_CLASS).
     * @type {Array}
     * @cjs
     */
    static wrappers = [ TnyShip, TnyMobile, TnyStationary, TnySpaceObject ];

    /**
     * Where shipped environment post-process templates live.
     * @type {string}
     * @cjs
     */
    static postProcessTemplates = "res:/dx9/postprocess/environmenttemplate/";

}

CjsBlueGraph.define(TnyScene, "TnyScene");
