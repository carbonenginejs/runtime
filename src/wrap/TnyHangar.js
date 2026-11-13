import { parseEnumValues } from "#utils/text";
import { CjsSchema, meta } from "#schema";
import { CjsBlueGraph } from "../blue/formats/graph/CjsBlueGraph.js";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { mat4 } from "#math/mat4";
import { CjsLibrary } from "../core/CjsLibrary.js";
import { EveSpaceScene } from "../trinity/eve/scene/EveSpaceScene.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../trinity/core/context/Tr2RenderContext.js";
import { Tr2CurveCombiner } from "../trinity/curves/curve/Tr2CurveCombiner.js";
import { Tr2TranslationAdapter } from "../trinity/curves/curve/Tr2TranslationAdapter.js";
import { Tr2CurveConstant } from "../trinity/curves/curve/Tr2CurveConstant.js";
import { TnyScene } from "./TnyScene.js";
import { TnySpaceObject } from "./objects/TnySpaceObject.js";
import { TnyStationary } from "./objects/TnyStationary.js";
import { TnyShip } from "./objects/TnyShip.js";
import { TnyControllers } from "./objects/TnyControllers.js";

/** Bay placements in a layout-built hangar, by size (the SOF layout placement names). */
const BAY_PLACEMENTS = { small: "small_dock_ships", medium: "medium_dock_ships" };

/** The docker's docking-machine states in which the ship has landed. */
const DOCKED_STATES = new Set([ "docked", "docked_after_skinChange" ]);

/** The docker's states between an undock starting and the ship landing again (docked excluded). */
const UNDOCK_STATES = new Set([ "InitalizeUndock", "Short_Wait", "docked_2_undocked", "undock_cancelled_ships_with_Roll",
    "undock_cancelled_ships_NonRoll", "undock_cancelled_NonRollShip" ]);

/** How a ship enters a bay. */
const ENTRIES = [ "docked", "dock", "appear" ];

/**
 * A station hangar: a TnyScene holding one hangar object, its ship positions
 * ("bays") and the ships in them. Ours, with no Carbon counterpart: the EVE
 * client places ships in hangars in its own code. Everything it drives is
 * content: the hangar's SOF build, the docker multi-effect and
 * `me_generic_hangar_vfx_01a`.
 *
 * Three kinds of hangar, told apart by what the built hangar holds:
 * - layout-built (Upwell, Deathless): one bay per SOF layout placement named
 *   `small_dock_ships` or `medium_dock_ships`; a docker per ship flies it in
 *   and out, dissolves it (`materialize`) and fades it in (`skinChange`);
 * - capital (`mgenh_ch01`): one bay at the hull's `ship_placement` locator,
 *   with the docker;
 * - every other hangar (racial, AIR, the older generic ones): one bay at the
 *   origin; `me_generic_hangar_vfx_01a` animates the ship.
 * @cjs
 */
@meta.define({ className: "TnyHangar" })
@meta.exposureChainTo(TnyScene)
export class TnyHangar extends TnyScene
{

    /**
     * The hangar object (TnyStationary).
     * @type {TnyStationary|null}
     * @cjs
     */
    hangar = null;

    /**
     * "layout", "capital" or "origin": how ships are placed, from what the hangar holds.
     * @type {"layout"|"capital"|"origin"|null}
     * @cjs
     */
    kind = null;

    /**
     * The bay the last SetShip filled, the one Undock() leaves; null before.
     * @type {number|null}
     * @cjs
     */
    active = null;

    /**
     * Bay records, by index.
     * @type {Array}
     * @cjs
     */
    _bays = [];

    /**
     * Timers that remove dissolved ships.
     * @type {Set}
     * @cjs
     */
    _timers = new Set();

    /**
     * The controllers view, made on first use.
     * @type {TnyControllers|null}
     * @cjs
     */
    _controllers = null;

    /**
     * The bays, as data.
     *
     * @returns {{index: number, size: string, occupied: boolean, position: number[], camera: number[]|null}[]}
     *   `size` is "small", "medium", "capital" or "any".
     * @cjs
     */
    GetBays()
    {
        return this._bays.map(bay => ({ index: bay.index, size: bay.size, occupied: !!bay.ship,
            position: Array.from(bay.position), camera: bay.camera ? Array.from(bay.camera) : null }));
    }

    /**
     * The ship in a bay.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {TnyShip|null} The ship, or null.
     * @cjs
     */
    GetShip(bay = this.active)
    {
        return this._bays[bay]?.ship ?? null;
    }

    /**
     * Where the camera looks at a bay from, in world space: the bay's
     * `*_dock_camera_transition_points` locator, or the capital hangar's
     * `camera_locations`. For `Tny.Focus(ship, { from })`.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {number[]|null} The point, or null when the hangar has none.
     * @cjs
     */
    GetCameraPoint(bay = this.active)
    {
        const camera = this._bays[bay]?.camera;
        return camera ? Array.from(camera) : null;
    }

    /**
     * Puts a ship in a bay. A ship already in that bay dissolves out
     * (`materialize` 0) while the new one comes in, and leaves the scene once
     * its dissolve has run.
     *
     * @param {TnyShip|string} ship A ship, or DNA to fetch one.
     * @param {object} [options]
     * @param {number} [options.bay] The bay; omitted, one chosen by the ship's size (ours, see smallShipRadius).
     * @param {"docked"|"dock"|"appear"} [options.entry="docked"] Already there, flying in, or fading in.
     *   A hangar without a docker has no fade; "appear" is "docked" there.
     * @returns {Promise<TnyShip>} The ship, now in this scene.
     * @cjs
     */
    async SetShip(ship, { bay = undefined, entry = "docked" } = {})
    {
        if (!ENTRIES.includes(entry)) throw new RangeError(`TnyHangar entry must be one of ${ENTRIES.join(", ")}.`);
        if (bay !== undefined && !this._bays[bay]) throw new RangeError(`TnyHangar has no bay ${bay}.`);
        const wrapper = typeof ship === "string" ? await this.Fetch({ dna: ship }) : ship;
        if (!CjsSchema.cast(wrapper, TnyShip)) throw new TypeError("TnyHangar.SetShip requires a TnyShip or ship DNA.");
        this.AddObject(wrapper);

        const current = this._bays.find(record => record.ship === wrapper);
        if (current) this._Release(current, false);
        const target = this._bays[bay ?? this._ChooseBay(wrapper)];
        if (target.ship) this._Release(target, true);
        await this._Seat(target, wrapper, entry);
        this.active = target.index;
        return wrapper;
    }

    /**
     * Undocks a bay's ship, as the client drives it (FOUND: the docker never
     * touches the hangar; its docking_hangar parameter is unused):
     * - the docker's `docked` to 0 flies the ship out, and the content always
     *   runs undock_cancelled and docks it again (the hangar view never leaves);
     * - the hangar's own `Undock` trigger (Hangar_Controller on every hangar,
     *   and the racial audio controllers) plays its undock effects and resets;
     * - `Docking_State` 2 (undocking) where the hangar has one (AIR, Jita),
     *   back to 1 (docked) when the docker lands the ship again (Sync).
     * The docker only leaves its docked state, so an undock asked while the
     * ship is still docking waits until it has landed.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {boolean} Whether a ship was there to undock.
     * @cjs
     */
    Undock(bay = this.active)
    {
        const record = this._bays[bay];
        if (!record?.ship) return false;
        if (this.kind !== "origin" && !DOCKED_STATES.has(this._DockerState(record)))
        {
            record.undockPending = true;
            return true;
        }
        this._StartUndock(record);
        return true;
    }

    /**
     * Sends the undock to the docker and the hangar's own controllers.
     * @param {object} record Mutable bay record.
     * @cjs
     */
    _StartUndock(record)
    {
        record.undockPending = false;
        if (record.effect && this.kind !== "origin") record.effect.SetControllerVariable("docked", 0);
        const hangar = this.hangar.wrapped;
        hangar.SetControllerVariable("Undock", 1);
        if (this.hangar.controllers.GetVariable("Docking_State") !== null) hangar.SetControllerVariable("Docking_State", 2);
        record.undocking = true;
        record.leftDock = false;
    }

    /**
     * The state of the hangar's own Undock machine (Hangar_Controller), or null without one.
     * @returns {string|null}
     * @cjs
     */
    _HangarUndockState()
    {
        // Jita's CH_Jita_DockingController also names a machine Undock; the hangar's own is the one with the Undock variable.
        for (const controller of this.hangar.controllers._Controllers())
        {
            if (!controller.GetVariableByName("Undock")) continue;
            const machine = controller.stateMachines.find(each => each.name === "Undock");
            if (machine) return machine.GetCurrentState()?.name ?? null;
        }
        return null;
    }

    /**
     * The docker's docking machine state for a bay, or null without one.
     * @param {object} record Mutable bay record.
     * @returns {string|null}
     * @cjs
     */
    _DockerState(record)
    {
        const docker = record.effect ? record.effect.controllers.find(controller => controller.name === "docker") : null;
        const machine = docker ? docker.stateMachines.find(each => each.name === "docking") : null;
        const state = machine ? machine.GetCurrentState() : null;
        return state ? state.name : null;
    }

    /**
     * A bay's docking phase, for a UI to enable and highlight its controls:
     * "empty", "docking" (flying in or settling), "docked", or "undocking"
     * (an undock asked for or under way, until the ship has landed again);
     * with whether Undock and CancelUndock would act now.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {{phase: string, canUndock: boolean, canCancelUndock: boolean}} The phase.
     * @cjs
     */
    GetBayState(bay = this.active)
    {
        const record = this._bays[bay];
        if (!record?.ship) return { phase: "empty", canUndock: false, canCancelUndock: false };
        if (this.kind === "origin") return { phase: record.undocking ? "undocking" : "docked", canUndock: !record.undocking, canCancelUndock: false };
        const state = this._DockerState(record);
        const phase = record.undockPending || record.undocking ? "undocking" : DOCKED_STATES.has(state) ? "docked" : "docking";
        return { phase, canUndock: phase === "docked", canCancelUndock: this.CanCancelUndock(bay) };
    }

    /**
     * Each frame: applies an undock that waited for the ship to land, ends an
     * undock once the docker has docked the ship again (Docking_State back to
     * 1), and announces "bays" when any bay's phase changed.
     * @cjs
     */
    Sync()
    {
        super.Sync();
        let changed = false;
        for (let i = 0; i < this._bays.length; i++)
        {
            const record = this._bays[i];
            const state = record.ship ? this._DockerState(record) : null;
            if (record.undockPending && DOCKED_STATES.has(state)) this._StartUndock(record);
            if (record.undocking && UNDOCK_STATES.has(state)) record.leftDock = true;
            if (record.undocking && this.kind !== "origin" && record.leftDock && DOCKED_STATES.has(state))
            {
                record.undocking = record.leftDock = false;
                if (this.hangar.controllers.GetVariable("Docking_State") !== null) this.hangar.wrapped.SetControllerVariable("Docking_State", 1);
            }
            // Without a docker the hangar's own Undock machine is the undock: it resets the
            // variable on entering Undocking and leaves that state once its effect has played.
            if (record.undocking && this.kind === "origin")
            {
                const undocking = this._HangarUndockState() === "Undocking";
                if (undocking) record.leftDock = true;
                else if (record.leftDock)
                {
                    record.undocking = record.leftDock = false;
                    if (this.hangar.controllers.GetVariable("Docking_State") !== null) this.hangar.wrapped.SetControllerVariable("Docking_State", 1);
                }
            }
            const key = JSON.stringify(this.GetBayState(record.index));
            if (key !== record.lastState)
            {
                record.lastState = key;
                changed = true;
            }
        }
        if (changed && this._onModified) this._onModified("bays");
    }

    /**
     * Cancels an undock, by the docker's authored path: while the docking
     * machine is in InitalizeUndock (the init_undock range), docked back to 1
     * takes InitalizeUndock_2_docked and the ship settles again. Once past it
     * (Short_Wait, docked_2_undocked) the content itself always runs
     * undock_cancelled and docks again; there is nothing to drive. An undock
     * still waiting for the ship to land is simply dropped.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {boolean} Whether an undock was cancelled.
     * @cjs
     */
    CancelUndock(bay = this.active)
    {
        const record = this._bays[bay];
        if (record?.undockPending)
        {
            record.undockPending = false;
            return true;
        }
        if (!this.CanCancelUndock(bay)) return false;
        record.effect.SetControllerVariable("docked", 1);
        return true;
    }

    /**
     * Whether CancelUndock would act: an undock waits for the ship to land,
     * or the bay's docker is in InitalizeUndock.
     *
     * @param {number} [bay=this.active] The bay.
     * @returns {boolean} Whether its undock can still be cancelled.
     * @cjs
     */
    CanCancelUndock(bay = this.active)
    {
        const record = this._bays[bay];
        if (!record?.effect || this.kind === "origin") return false;
        return record.undockPending || this._DockerState(record) === "InitalizeUndock";
    }

    /**
     * The hangar's actions, for the type info: CancelUndock only while it can act.
     * @returns {object[]}
     * @cjs
     */
    GetTypeInfo()
    {
        const info = super.GetTypeInfo();
        info[3] = { SetShip: "(ship, { bay, entry })", Undock: "(bay)", ...(this.CanCancelUndock() ? { CancelUndock: "(bay)" } : {}) };
        return info;
    }

    /**
     * The hangar's controllers (its own, its overlays' and container
     * children's, such as a `*_docking_ctrl`) and those of the effects
     * driving its ships (the docker; me_generic with `HangarType`).
     *
     * @returns {TnyControllers} The controllers.
     * @cjs
     */
    get controllers()
    {
        return this._controllers ??= new TnyControllers(this.hangar, () => this._bays.filter(bay => bay.effect).map(bay => bay.effect));
    }

    /**
     * Removes the hangar's effects and timers; the ships and the hangar stay in the scene.
     * @cjs
     * @param {object} [options] What Destruct was given.
     * @returns {boolean} What the parent's OnDestruct answers.
     */
    OnDestruct(options)
    {
        for (const timer of this._timers) clearTimeout(timer);
        this._timers.clear();
        for (const bay of this._bays) if (bay.ship) this._Release(bay, false);
        return super.OnDestruct(options);
    }

    /**
     * Finds the bays from what the built hangar holds.
     * @cjs
     */
    _FindBays()
    {
        const root = this.hangar.wrapped;
        const layouts = root.effectChildren.find(child => child.name === "layouts") ?? null;
        const containers = layouts ? layouts.objects : [];
        const bays = [];
        for (const [ size, placement ] of Object.entries(BAY_PLACEMENTS))
            for (const container of containers)
                if (container.name === placement) bays.push(this._Bay(size, container, container.objects[0]));

        if (bays.length)
        {
            this.kind = "layout";
            this._PairExits(bays, containers);
            this._PairCameras(bays);
        }
        else
        {
            const placement = FindLocator(root.locatorSets, "ship_placement");
            this.kind = placement ? "capital" : "origin";
            const bay = { size: this.kind === "capital" ? "capital" : "any", dock: placement ? root : null,
                position: vec3.create(), rotation: quat.create(), exit: null, camera: null }; // alloc: kept by the bay
            if (placement) vec3.copy(bay.position, placement.position);
            const camera = FindLocator(root.locatorSets, "camera_locations");
            if (camera) bay.camera = vec3.clone(camera.position); // alloc: kept by the bay
            bays.push(this._Place(bay));
        }
        this._bays = bays.map((bay, index) => Object.assign(bay, { index, ship: null, effect: null, saved: null,
            undockPending: false, undocking: false, leftDock: false, lastState: null }));
    }

    /**
     * A layout bay: its transform is its placed hull's; its camera point its own transition locator.
     * @param {string} size Bay size category.
     * @param {object} container Authored placement container.
     * @param {object} hull Placed hull supplying the bay transform.
     * @returns {object}
     * @cjs
     */
    _Bay(size, container, hull)
    {
        // alloc: kept by the bay
        const bay = { size, dock: container, position: vec3.clone(hull.translation), rotation: quat.clone(hull.rotation),
            exit: null, camera: null };
        const camera = FindLocator(hull.ownedLocatorSets, `${size}_dock_camera_transition_points`);
        if (camera)
        {
            bay.camera = vec3.transformQuat(vec3.create(), camera.position, bay.rotation); // alloc: kept by the bay
            vec3.add(bay.camera, bay.camera, bay.position);
        }
        return this._Place(bay);
    }

    /**
     * Moves a bay from hangar space into world space.
     * @param {object} bay Mutable bay record.
     * @returns {object}
     * @cjs
     */
    _Place(bay)
    {
        const world = this.hangar.wrapped.worldTransform;
        const { quat_0 } = TnyHangar.scratch;
        const rotation = mat4.getRotation(quat_0, world);
        vec3.transformMat4(bay.position, bay.position, world);
        quat.multiply(bay.rotation, rotation, bay.rotation);
        if (bay.camera) vec3.transformMat4(bay.camera, bay.camera, world);
        return bay;
    }

    /**
     * Gives each bay its exit point: the parent hulls' `small_dock_exit_points`
     * and `medium_dock_exit_points` sit beside the bay locators, one per bay,
     * paired here by distance (DERIVED; the sets do not share an order). The
     * docker's `docking_cs` `exit_point` takes the bay-local vector to it and
     * its length (TriValueBindings feed them to the undock yaw).
     * @param {object[]} bays Bay records to update.
     * @param {object[]} containers Authored layout containers.
     * @cjs
     */
    _PairExits(bays, containers)
    {
        for (const size of Object.keys(BAY_PLACEMENTS))
        {
            const exits = [];
            for (const hull of containers)
            {
                if (hull.name !== "Hull") continue;
                const set = (hull.ownedLocatorSets ?? []).find(each => each.name === `${size}_dock_exit_points`);
                if (!set) continue;
                for (const locator of set.locators)
                {
                    const point = vec3.transformQuat(vec3.create(), locator.position, hull.rotation); // alloc: one per exit, at load
                    vec3.add(point, point, hull.translation);
                    exits.push(vec3.transformMat4(point, point, this.hangar.wrapped.worldTransform));
                }
            }
            const free = exits.slice();
            for (const bay of bays.filter(each => each.size === size))
            {
                if (!free.length) break;
                let best = 0;
                for (let i = 1; i < free.length; i++)
                    if (vec3.distance(free[i], bay.position) < vec3.distance(free[best], bay.position)) best = i;
                const { vec3_0, quat_0 } = TnyHangar.scratch;
                vec3.subtract(vec3_0, free.splice(best, 1)[0], bay.position);
                vec3.transformQuat(vec3_0, vec3_0, quat.invert(quat_0, bay.rotation));
                bay.exit = [ vec3_0[0], vec3_0[1], vec3_0[2], vec3.length(vec3_0) ];
            }
        }
    }

    /**
     * Deathless and AIR hangars keep `*_dock_camera_transition_points` on the
     * hangar's own hull, several locators per set, rather than one on each
     * bay; a bay without its own takes the nearest (DERIVED pairing).
     * @param {object[]} bays Bay records to update.
     * @cjs
     */
    _PairCameras(bays)
    {
        const root = this.hangar.wrapped;
        for (const bay of bays)
        {
            if (bay.camera) continue;
            const set = (root.locatorSets ?? []).find(each => each.name === `${bay.size}_dock_camera_transition_points`);
            let best = null, distance = Infinity;
            for (const locator of set ? set.locators : [])
            {
                const { vec3_0 } = TnyHangar.scratch;
                vec3.transformMat4(vec3_0, locator.position, root.worldTransform);
                const d = vec3.distance(vec3_0, bay.position);
                if (d < distance)
                {
                    distance = d;
                    best = locator;
                }
            }
            if (best) bay.camera = vec3.transformMat4(vec3.create(), best.position, root.worldTransform); // alloc: kept by the bay
        }
    }

    /**
     * Ours: a free bay of the ship's size class, else any free bay, else the first of its size.
     * @param {TnyShip} ship Ship wrapper being placed.
     * @returns {number}
     * @cjs
     */
    _ChooseBay(ship)
    {
        if (this._bays.length === 1) return 0;
        const radius = ship.GetBoundingSphere()?.radius ?? 0;
        const size = radius < TnyHangar.smallShipRadius ? "small" : "medium";
        const fits = this._bays.filter(bay => bay.size === size);
        const pick = fits.find(bay => !bay.ship) ?? this._bays.find(bay => !bay.ship) ?? fits[0] ?? this._bays[0];
        return pick.index;
    }

    /**
     * Takes over the ship's curves and starts the effect that animates it.
     * Layout and capital bays: the docker writes the ship's
     * `translationCurve.curves[1]` (bay-local) and `modelRotationCurve`; ours
     * is a Tr2CurveCombiner of the bay's position and that offset, which a
     * Tr2TranslationAdapter turns by the bay's rotation (its rotationOffset).
     * Other hangars: me_generic writes `modelTranslationCurve`.
     * @param {object} bay Mutable bay record.
     * @param {TnyShip} ship Ship wrapper being placed.
     * @param {string} entry Entry animation mode.
     * @returns {Promise<void>} Completion of the operation.
     * @cjs
     */
    async _Seat(bay, ship, entry)
    {
        const native = ship.wrapped;
        if (ship._ball) ship.SetBall(null);
        bay.saved = { translationCurve: native.translationCurve, rotationCurve: native.rotationCurve,
            modelRotationCurve: native.modelRotationCurve, modelTranslationCurve: native.modelTranslationCurve };
        bay.ship = ship;

        const library = CjsLibrary.instance;
        if (this.kind === "origin")
        {
            native.translationCurve = null;
            native.rotationCurve = null;
            native.modelTranslationCurve = new Tr2TranslationAdapter();
            const effect = bay.effect = await library.Fetch(TnyHangar.hangarEffect);
            effect.SetParameter("ship", native);
            effect.SetParameter("Hangar", this.hangar.wrapped);
            effect.SetParameter("PostProcess", this.wrapped.postprocess);
            const hangarType = HangarType(effect, this.hangar.identity);
            if (hangarType !== null) effect.SetControllerVariable("HangarType", hangarType);
            effect.SetControllerVariable("skipNextEntryAnimation", entry === "dock" ? 0 : 1);
        }
        else
        {
            const base = new Tr2TranslationAdapter();
            vec3.copy(base.value, bay.position);
            const offset = new Tr2TranslationAdapter();
            quat.copy(offset.rotationOffset, bay.rotation);
            const translation = new Tr2CurveCombiner();
            translation.curves.Append(base);
            translation.curves.Append(offset);
            const rotation = new Tr2CurveConstant();
            quat.copy(rotation.value, bay.rotation);
            native.translationCurve = translation;
            native.rotationCurve = rotation;
            native.modelRotationCurve = new Tr2CurveConstant();
            quat.identity(native.modelRotationCurve.value);

            const path = TnyHangar.defaults[this.hangar.identity.hull]?.docker ?? TnyHangar.docker;
            const effect = bay.effect = await library.Fetch(path);
            effect.SetParameter("docking_ship", native);
            effect.SetParameter("docking_dock", bay.dock);
            const docking = effect.curveSets.find(set => set.name === "docking_cs") ?? null;
            if (bay.exit)
            {
                const exit = docking?.curves.find(curve => curve.name === "exit_point");
                if (exit) exit.value.set(bay.exit);
            }
            // Ours: the docker's Y is `input(0)*input(1)+input1+input2+input(2)+input(3)*0`:
            // input(3), the authored lift ShipOffsetY = (radius.y - centre.y) * pi/4 of the
            // ship's shape ellipsoid, is multiplied by 0, and input3 (shapeEllipsoidRadius.y)
            // is not read, so the ship's origin sits on the pad and its lower half sinks.
            // That lift goes on the model translation, which nothing in the docker writes.
            const lift = new Tr2TranslationAdapter();
            vec3.set(lift.value, 0, (native.shapeEllipsoidRadius[1] - native.shapeEllipsoidCenter[1]) * Math.PI / 4, 0);
            native.modelTranslationCurve = lift;
            effect.SetControllerVariable("isCapital", bay.size === "capital" ? 1 : 0);
            effect.SetControllerVariable("docked", entry === "dock" ? 0 : 1);
            if (entry === "appear") effect.SetControllerVariable("skinChange", 1);
        }
        if (bay.ship !== ship) return;
        this.wrapped.objects.Append(bay.effect);
        bay.effect.StartControllers();
    }

    /**
     * Takes a ship out of its bay. Dissolving, the docker runs `materialize` 0
     * and the ship leaves the scene after the docker's
     * `dematerializationDuration`; otherwise it leaves the bay at once and
     * stays in the scene with its own curves back.
     * @param {object} bay Mutable bay record.
     * @param {boolean} dissolve Whether to remove the ship after its dissolve animation.
     * @returns {void} Completion of the operation.
     * @cjs
     */
    _Release(bay, dissolve)
    {
        const { ship, effect, saved } = bay;
        bay.ship = bay.effect = bay.saved = null;
        bay.undockPending = bay.undocking = bay.leftDock = false;
        const finish = () =>
        {
            const objects = this.wrapped.objects;
            if (effect)
            {
                const index = objects.indexOf(effect);
                if (index !== -1) objects.Remove(index);
            }
            Object.assign(ship.wrapped, saved);
            if (dissolve) this.RemoveObject(ship);
        };
        const seconds = dissolve && effect ? GetVariable(effect.controllers, "dematerializationDuration") : null;
        if (seconds === null || this.kind === "origin") return finish();
        effect.SetControllerVariable("materialize", 0);
        const timer = setTimeout(() =>
        {
            this._timers.delete(timer);
            finish();
        }, seconds * 1000);
        this._timers.add(timer);
    }

    /**
     * Builds a hangar from its DNA and its scene, and finds its bays.
     *
     * @param {object} options
     * @param {string} options.dna The hangar's DNA (hangars have graphicIDs, no typeIDs).
     * @param {string} [options.scene] A scene path; omitted, the hull's default, else an empty sunless scene.
     * @param {boolean} [options.awaitResources=false] Resolve once the hangar's resources have loaded.
     * @returns {Promise<TnyHangar>} The hangar scene.
     * @cjs
     */
    static async fetch({ dna, scene, awaitResources = false } = {})
    {
        const library = CjsLibrary.instance;
        if (!library) throw new Error("TnyHangar requires an initialized CjsLibrary.");
        const object = await TnySpaceObject.acquire({ dna, awaitResources });
        const hangar = TnyStationary.fromWrapped(object, { dna });
        const path = scene ?? TnyHangar.defaults[hangar.identity.hull]?.scene ?? null;
        const result = TnyHangar.fromWrapped(path ? await library.Fetch(path) : TnyHangar.createSunlessScene());
        result.hangar = hangar;
        result.AddObject(hangar);
        result._FindBays();
        return result;
    }

    /**
     * An empty space scene with the sun off: the hangar's own lights light it.
     * @returns {EveSpaceScene}
     * @cjs
     */
    static createSunlessScene()
    {
        const scene = new EveSpaceScene();
        scene.Initialize(Tr2RenderContext_GetMainThreadRenderContext());
        vec3.set(scene.sunDiffuseColor, 0, 0, 0);
        vec3.set(scene.sunDiffuseColorWithDynamicLights, 0, 0, 0);
        return scene;
    }

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyHangar";

    /**
     * The known hangars by hull: a display name, the SDE graphic and the DNA
     * it gives, the hangar's own scene and, for Deathless, its docker. A hull
     * not listed gets an empty sunless scene and `docker`. Which Upwell scene
     * goes with which Upwell hangar, and which Deathless scene with which hull,
     * are client choices (DERIVED here).
     * @type {object}
     * @cjs
     */
    static defaults = {
        ah1: { name: "Amarr Hangar", graphicID: 24407, dna: "ah1:amarrbase:amarr:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/amarr/ah1/ah1_scene.black" },
        ch1: { name: "Caldari Hangar", graphicID: 24408, dna: "ch1:caldaribase:caldari:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/caldari/ch1/ch1_scene.black" },
        gh1: { name: "Gallente Hangar", graphicID: 24409, dna: "gh1:gallentebase:gallente:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/gallente/gh1/gh1_scene.black" },
        mh1: { name: "Minmatar Hangar", graphicID: 24410, dna: "mh1:minmatarbase:minmatar:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/minmatar/mh1/mh1_scene.black" },
        chjita: { name: "Jita Hangar", graphicID: 24525, dna: "chjita:caldarinavy:caldari:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/caldari/chjita/chjita_scene.black" },
        airh1: { name: "AIR Hangar", graphicID: 25044, dna: "airh1:air:caldari:layout?hangar_announcements",
            scene: "res:/dx9/model/hangar/air/airh1/airh1_scene.black" },
        airh2: { name: "AIR Hangar 2", graphicID: 33091, dna: "airh2:air_interior:generic:layout?library_generic",
            scene: "res:/dx9/model/hangar/air/airh2/airh2_scene.black" },
        gensh1_t1a: { name: "Generic Hangar", graphicID: 24411, dna: "gensh1_t1a:upwell:generic",
            scene: "res:/dx9/model/hangar/generic/standard/gensh1/gensh1_scene.black" },
        gench1_t1a: { name: "Generic Capital Hangar", graphicID: 24412, dna: "gench1_t1a:upwell:generic",
            scene: "res:/dx9/model/hangar/generic/capital/gench1/gench1_scene.black" },
        mgenh_ow01: { name: "Upwell Hangar", graphicID: 25235, dna: "mgenh_ow01:upwell_interior:generic:layout?upwell_hangar;hangar_announcements",
            scene: "res:/dx9/model/hangar/modular/scene/upwell_hangar_scene_01a.black" },
        mgenh_ch01: { name: "Upwell Capital Hangar", graphicID: 25568, dna: "mgenh_ch01:upwell_interior:generic:layout?upwell_capitalhangar",
            scene: "res:/dx9/model/hangar/modular/scene/upwell_hangar_scene_01a.black" },
        mdeha01: { name: "Deathless Hangar", graphicID: 26303, dna: "mdeha01:deathless:angel:layout?deathless_hangar",
            scene: "res:/dx9/model/hangar/modular/scene/deathless_hangar_scene_01.black",
            docker: "res:/dx9/model/hangar/shared/docker/multieffect_docker_01a_deathless.black" },
        mdeha03: { name: "Deathless Hangar 2", graphicID: 26356, dna: "mdeha03:deathless:minmatar:layout?deathless_hangar",
            scene: "res:/dx9/model/hangar/modular/scene/deathless_hangar_scene_02.black",
            docker: "res:/dx9/model/hangar/shared/docker/multieffect_docker_01a_deathless.black" }
    };

    /**
     * The docker for a layout-built or capital hangar whose hull lists none.
     * @type {string}
     * @cjs
     */
    static docker = "res:/dx9/model/hangar/shared/docker/multieffect_docker_01a.black";

    /**
     * The effect that animates a ship in a hangar without bays.
     * @type {string}
     * @cjs
     */
    static hangarEffect = "res:/dx9/model/hangar/shared/fx/me_generic_hangar_vfx_01a.black";

    /**
     * Ours: when SetShip is given no bay, a ship whose bounding sphere is
     * smaller than this takes a small bay, otherwise a medium one. Nothing in
     * Carbon or the content chooses a bay by size; the client does.
     * @type {number}
     * @cjs
     */
    static smallShipRadius = 100;

    /**
     * Reusable synchronous math scratch; callers must not retain its values.
     * @type {object}
     * @cjs
     */
    static scratch = { vec3_0: vec3.create(), quat_0: quat.create() };

}

CjsBlueGraph.define(TnyHangar, "TnyHangar");

/**
 * The first locator of a named set, or null.
 * @param {object[]|null} sets Authored locator sets.
 * @param {string} name Member or registration name.
 * @returns {object|null}
 * @cjs
 */
function FindLocator(sets, name)
{
    return (sets ?? []).find(each => each.name === name)?.locators[0] ?? null;
}

/**
 * A controller variable's value, or null when no controller has it.
 * @param {object[]} controllers Native controllers to inspect.
 * @param {string} name Member or registration name.
 * @returns {number|null}
 * @cjs
 */
function GetVariable(controllers, name)
{
    for (const controller of controllers)
    {
        const variable = controller.variables?.find(each => each.name === name);
        if (variable) return variable.value;
    }
    return null;
}

/**
 * me_generic's `HangarType` for a hangar, from the variable's own
 * `enumValues` ("Default = 0, AmarrBase = 1, ..., AirBase = 7, ..."): the
 * entry named after the hangar's faction, or its faction or race plus "Base"
 * (amarrbase → AmarrBase, air → AirBase, caldari → CaldariBase). Only the
 * light-rig loader tells the racial values apart. Null when none matches,
 * leaving the default.
 * @param {object} effect Multi-effect supplying hangar controller variables.
 * @param {object} identity Explicit identity and provenance for the operation.
 * @returns {number|null}
 * @cjs
 */
function HangarType(effect, identity)
{
    let enumValues = "";
    for (const controller of effect.controllers)
    {
        const variable = controller.variables?.find(each => each.name === "HangarType");
        if (variable) enumValues = variable.enumValues;
    }
    const entries = new Map(parseEnumValues(enumValues).map(({ name, value }) => [ name.toLowerCase(), value ]));
    for (const candidate of [ identity.faction, identity.faction && `${identity.faction}base`, identity.race && `${identity.race}base` ])
        if (candidate && entries.has(candidate.toLowerCase())) return entries.get(candidate.toLowerCase());
    return null;
}
