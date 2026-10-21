import { BlueList, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { IBehavior } from "./IBehavior.js";
import { CjsSchema, meta, type, blue } from "#schema";
import { blue as be } from "#blue";
import { EveEntity } from "../../EveEntity.js";
import { vec3 } from "#math/vec3";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const OFFSET_EFFECT = vec3.create();
const OFFSET_EFFECT_WS = vec3.create();
const AGENT_TARGET_WS = vec3.create();
const NO_FORCES = [];

/** A steering-group behaviour that clones, aims, and starts or stops a firing effect on each drone as it arrives at and departs from its target. */
@blue.define("PlayFX")
@blue.inherit(IBehavior)
@blue.inherit(IListNotify)
@blue.interface(IBehavior, IListNotify, EveEntity)
export class PlayFX extends EveEntity
{

  /** Carbon PlayFX.cpp:166-200 maintains firing-effect registry membership. */
  @blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list !== this.generatedFiringEffects || (event & BLUELISTEVENT.BELIST_LOADING) || !this.IsInRegistry()) return;
    const registry = this.GetComponentRegistry();
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        CjsSchema.cast(value, EveEntity)?.Register(registry);
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        CjsSchema.cast(value, EveEntity)?.UnRegister(registry);
        break;
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const item of list) CjsSchema.cast(item, EveEntity)?.UnRegister(registry);
        break;
    }
  }

  /** Installs Carbon's constructor-owned list observers. */
  constructor()
  {
    super();
    this.generatedFiringEffects.SetNotify(this);
  }


  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.IBehavior.ProcessPriority")
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  behaviorWeight = 20;

  /** m_firingEffect (IEveFiringEffectElementPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("IEveFiringEffectElement")
  firingEffect = null;

  /** m_firingEffects (PIEveFiringEffectElementVector) [READ] */
  @blue.read
  @type.list("IEveFiringEffectElement")
  generatedFiringEffects = new BlueList(IEveFiringEffectElement);

  /** m_sec (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  sec = 1;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enabled = true;

  // Carbon m_count/m_stop runtime state.
  _count = 0;

  _stop = false;

  /** Carbon PlayFX::GetProcessPriority (cpp:25-28). */

  @meta.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /** Carbon PlayFX::GetBehaviorName (cpp:30-33). */

  @meta.implemented
  GetBehaviorName()
  {
    return "PlayFX";
  }

  /**
   * Per-agent scratch record count (Carbon sizeof(PlayFXData)).
   *
   * Adapted: Carbon returns a byte size; the JS port models scratch as one plain record per
   * agent, so any non-zero value means 'has scratch'.
   */

  @meta.adapted
  GetScratchMemorySize()
  {
    return 1;
  }

  /**
   * Fresh per-agent scratch record (Carbon PlayFXData placement init).
   *
   * Adapted: Carbon initializes caller-provided raw memory; the JS port returns the fresh
   * record instead.
   */

  @meta.adapted
  InitializeScratch()
  {
    return {
      effectPlaying: false,
      droneArrived: false,
      oldTarget: vec3.create()
    };
  }

  /** Carbon IBehavior::UpdateState override (h:55-58). */

  @meta.implemented
  UpdateState(state)
  {
    this._stop = !!state;
  }

  /**
   * Drives one cloned firing effect per agent: starts firing when the agent
   * arrives (agent.playFX), aims it in world space, and stops it after m_sec
   * seconds (Carbon CalculateBehavior, cpp:45-139). Generated effects are
   * required receivers; only the authored template is nullable.
   * Adapted: JavaScript scratch records replace the native scratch-data pointer;
   * an absent scratch record has no agent state to update.
   * @param {Array} agents - DroneAgent records
   * @param {Array} scratchData - per-agent PlayFXData records
   * @param {Number} _deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} empty (as Carbon)
   */

  @meta.adapted
  CalculateBehavior(agents, scratchData, _deltaTime, group, system, _dronesInSearchRadius)
  {
    if (this.behaviorWeight <= 0 || !this.enabled)
    {
      for (const fx of this.generatedFiringEffects)
      {
        fx.StopFiring();
      }
      return NO_FORCES;
    }

    if (this.firingEffect === null)
    {
      return NO_FORCES;
    }

    // If the drone count is 0 the count is not updated so this is needed
    if (this.generatedFiringEffects.length === 0)
    {
      this._count = 0;
    }

    if (this._count !== agents.length)
    {
      this._CheckCount(agents.length);
    }

    const worldTransform = system.GetWorldTransform();
    const limit = Math.min(agents.length, this.generatedFiringEffects.length);

    // This behavior activates when the drone has arrived near its locator
    for (let c = 0; c < limit; c++)
    {
      const agent = agents[c];
      const firingEffect = this.generatedFiringEffects[c];
      const data = scratchData?.[c];
      if (!data)
      {
        continue;
      }

      if (this._stop)
      {
        data.droneArrived = false;
      }

      // Make sure the effect isn't showing when loading everything up
      if (data.droneArrived === false)
      {
        firingEffect.SetDisplay(false);
      }

      // Drone has arrived at its target so play the effect
      if (agent.playFX && !data.effectPlaying)
      {
        if (data.droneArrived === false)
        {
          data.droneArrived = true;
          firingEffect.SetDisplay(true);
        }

        firingEffect.StartFiring(0);
        data.effectPlaying = true;
      }

      vec3.normalize(OFFSET_EFFECT, agent.targetDirection);
      vec3.scale(OFFSET_EFFECT, OFFSET_EFFECT, group.GetBoundingSphereRadius());
      vec3.add(OFFSET_EFFECT, OFFSET_EFFECT, agent.position);

      // Set the effect's pos to world space
      vec3.transformMat4(OFFSET_EFFECT_WS, OFFSET_EFFECT, worldTransform);

      // Without this the drone would start shooting at the new target because
      // of the cooldown of the effect
      if (vec3.squaredLength(data.oldTarget) !== 0)
      {
        firingEffect.SetFiringTransform(OFFSET_EFFECT_WS, data.oldTarget);
      }

      if (data.effectPlaying)
      {
        vec3.transformMat4(AGENT_TARGET_WS, agent.target, worldTransform);
        firingEffect.SetFiringTransform(OFFSET_EFFECT_WS, AGENT_TARGET_WS);

        // PlayFX.cpp:125-128: Be::Time ticks against m_sec seconds.
        const diff = be.os.GetActualTime() - agent.fxStartTime;
        const duration = this.sec * 10000000;
        if (diff > duration)
        {
          firingEffect.StopFiring();
          data.effectPlaying = false;
          agent.playFX = false;
          vec3.copy(data.oldTarget, AGENT_TARGET_WS);
          vec3.set(agent.target, 0, 0, 0);
        }
      }
    }

    return NO_FORCES;
  }

  /** Carbon PlayFX::UpdateAsyncronous (cpp:141-148). */

  @meta.implemented
  UpdateAsyncronous(updateContext, parentTransform)
  {
    for (const fx of this.generatedFiringEffects)
    {
      fx.UpdateEffectAsync(updateContext);
      fx.UpdateVisibility(updateContext, parentTransform);
    }
  }

  /** Carbon PlayFX::UpdateSyncronous (cpp:150-156). */

  @meta.implemented
  UpdateSyncronous(updateContext)
  {
    for (const fx of this.generatedFiringEffects)
    {
      fx.UpdateEffectSync(updateContext);
    }
  }

  /** Carbon PlayFX::GetRenderables (cpp:158-164). */

  @meta.implemented
  GetRenderables(renderables = [])
  {
    for (const fx of this.generatedFiringEffects)
    {
      fx.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Carbon PlayFX::RegisterComponents (cpp:202-215). */

  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const fx of this.generatedFiringEffects)
      {
        const entity = CjsSchema.cast(fx, EveEntity);
        if (entity) entity.Register(registry);
      }
    }
  }

  /** Carbon PlayFX::UnRegisterComponents (cpp:217-230). */

  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const fx of this.generatedFiringEffects)
      {
        const entity = CjsSchema.cast(fx, EveEntity);
        if (entity) entity.UnRegister(registry);
      }
    }
  }

  /** Carbon method RegisterWithQuadRenderer (cpp:239-245) - quad renderer
   * registration seam; the firing effect elements own the real quads. */

  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Carbon method AddQuadsToQuadRenderer (cpp:253-259) - quad renderer
   * submission seam; the firing effect elements own the real quads. */

  @meta.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  /**
   * Grows or shrinks the firing-effect list (PlayFX.cpp:262-300). Carbon uses
   * BeClasses->CloneTo, represented by be.classes.CloneTo, rather than a
   * method on the authored effect. A failed clone leaves the count unchanged.
   * Adapted: CloneTo returns the copy or null instead of bool plus an out pointer.
   */

  _CheckCount(agentSize)
  {
    if (this._count > agentSize)
    {
      const diff = this._count - agentSize;
      for (let i = 0; i < diff; i++)
      {
        this.generatedFiringEffects.pop();
      }
      this._count = agentSize;
    }
    else if (agentSize > this._count)
    {
      if (this.firingEffect === null)
      {
        return;
      }

      const diff = agentSize - this._count;
      for (let i = 0; i < diff; i++)
      {
        const newFx = be.classes.CloneTo(this.firingEffect, null);
        if (!newFx)
        {
          return;
        }
        this.generatedFiringEffects.push(newFx);
      }
      this._count = agentSize;
    }
  }

}
