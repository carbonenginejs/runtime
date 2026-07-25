import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../../../eve/EveEntity.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_firingEffect, _init_extra_firingEffect, _init_generatedFiringEffects, _init_extra_generatedFiringEffects, _init_sec, _init_extra_sec, _init_enabled, _init_extra_enabled;

// Module scratch for the per-agent loop (behavior updates run sequentially).
const OFFSET_EFFECT = vec3.create();
const OFFSET_EFFECT_WS = vec3.create();
const AGENT_TARGET_WS = vec3.create();
const NO_FORCES = [];

/** PlayFX (eve/child/behaviors) - generated from schema shapeHash 06aaa1da.... */
let _PlayFX;
class PlayFX extends _EveEntity {
  static {
    ({
      e: [_init_behaviorPriority, _init_extra_behaviorPriority, _init_behaviorWeight, _init_extra_behaviorWeight, _init_firingEffect, _init_extra_firingEffect, _init_generatedFiringEffects, _init_extra_generatedFiringEffects, _init_sec, _init_extra_sec, _init_enabled, _init_extra_enabled, _initProto],
      c: [_PlayFX, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "PlayFX",
      family: "eve/child/behaviors"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "behaviorPriority"], [[io, io.persist, type, type.float32], 16, "behaviorWeight"], [[io, io.persist, void 0, type.model("IEveFiringEffectElement")], 16, "firingEffect"], [[io, io.read, void 0, type.list("IEveFiringEffectElement")], 16, "generatedFiringEffects"], [[io, io.persist, type, type.int32], 16, "sec"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetProcessPriority"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBehaviorName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a byte size; the JS port models scratch as one plain record per agent, so any non-zero value means 'has scratch'.")], 18, "GetScratchMemorySize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon initializes caller-provided raw memory; the JS port returns the fresh record instead.")], 18, "InitializeScratch"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateState"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's Be::Time 100ns clock maps to Date.now seconds against agent.fxStartTime; the firing effect elements are duck-typed.")], 18, "CalculateBehavior"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.noop], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.noop], 18, "AddQuadsToQuadRenderer"]], 0, void 0, _EveEntity));
  }
  /** m_priority (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  behaviorPriority = (_initProto(this), _init_behaviorPriority(this, 0));

  /** m_behaviorWeight (float) [READWRITE, PERSIST] */
  behaviorWeight = (_init_extra_behaviorPriority(this), _init_behaviorWeight(this, 20));

  /** m_firingEffect (IEveFiringEffectElementPtr) [READWRITE, PERSIST] */
  firingEffect = (_init_extra_behaviorWeight(this), _init_firingEffect(this, null));

  /** m_firingEffects (PIEveFiringEffectElementVector) [READ] */
  generatedFiringEffects = (_init_extra_firingEffect(this), _init_generatedFiringEffects(this, []));

  /** m_sec (int32_t) [READWRITE, PERSIST] */
  sec = (_init_extra_generatedFiringEffects(this), _init_sec(this, 1));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_sec(this), _init_enabled(this, true));

  // Carbon m_count/m_stop runtime state.
  #count = (_init_extra_enabled(this), 0);
  #stop = false;

  /** Carbon PlayFX::GetProcessPriority (cpp:25-28). */
  GetProcessPriority() {
    return this.behaviorPriority;
  }

  /** Carbon PlayFX::GetBehaviorName (cpp:30-33). */
  GetBehaviorName() {
    return "PlayFX";
  }

  /** Per-agent scratch record count (Carbon sizeof(PlayFXData)). */
  GetScratchMemorySize() {
    return 1;
  }

  /** Fresh per-agent scratch record (Carbon PlayFXData placement init). */
  InitializeScratch() {
    return {
      effectPlaying: false,
      droneArrived: false,
      oldTarget: vec3.create()
    };
  }

  /** Carbon IBehavior::UpdateState override (h:55-58). */
  UpdateState(state) {
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
  CalculateBehavior(agents, scratchData, _deltaTime, group, system, _dronesInSearchRadius) {
    if (this.behaviorWeight <= 0 || !this.enabled) {
      for (const fx of this.generatedFiringEffects) {
        fx?.StopFiring?.();
      }
      return NO_FORCES;
    }
    if (this.firingEffect === null) {
      return NO_FORCES;
    }

    // If the drone count is 0 the count is not updated so this is needed
    if (this.generatedFiringEffects.length === 0) {
      this.#count = 0;
    }
    if (this.#count !== agents.length) {
      this.#CheckCount(agents.length);
    }
    const worldTransform = system.GetWorldTransform();
    const limit = Math.min(agents.length, this.generatedFiringEffects.length);

    // This behavior activates when the drone has arrived near its locator
    for (let c = 0; c < limit; c++) {
      const agent = agents[c];
      const firingEffect = this.generatedFiringEffects[c];
      const data = scratchData?.[c];
      if (!data || !firingEffect) {
        continue;
      }
      if (this.#stop) {
        data.droneArrived = false;
      }

      // Make sure the effect isn't showing when loading everything up
      if (data.droneArrived === false) {
        firingEffect.SetDisplay?.(false);
      }

      // Drone has arrived at its target so play the effect
      if (agent.playFX && !data.effectPlaying) {
        if (data.droneArrived === false) {
          data.droneArrived = true;
          firingEffect.SetDisplay?.(true);
        }
        firingEffect.StartFiring?.(0);
        data.effectPlaying = true;
      }
      vec3.normalize(OFFSET_EFFECT, agent.targetDirection);
      vec3.scale(OFFSET_EFFECT, OFFSET_EFFECT, group.GetBoundingSphereRadius());
      vec3.add(OFFSET_EFFECT, OFFSET_EFFECT, agent.position);

      // Set the effect's pos to world space
      vec3.transformMat4(OFFSET_EFFECT_WS, OFFSET_EFFECT, worldTransform);

      // Without this the drone would start shooting at the new target because
      // of the cooldown of the effect
      if (vec3.squaredLength(data.oldTarget) !== 0) {
        firingEffect.SetFiringTransform?.(OFFSET_EFFECT_WS, data.oldTarget);
      }
      if (data.effectPlaying) {
        vec3.transformMat4(AGENT_TARGET_WS, agent.target, worldTransform);
        firingEffect.SetFiringTransform?.(OFFSET_EFFECT_WS, AGENT_TARGET_WS);
        const elapsed = Date.now() / 1000 - agent.fxStartTime;
        if (elapsed > this.sec) {
          firingEffect.StopFiring?.();
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
  UpdateAsyncronous(updateContext, parentTransform) {
    for (const fx of this.generatedFiringEffects) {
      fx?.UpdateEffectAsync?.(updateContext);
      fx?.UpdateVisibility?.(updateContext, parentTransform);
    }
  }

  /** Carbon PlayFX::UpdateSyncronous (cpp:150-156). */
  UpdateSyncronous(updateContext) {
    for (const fx of this.generatedFiringEffects) {
      fx?.UpdateEffectSync?.(updateContext);
    }
  }

  /** Carbon PlayFX::GetRenderables (cpp:158-164). */
  GetRenderables(renderables = []) {
    for (const fx of this.generatedFiringEffects) {
      fx?.GetRenderables?.(renderables);
    }
    return renderables;
  }

  /** Carbon PlayFX::RegisterComponents (cpp:202-215). */
  RegisterComponents() {
    const registry = this.GetComponentRegistry();
    if (registry) {
      for (const fx of this.generatedFiringEffects) {
        fx?.Register?.(registry);
      }
    }
  }

  /** Carbon PlayFX::UnRegisterComponents (cpp:217-230). */
  UnRegisterComponents() {
    const registry = this.GetComponentRegistry();
    if (registry) {
      for (const fx of this.generatedFiringEffects) {
        fx?.UnRegister?.(registry);
      }
    }
  }

  /** Carbon method RegisterWithQuadRenderer (cpp:239-245) - quad renderer
   * registration seam; the firing effect elements own the real quads. */
  RegisterWithQuadRenderer(_quadRenderer) {}

  /** Carbon method AddQuadsToQuadRenderer (cpp:253-259) - quad renderer
   * submission seam; the firing effect elements own the real quads. */
  AddQuadsToQuadRenderer(_frustum, _quadRenderer) {}

  // Grows or shrinks the cloned firing-effect list to the agent count (Carbon
  // CheckCount, cpp:262-299; BeClasses->CloneTo maps to CjsModel.Clone).
  #CheckCount(agentSize) {
    if (this.#count > agentSize) {
      const diff = this.#count - agentSize;
      for (let i = 0; i < diff; i++) {
        this.generatedFiringEffects.pop();
      }
      this.#count = agentSize;
    } else if (agentSize > this.#count) {
      if (this.firingEffect === null) {
        return;
      }
      const diff = agentSize - this.#count;
      for (let i = 0; i < diff; i++) {
        const newFx = this.firingEffect.Clone?.();
        if (!newFx) {
          return;
        }
        this.generatedFiringEffects.push(newFx);
      }
      this.#count = agentSize;
    }
  }
  static {
    _initClass();
  }
}

export { _PlayFX as PlayFX };
//# sourceMappingURL=PlayFX.js.map
