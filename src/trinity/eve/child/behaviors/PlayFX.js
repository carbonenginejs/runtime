// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/PlayFX.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { vec3 } from "#math/vec3";

// Module scratch for the per-agent loop (behavior updates run sequentially).
const OFFSET_EFFECT = vec3.create();
const OFFSET_EFFECT_WS = vec3.create();
const AGENT_TARGET_WS = vec3.create();
const NO_FORCES = [];

/** A steering-group behaviour that clones, aims, and starts or stops a firing effect on each drone as it arrives at and departs from its target. */
@type.define({ className: "PlayFX", family: "eve/child/behaviors" })
export class PlayFX extends EveEntity
{

  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  behaviorPriority = 0;

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  behaviorWeight = 20;

  /** m_firingEffect (IEveFiringEffectElementPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("IEveFiringEffectElement")
  firingEffect = null;

  /** m_firingEffects (PIEveFiringEffectElementVector) [READ] */
  @io.read
  @type.list("IEveFiringEffectElement")
  generatedFiringEffects = [];

  /** m_sec (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  sec = 1;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  // Carbon m_count/m_stop runtime state.
  #count = 0;

  #stop = false;

  /** Carbon PlayFX::GetProcessPriority (cpp:25-28). */
  @carbon.method
  @impl.implemented
  GetProcessPriority()
  {
    return this.behaviorPriority;
  }

  /** Carbon PlayFX::GetBehaviorName (cpp:30-33). */
  @carbon.method
  @impl.implemented
  GetBehaviorName()
  {
    return "PlayFX";
  }

  /** Per-agent scratch record count (Carbon sizeof(PlayFXData)). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")
  GetScratchMemorySize()
  {
    return 1;
  }

  /** Fresh per-agent scratch record (Carbon PlayFXData placement init). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")
  InitializeScratch()
  {
    return {
      effectPlaying: false,
      droneArrived: false,
      oldTarget: vec3.create()
    };
  }

  /** Carbon IBehavior::UpdateState override (h:55-58). */
  @carbon.method
  @impl.implemented
  UpdateState(state)
  {
    this.#stop = !!state;
  }

  /**
   * Drives one cloned firing effect per agent: starts firing when the agent
   * arrives (agent.playFX), aims it in world space, and stops it after m_sec
   * seconds (Carbon CalculateBehavior, cpp:45-139).
   * @param {Array} agents - DroneAgent records
   * @param {Array} scratchData - per-agent PlayFXData records
   * @param {Number} _deltaTime
   * @param {Object} group - owning BehaviorGroup
   * @param {Object} system - owning EveChildBehaviorSystem
   * @param {Array} _dronesInSearchRadius - unused
   * @returns {Array} empty (as Carbon)
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's Be::Time 100ns clock maps to Date.now seconds against agent.fxStartTime.")
  CalculateBehavior(agents, scratchData, _deltaTime, group, system, _dronesInSearchRadius)
  {
    if (this.behaviorWeight <= 0 || !this.enabled)
    {
      for (const fx of this.generatedFiringEffects)
      {
        if (!fx) continue;
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
      this.#count = 0;
    }

    if (this.#count !== agents.length)
    {
      this.#CheckCount(agents.length);
    }

    const worldTransform = system.GetWorldTransform();
    const limit = Math.min(agents.length, this.generatedFiringEffects.length);

    // This behavior activates when the drone has arrived near its locator
    for (let c = 0; c < limit; c++)
    {
      const agent = agents[c];
      const firingEffect = this.generatedFiringEffects[c];
      const data = scratchData?.[c];
      if (!data || !firingEffect)
      {
        continue;
      }

      if (this.#stop)
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

        const elapsed = Date.now() / 1000 - agent.fxStartTime;
        if (elapsed > this.sec)
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
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, parentTransform)
  {
    for (const fx of this.generatedFiringEffects)
    {
      if (!fx) continue;
      fx.UpdateEffectAsync(updateContext);
      fx.UpdateVisibility(updateContext, parentTransform);
    }
  }

  /** Carbon PlayFX::UpdateSyncronous (cpp:150-156). */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext)
  {
    for (const fx of this.generatedFiringEffects)
    {
      if (!fx) continue;
      fx.UpdateEffectSync(updateContext);
    }
  }

  /** Carbon PlayFX::GetRenderables (cpp:158-164). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    for (const fx of this.generatedFiringEffects)
    {
      if (!fx) continue;
      fx.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Carbon PlayFX::RegisterComponents (cpp:202-215). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const fx of this.generatedFiringEffects)
      {
        fx?.Register(registry);
      }
    }
  }

  /** Carbon PlayFX::UnRegisterComponents (cpp:217-230). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const fx of this.generatedFiringEffects)
      {
        fx?.UnRegister(registry);
      }
    }
  }

  /** Carbon method RegisterWithQuadRenderer (cpp:239-245) - quad renderer
   * registration seam; the firing effect elements own the real quads. */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Carbon method AddQuadsToQuadRenderer (cpp:253-259) - quad renderer
   * submission seam; the firing effect elements own the real quads. */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_frustum, _quadRenderer)
  {
  }

  // Grows or shrinks the cloned firing-effect list to the agent count (Carbon
  // CheckCount, cpp:262-299; BeClasses->CloneTo maps to CjsModel.Clone).
  /**
   * Grows or shrinks the cloned firing-effect list to match the agent count, cloning the configured effect for new agents and dropping the excess.
   */
  #CheckCount(agentSize)
  {
    if (this.#count > agentSize)
    {
      const diff = this.#count - agentSize;
      for (let i = 0; i < diff; i++)
      {
        this.generatedFiringEffects.pop();
      }
      this.#count = agentSize;
    }
    else if (agentSize > this.#count)
    {
      if (this.firingEffect === null)
      {
        return;
      }

      const diff = agentSize - this.#count;
      for (let i = 0; i < diff; i++)
      {
        const newFx = this.firingEffect.Clone?.();
        if (!newFx)
        {
          return;
        }
        this.generatedFiringEffects.push(newFx);
      }
      this.#count = agentSize;
    }
  }

}
