import { CjsSchema, meta, type } from "#schema";
import { vec3 } from "#math/vec3";
import { CjsBlueGraph } from "../../blue/formats/graph/CjsBlueGraph.js";
import { Type } from "../../trinity/controllers/enums.js";
import { Tr2ActionPlayMeshAnimation } from "../../trinity/controllers/action/Tr2ActionPlayMeshAnimation.js";
import { EveShip2 } from "../../trinity/eve/spaceObject/EveShip2.js";
import { TnyMobile } from "./TnyMobile.js";
import { TnyShipIdentity } from "./TnyShipIdentity.js";

/** The decal effect SOF uses for a hull's kill counter (EveSOF DECAL_EFFECT_NAMES, USAGE_KILLCOUNTER). */
const KILL_COUNTER_EFFECT = /decalcounterv5\.fx$/i;

/**
 * The exclusive ship states: a controller variable belongs to one when its name
 * names the subject AND has a state flag's shape (`IsWarping`, `isDocked`,
 * `InSiegeMode`), so `WarpTopSpeed` never receives a 1. After Graphene's
 * ShipStates and skindr's ShipControls. `always` names the variable set even
 * when no controller declares it: the docker multi-effect drives a ship's
 * `IsWarping` and `isDocked` (res:/dx9/model/hangar/shared/docker/multieffect_docker_01a.black).
 * Warp and dock are offered on every ship (operator, 2026-11-10).
 */
const SHIP_STATES = [
    { name: "warp", test: /warp/i, always: "IsWarping" },
    { name: "dock", test: /dock/i, always: "isDocked" },
    { name: "siege", test: /siege/i },
    { name: "attack", test: /attack|aggress|combat/i }
];
const STATE_SHAPE = /^_?(?:[iI]s|[iI]n|[hH]as|[uU]se)[A-Z]|(?:^|_|[a-z])(?:Mode|On|Enabled|Active|Requested)$/;

/** Members a UI writes and the wrapper hears. */
const VALUE = meta.READWRITE | meta.NOTIFY;

/** The booster set members a ship offers, EveBoosterSet2's own names (Graphene's Boosters group). */
const BOOSTER_MEMBERS = [ "alwaysOn", "alwaysOnIntensity", "warpIntensity", "staticTrailLength" ];

/**
 * A ship (EveShip2): adds motion, kill marks, boosters, states and stance.
 * Ours, after ccpwgl's TnyShip.
 * @cjs
 */
@meta.define({ name: "TnyShip" })
@meta.exposureChainTo(TnyMobile)
export class TnyShip extends TnyMobile
{

    /**
     * Metres per second along the ship's heading, driving its Destiny ball
     * (SetBall), so its world velocity, EveShip2.speed and ShipSpeed() follow.
     * Null without a ball.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    speed = null;

    /**
     * EveShip2.maxSpeed, and the booster set's maxVel it scales trails by (EveBoosterSet2.cpp:109).
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    maxSpeed = null;

    /**
     * Kill marks (EveShip2.displayKillCounterValue), on hulls with a kill-counter decal.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.uint32
    displayKillCounterValue = null;

    /**
     * EveBoosterSet2.alwaysOn; switching it also switches physicsUpdate (Graphene).
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    alwaysOn = null;

    /**
     * EveBoosterSet2.alwaysOnIntensity.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    alwaysOnIntensity = null;

    /**
     * EveBoosterSet2.warpIntensity.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    warpIntensity = null;

    /**
     * EveBoosterSet2.staticTrailLength, on sets with trails.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.float32
    staticTrailLength = null;

    /**
     * Warp: the controller variable IsWarping (and any other warp flag its
     * controllers have). Each state is its own value, as the content's
     * effects are separate; several can be on at once. A change the content
     * makes itself (the hangar docker turning warp off) is announced by Sync.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    warp = null;

    /**
     * Docked: isDocked (and any other dock flag).
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    dock = null;

    /**
     * Siege mode, on ships whose controllers have a siege flag (InSiegeMode).
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    siege = null;

    /**
     * Attack mode, on ships whose controllers have an attack flag.
     * @type {boolean|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.boolean
    attack = null;

    /**
     * The stance's value from its enum choices, on ships with a stance.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(VALUE)
    @type.int32
    stance = null;

    /**
     * The ship's Destiny client ball (server/destiny CjsDestinyClientBall), or
     * null. The application owns the park; the runtime never imports Destiny.
     * @type {object|null}
     * @cjs
     */
    _ball = null;

    /**
     * The states found: each state's controller variables.
     * @type {Map}
     * @cjs
     */
    _states = new Map();

    /**
     * The stance: its variable name and choices, or null.
     * @type {object|null}
     * @cjs
     */
    _stance = null;

    /**
     * Finds the ship's own facts after the space object's.
     * @param {string|null} dna SOF DNA, or null when unknown.
     * @cjs
     */
    _Discover(dna)
    {
        super._Discover(dna);
        const ship = this.wrapped;
        const take = (member, value) =>
        {
            this._supported.add(member);
            this[member] = value;
        };

        if (this._ball) take("speed", Math.hypot(this._ball.vx, this._ball.vy, this._ball.vz));
        take("maxSpeed", ship.maxSpeed);
        if (ship.decals.some(decal => KILL_COUNTER_EFFECT.test(decal.decalEffect?.effectFilePath ?? "")))
            take("displayKillCounterValue", ship.displayKillCounterValue);
        if (ship.boosters)
        {
            for (const member of BOOSTER_MEMBERS)
                if (member !== "staticTrailLength" || ship.boosters.trails) take(member, ship.boosters[member]);
        }

        this._states = this._FindStates();
        for (const name of this._states.keys()) take(name, this._ReadState(name));
        this._stance = this._FindStance();
        if (this._stance) take("stance", this.controllers.GetVariable(this._stance.variable));
    }

    /**
     * Each offered state's controller variables (warp and dock always).
     * @returns {Map<string, string[]>}
     * @cjs
     */
    _FindStates()
    {
        const names = this.controllers.GetVariableNames();
        const states = new Map([ [ "standard", [] ] ]);
        for (const state of SHIP_STATES)
        {
            const variables = names.filter(name => state.test.test(name) && STATE_SHAPE.test(name));
            if (!variables.length && !state.always) continue;
            if (state.always && !variables.includes(state.always)) variables.push(state.always);
            states.set(state.name, variables);
        }
        return states;
    }

    /**
     * The stance, found by what it is rather than by name (the Anhinga's
     * variable is named differently): an enum controller variable that a state
     * machine's transitions test and whose machine plays mesh animations, as
     * res:/dx9/model/controller/shipstance.black's ShipStance does.
     * @returns {object|null}
     * @cjs
     */
    _FindStance()
    {
        for (const controller of this.controllers._Controllers())
        {
            for (const variable of controller.variables)
            {
                if (variable.variableType !== Type.ENUM) continue;
                const test = new RegExp(`\\b${variable.name}\\b`);
                const drives = controller.stateMachines.some(machine =>
                    machine.states.some(state => state.transitions.some(transition => test.test(transition.condition)))
                    && machine.states.some(state => state.actions.some(action => CjsSchema.cast(action, Tr2ActionPlayMeshAnimation))));
                if (drives) return { variable: variable.name, choices: this.controllers.GetControllers()
                    .flatMap(entry => entry.variables).find(entry => entry.name === variable.name).choices };
            }
        }
        return null;
    }

    /**
     * Pushes the ship's own members, else the space object's.
     * @param {string} name Member or registration name.
     * @cjs
     */
    _Push(name)
    {
        const ship = this.wrapped;
        switch (name)
        {
            case "speed": this._SetSpeed(this.speed); return;
            case "maxSpeed":
                this._Bind(ship, "maxSpeed").SetValue(this.maxSpeed);
                if (ship.boosters) this._Bind(ship.boosters, "maxVel").SetValue(this.maxSpeed);
                if (this._ball) this._ball.mPark.SetMaxSpeed(this._ball.mId, this.maxSpeed);
                return;
            case "displayKillCounterValue": this._Bind(ship, name).SetValue(Math.round(this[name])); return;
            case "alwaysOn":
                // alwaysOn skips Carbon's 200 m trail minimum (EveBoosterSet2.cpp:383-387); off physics,
                // staticTrailLength sets the trail (Graphene TrinityBoosterParameters).
                this._Bind(ship.boosters, "alwaysOn").SetValue(this.alwaysOn);
                this._Bind(ship.boosters, "physicsUpdate").SetValue(!this.alwaysOn);
                return;
            case "alwaysOnIntensity": case "warpIntensity": case "staticTrailLength":
                this._Bind(ship.boosters, name).SetValue(this[name]);
                return;
            case "warp": case "dock": case "siege": case "attack":
                for (const variable of this._states.get(name)) this.wrapped.SetControllerVariable(variable, this[name] ? 1 : 0);
                return;
            case "stance": this.controllers.SetVariable(this._stance.variable, this.stance); return;
            default: super._Push(name);
        }
    }

    /**
     * Whether a state is on: any of its controller variables is non-zero.
     * @param {string} name Member or registration name.
     * @returns {boolean}
     * @cjs
     */
    _ReadState(name)
    {
        return this._states.get(name).some(variable => (this.controllers.GetVariable(variable) ?? 0) !== 0);
    }

    /**
     * Reads back what the content changes by itself (a docker turning warp
     * or dock on and off, a machine moving the stance) and announces each
     * change through _onModified, without pushing it down again.
     * @cjs
     */
    Sync()
    {
        super.Sync();
        for (const name of this._states.keys())
        {
            const on = this._ReadState(name);
            if (on === this[name]) continue;
            this[name] = on;
            if (this._onModified) this._onModified(name);
        }
        if (this._stance)
        {
            const stance = this.controllers.GetVariable(this._stance.variable);
            if (stance !== null && stance !== this.stance)
            {
                this.stance = stance;
                if (this._onModified) this._onModified("stance");
            }
        }
    }

    /**
     * Attaches the ship's Destiny client ball, or detaches it with null. The
     * ball becomes the ship's translation and rotation curve, as Carbon's
     * client binds a ship to its ball, so the ship moves and turns on the
     * scene clock through the ball's own *_Ticks methods. `speed` is supported
     * only while a ball is attached, so the type info changes.
     *
     * @param {object|null} ball A CjsDestinyClientBall in a park the application pumps, or null.
     * @cjs
     */
    SetBall(ball)
    {
        const ship = this.wrapped;
        this._ball = ball;
        ship.translationCurve = ball;
        ship.rotationCurve = ball;
        if (ball)
        {
            this._supported.add("speed");
            this.speed = Math.hypot(ball.vx, ball.vy, ball.vz);
            if (!(ship.maxSpeed > 0)) this.SetValues({ maxSpeed: ball.maxVelocity > 0 ? ball.maxVelocity : 250 });
            else ball.mPark.SetMaxSpeed(ball.mId, ship.maxSpeed);
        }
        else
        {
            this._supported.delete("speed");
            this.speed = null;
        }
        if (this._onTypeInfoModified) this._onTypeInfoModified();
    }

    /**
     * Drives the ball: heads along the ship's heading at a throttle of
     * speed / maxSpeed (Destiny's GotoDirection and SetSpeedFraction, which
     * clamps to [0, 1]).
     * @param {number} speed Requested speed in metres per second.
     * @cjs
     */
    _SetSpeed(speed)
    {
        const ball = this._ball, park = ball.mPark;
        if (speed > 0)
        {
            // The heading: the ship's local +Z in world space.
            const { vec3_0 } = TnyShip.scratch;
            const heading = vec3.transformQuat(vec3_0, [ 0, 0, 1 ], this.wrapped.worldRotation);
            park.GotoDirection(ball.mId, heading[0], heading[1], heading[2]);
        }
        park.SetSpeedFraction(ball.mId, this.maxSpeed > 0 ? speed / this.maxSpeed : 0);
    }

    /**
     * The stance choices.
     * @param {string} name Member or registration name.
     * @returns {Array|null}
     * @cjs
     */
    _Choices(name)
    {
        if (name === "stance" && this._stance) return this._stance.choices.map(choice => [ choice.value, choice.name ]);
        return super._Choices(name);
    }

    /**
     * Adds the capabilities a ship may have.
     * @returns {string[]}
     * @cjs
     */
    _Interfaces()
    {
        const names = super._Interfaces();
        if (this.stance !== null) names.push("stance");
        if (this.alwaysOn !== null) names.push("boosters");
        if (this.displayKillCounterValue !== null) names.push("killmarks");
        return names;
    }

    /**
     * Native class accepted by this wrapper.
     * @type {Function}
     * @cjs
     */
    static wrappedClass = EveShip2;

    /**
     * Reusable synchronous math scratch; callers must not retain its values.
     * @type {object}
     * @cjs
     */
    static scratch = { vec3_0: vec3.create() };

    /**
     * Identity class populated by this wrapper.
     * @type {Function}
     * @cjs
     */
    static identityClass = TnyShipIdentity;

    /**
     * Graphene's editor limits (MissingAnnotations, the demo's settings).
     * Speed has none of its own: the Destiny ball holds it to maxSpeed.
     * @type {object}
     * @cjs
     */
    static ranges = { ...TnyMobile.ranges, speed: [ 0, Infinity ], maxSpeed: [ 0.01, Infinity ], displayKillCounterValue: [ 0, 999 ],
        alwaysOnIntensity: [ 0, 2 ], warpIntensity: [ 0, 1 ], staticTrailLength: [ 0, 5000 ] };

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyShip";

}

CjsBlueGraph.define(TnyShip, "TnyShip");
