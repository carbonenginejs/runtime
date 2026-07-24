import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSmartLightAttributeModifierBucket as _EveSmartLightAttribu$1 } from './EveSmartLightAttributeModifierBucket.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_minimumDistance, _init_extra_minimumDistance, _init_maximumDistance, _init_extra_maximumDistance, _init_lookAtVisionCone, _init_extra_lookAtVisionCone, _init_useCameraDistance, _init_extra_useCameraDistance, _init_inverselookAtFormula, _init_extra_inverselookAtFormula, _init_useCameraLookAt, _init_extra_useCameraLookAt, _init_inverseDistanceFormula, _init_extra_inverseDistanceFormula, _init_useCameraPlacement, _init_extra_useCameraPlacement, _init_inversePlacementFormula, _init_extra_inversePlacementFormula, _init_angleOverwrite, _init_extra_angleOverwrite, _init_positionOverwrite, _init_extra_positionOverwrite, _init_lookAtIntensity, _init_extra_lookAtIntensity, _init_placementIntensity, _init_extra_placementIntensity, _init_overwriteObjectDirection, _init_extra_overwriteObjectDirection, _init_overwritePosition, _init_extra_overwritePosition, _init_maximumActivation, _init_extra_maximumActivation, _init_minimumActivation, _init_extra_minimumActivation;

/** EveSmartLightAttributeModifierCameraDependency (eve/smartLights/attributeModifiers) - generated from schema shapeHash 5e9c1bd9.... */
let _EveSmartLightAttribu;
new class extends _identity {
  static [class EveSmartLightAttributeModifierCameraDependency extends _EveSmartLightAttribu$1 {
    static {
      ({
        e: [_init_minimumDistance, _init_extra_minimumDistance, _init_maximumDistance, _init_extra_maximumDistance, _init_lookAtVisionCone, _init_extra_lookAtVisionCone, _init_useCameraDistance, _init_extra_useCameraDistance, _init_inverselookAtFormula, _init_extra_inverselookAtFormula, _init_useCameraLookAt, _init_extra_useCameraLookAt, _init_inverseDistanceFormula, _init_extra_inverseDistanceFormula, _init_useCameraPlacement, _init_extra_useCameraPlacement, _init_inversePlacementFormula, _init_extra_inversePlacementFormula, _init_angleOverwrite, _init_extra_angleOverwrite, _init_positionOverwrite, _init_extra_positionOverwrite, _init_lookAtIntensity, _init_extra_lookAtIntensity, _init_placementIntensity, _init_extra_placementIntensity, _init_overwriteObjectDirection, _init_extra_overwriteObjectDirection, _init_overwritePosition, _init_extra_overwritePosition, _init_maximumActivation, _init_extra_maximumActivation, _init_minimumActivation, _init_extra_minimumActivation, _initProto],
        c: [_EveSmartLightAttribu, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightAttributeModifierCameraDependency",
        family: "eve/smartLights/attributeModifiers"
      })], [[[io, io.persist, type, type.float32], 16, "minimumDistance"], [[io, io.persist, type, type.float32], 16, "maximumDistance"], [[io, io.persist, type, type.float32], 16, "lookAtVisionCone"], [[io, io.persist, type, type.boolean], 16, "useCameraDistance"], [[io, io.persist, type, type.boolean], 16, "inverselookAtFormula"], [[io, io.persist, type, type.boolean], 16, "useCameraLookAt"], [[io, io.persist, type, type.boolean], 16, "inverseDistanceFormula"], [[io, io.persist, type, type.boolean], 16, "useCameraPlacement"], [[io, io.persist, type, type.boolean], 16, "inversePlacementFormula"], [[io, io.persist, type, type.vec3], 16, "angleOverwrite"], [[io, io.persist, type, type.vec3], 16, "positionOverwrite"], [[io, io.persist, type, type.float32], 16, "lookAtIntensity"], [[io, io.persist, type, type.float32], 16, "placementIntensity"], [[io, io.persist, type, type.boolean], 16, "overwriteObjectDirection"], [[io, io.persist, type, type.boolean], 16, "overwritePosition"], [[io, io.persist, type, type.float32], 16, "maximumActivation"], [[io, io.persist, type, type.float32], 16, "minimumActivation"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reads Tr2Renderer view statics; the relocated camera state is captured from the update context's render context here because ProcessAttributeModifier carries no context.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessAttributeModifier"]], 0, void 0, _EveSmartLightAttribu$1));
    }
    /** m_minimumDistance (float) [READWRITE, PERSIST] */
    minimumDistance = (_initProto(this), _init_minimumDistance(this, 1000));

    /** m_maximumDistance (float) [READWRITE, PERSIST] */
    maximumDistance = (_init_extra_minimumDistance(this), _init_maximumDistance(this, 10000));

    /** m_lookAtVisionCone (float) [READWRITE, PERSIST] */
    lookAtVisionCone = (_init_extra_maximumDistance(this), _init_lookAtVisionCone(this, 30));

    /** m_useCameraDistance (bool) [READWRITE, PERSIST] */
    useCameraDistance = (_init_extra_lookAtVisionCone(this), _init_useCameraDistance(this, false));

    /** m_inverselookAtFormula (bool) [READWRITE, PERSIST] */
    inverselookAtFormula = (_init_extra_useCameraDistance(this), _init_inverselookAtFormula(this, false));

    /** m_useCameraLookAt (bool) [READWRITE, PERSIST] */
    useCameraLookAt = (_init_extra_inverselookAtFormula(this), _init_useCameraLookAt(this, false));

    /** m_inverseDistanceFormula (bool) [READWRITE, PERSIST] */
    inverseDistanceFormula = (_init_extra_useCameraLookAt(this), _init_inverseDistanceFormula(this, false));

    /** m_useCameraPlacement (bool) [READWRITE, PERSIST] */
    useCameraPlacement = (_init_extra_inverseDistanceFormula(this), _init_useCameraPlacement(this, false));

    /** m_inversePlacementFormula (bool) [READWRITE, PERSIST] */
    inversePlacementFormula = (_init_extra_useCameraPlacement(this), _init_inversePlacementFormula(this, false));

    /** m_angleOverwrite (Vector3) [READWRITE, PERSIST] */
    angleOverwrite = (_init_extra_inversePlacementFormula(this), _init_angleOverwrite(this, vec3.create()));

    /** m_positionOverwrite (Vector3) [READWRITE, PERSIST] */
    positionOverwrite = (_init_extra_angleOverwrite(this), _init_positionOverwrite(this, vec3.create()));

    /** m_lookAtIntencity (float) [READWRITE, PERSIST] */
    lookAtIntensity = (_init_extra_positionOverwrite(this), _init_lookAtIntensity(this, 1));

    /** m_placementIntencity (float) [READWRITE, PERSIST] */
    placementIntensity = (_init_extra_lookAtIntensity(this), _init_placementIntensity(this, 1));

    /** m_overwriteDirection (bool) [READWRITE, PERSIST] */
    overwriteObjectDirection = (_init_extra_placementIntensity(this), _init_overwriteObjectDirection(this, false));

    /** m_overwritePosition (bool) [READWRITE, PERSIST] */
    overwritePosition = (_init_extra_overwriteObjectDirection(this), _init_overwritePosition(this, false));

    /** m_maximumActivation (float) [READWRITE, PERSIST] */
    maximumActivation = (_init_extra_overwritePosition(this), _init_maximumActivation(this, 1));

    /** m_minimumActivation (float) [READWRITE, PERSIST] */
    minimumActivation = (_init_extra_maximumActivation(this), _init_minimumActivation(this, 0));

    /** Camera state source captured per update; Carbon reads Tr2Renderer statics. */
    #renderContext = (_init_extra_minimumActivation(this), null);

    /**
     * Advances only this modifier's crossfade - Carbon deliberately does NOT
     * update the child modifiers here
     * (EveSmartLightAttributeModifierCameraDependency.cpp:31-34). The relocated
     * camera state (Tr2Renderer::GetViewPosition/GetViewLookAt) is captured from
     * the update context for use in ProcessAttributeModifier.
     */
    UpdateSyncronous(updateContext, _params, activationMultiplier) {
      this.#renderContext = updateContext?.renderContext ?? null;
      this.UpdateActivationStrength(activationMultiplier, updateContext?.GetDeltaT?.() ?? 0);
    }

    /**
     * Scales the child modifiers by the camera-dependent activation value
     * (EveSmartLightAttributeModifierCameraDependency.cpp:106-117).
     */
    ProcessAttributeModifier(attribute, placement, entityPosition, entityDirection, modifierStrength) {
      const activationValue = this.#GetActivationValue(entityPosition, entityDirection);
      if (activationValue !== 0) {
        const childStrength = activationValue * modifierStrength * this.attributeMultiplier;
        for (const attributeModifier of this.attributeModifiers) {
          attributeModifier?.ProcessAttributeModifier?.(attribute, placement, entityPosition, entityDirection, childStrength);
        }
      }
    }

    /**
     * Product of the enabled camera amplitudes, remapped into the
     * [minimumActivation, maximumActivation] range
     * (EveSmartLightAttributeModifierCameraDependency.cpp:95-104).
     */
    #GetActivationValue(objectPosition, entityDirection) {
      const camPos = this.#renderContext?.GetViewPosition?.() ?? _EveSmartLightAttribu.#zero;
      const vec2obj = _EveSmartLightAttribu.#vec2obj;
      if (this.overwritePosition) {
        vec3.subtract(vec2obj, this.positionOverwrite, camPos);
      } else {
        vec3.subtract(vec2obj, objectPosition, camPos);
      }
      let activationValue = 1;
      activationValue *= this.#GetDistanceAmplitude(vec2obj);
      activationValue *= this.#GetLookAtAmplitude(vec2obj);
      activationValue *= this.#GetPlacementAmplitude(vec2obj, entityDirection);
      return this.minimumActivation + (this.maximumActivation - this.minimumActivation) * activationValue;
    }

    /** Normalized camera-distance ramp (EveSmartLightAttributeModifierCameraDependency.cpp:36-50). */
    #GetDistanceAmplitude(vec2obj) {
      if (!this.useCameraDistance) {
        return 1;
      }
      const distance = vec3.length(vec2obj);
      let distanceAmplitude = Math.min(1, Math.max(0, (distance - this.minimumDistance) / (this.maximumDistance - this.minimumDistance)));
      if (this.inverseDistanceFormula) {
        distanceAmplitude = 1 - distanceAmplitude;
      }
      return distanceAmplitude;
    }

    /**
     * Camera look-at cone amplitude
     * (EveSmartLightAttributeModifierCameraDependency.cpp:52-72). Carbon's
     * Tr2Renderer::GetViewLookAt() is the view matrix column (_13,_23,_33),
     * which on the shared byte layout is view[2], view[6], view[10].
     */
    #GetLookAtAmplitude(vec2obj) {
      if (!this.useCameraLookAt) {
        return 1;
      }
      const view = this.#renderContext?.GetViewTransform?.();
      if (!view) {
        return 1;
      }
      const scratch = _EveSmartLightAttribu.#normalized;
      vec3.normalize(scratch, vec2obj);
      let lookAtAmplitude = -(view[2] * scratch[0] + view[6] * scratch[1] + view[10] * scratch[2]);
      if (this.lookAtVisionCone < 90 && this.lookAtVisionCone > 0) {
        const startValue = (90 - this.lookAtVisionCone) / 90;
        lookAtAmplitude = Math.max(lookAtAmplitude - startValue, 0) / (1 - startValue);
      }
      lookAtAmplitude = Math.pow(lookAtAmplitude, this.lookAtIntensity);
      if (this.inverselookAtFormula) {
        lookAtAmplitude = 1 - lookAtAmplitude;
      }
      return lookAtAmplitude;
    }

    /** Entity-facing amplitude (EveSmartLightAttributeModifierCameraDependency.cpp:74-93). */
    #GetPlacementAmplitude(vec2obj, entityDirection) {
      if (!this.useCameraPlacement) {
        return 1;
      }
      const statics = _EveSmartLightAttribu;
      let eDir = entityDirection;
      if (this.overwriteObjectDirection) {
        eDir = vec3.normalize(statics.#direction, this.angleOverwrite);
      }
      const scratch = statics.#normalized;
      vec3.normalize(scratch, vec2obj);
      let placementAmplitude = Math.max(0, -vec3.dot(scratch, eDir));
      if (this.placementIntensity !== 1) {
        placementAmplitude = Math.pow(placementAmplitude, this.placementIntensity);
      }
      if (this.inversePlacementFormula) {
        placementAmplitude = 1 - placementAmplitude;
      }
      return placementAmplitude;
    }
  }];
  #zero = vec3.create();
  #vec2obj = vec3.create();
  #normalized = vec3.create();
  #direction = vec3.create();
  constructor() {
    super(_EveSmartLightAttribu), _initClass();
  }
}();

export { _EveSmartLightAttribu as EveSmartLightAttributeModifierCameraDependency };
//# sourceMappingURL=EveSmartLightAttributeModifierCameraDependency.js.map
