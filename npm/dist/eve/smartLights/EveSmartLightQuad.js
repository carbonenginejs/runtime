import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../child/EveChildTransform.js';
import { EveChildQuad as _EveChildQuad } from '../child/EveChildQuad.js';
import { resolveGroupColor } from './EveSmartLightBaseGroup.js';
import { Tr2Effect as _Tr2Effect } from '../../shader/Tr2Effect.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_brightness, _init_extra_brightness, _init_display, _init_extra_display, _init_staticQuadScale, _init_extra_staticQuadScale, _init_staticOffsetTranslation, _init_extra_staticOffsetTranslation, _init_editMode, _init_extra_editMode, _init_softQuad, _init_extra_softQuad, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor;

/** A smart-light group member that places faction-colour-aware flare quads at each distribution placement and submits them to the quad renderer. */
let _EveSmartLightQuad;
new class extends _identity {
  static [class EveSmartLightQuad extends _EveChildTransform {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_effect, _init_extra_effect, _init_brightness, _init_extra_brightness, _init_display, _init_extra_display, _init_staticQuadScale, _init_extra_staticQuadScale, _init_staticOffsetTranslation, _init_extra_staticOffsetTranslation, _init_editMode, _init_extra_editMode, _init_softQuad, _init_extra_softQuad, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor, _initProto],
        c: [_EveSmartLightQuad, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSmartLightQuad",
        family: "eve/smartLights"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "effect"], [[io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.vec3], 16, "staticQuadScale"], [[io, io.persist, type, type.vec3], 16, "staticOffsetTranslation"], [[io, io.readwrite, type, type.boolean], 16, "editMode"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "softQuad"], [[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.color], 16, "customColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface through the shared resolveGroupColor helper.")], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")], 18, "SetColor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("List events carry no BELIST insert mask; the inserted value (or, absent one, the whole list) is re-fanned - SetInheritProperties is idempotent.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The settle hook receives no changed-property list; the softQuad edit is detected by comparing the cached last-applied value.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2QuadRenderer::Instance() is engine-owned; Initialize caches the effect key and defers effect registration to RegisterWithQuadRenderer.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The quad renderer is an injected engine-owned capability; the Carbon arguments are forwarded through a duck-typed contract using EveChildQuad's shared quad definition.")], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon re-registers through the Tr2QuadRenderer singleton; the relocated renderer arrives via the threaded update context when present.")], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The quad renderer and frustum are injected engine-owned capabilities reached through duck-typed contracts; a missing frustum is treated as visible.")], 18, "AddQuadsToQuadRenderer"]], 0, void 0, _EveChildTransform));
    }
    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_initProto(this), _init_name(this, ""));

    /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
    effect = (_init_extra_name(this), _init_effect(this, null));

    /** m_brightness (float) [READWRITE, PERSIST] */
    brightness = (_init_extra_effect(this), _init_brightness(this, 1));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_brightness(this), _init_display(this, true));

    /** m_staticQuadScale (Vector3) [READWRITE, PERSIST] */
    staticQuadScale = (_init_extra_display(this), _init_staticQuadScale(this, vec3.fromValues(1, 1, 1)));

    /** m_staticOffsetTranslation (Vector3) [READWRITE, PERSIST] */
    staticOffsetTranslation = (_init_extra_staticQuadScale(this), _init_staticOffsetTranslation(this, vec3.create()));

    /** m_editMode (bool) [READWRITE] */
    editMode = (_init_extra_staticOffsetTranslation(this), _init_editMode(this, false));

    /** m_softQuad (bool) [READWRITE, PERSIST, NOTIFY] */
    softQuad = (_init_extra_editMode(this), _init_softQuad(this, false));

    // Flattened EveSmartLightBaseGroup secondary base (Carbon multiple
    // inheritance; EveSmartLightBaseGroup_Blue.cpp:15-20 - the wire format of
    // this class carries these fields).

    /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] (EveSmartLightBaseGroup.h:31) */
    factionColor = (_init_extra_softQuad(this), _init_factionColor(this, -1));

    /** m_useFactionColor (bool) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:32) */
    useFactionColor = (_init_extra_factionColor(this), _init_useFactionColor(this, false));

    /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] (EveSmartLightBaseGroup.h:29) */
    attributeModifiers = (_init_extra_useFactionColor(this), _init_attributeModifiers(this, []));

    /** m_color (Color) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:30) */
    customColor = (_init_extra_attributeModifiers(this), _init_customColor(this, vec4.createLinear()));

    /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
    #parentColorSet = (_init_extra_customColor(this), null);

    /** m_effectKey (unsigned) - cached Tr2Effect hash used as the quad-renderer bucket key (EveSmartLightQuad.h:59). */
    #effectKey = 0;

    /** m_activationStrength (float) - captured from the update params (EveSmartLightQuad.h:54). */
    #activationStrength = 1;

    /** Last softQuad value the settle hook applied (JS-only change detection). */
    #lastAppliedSoftQuad = false;

    /** Faction-aware group color (Carbon base EveSmartLightBaseGroup.cpp:43-53). */
    GetGroupColor() {
      return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet);
    }

    /** Overwrites the custom color (Carbon base EveSmartLightBaseGroup.cpp:55-58). */
    SetColor(color) {
      vec4.copy(this.customColor, color);
    }

    /**
     * Stores the inherited faction color set and fans it out to the attribute
     * modifiers (Carbon base EveSmartLightBaseGroup.cpp:30-41).
     */
    SetInheritProperties(colorSet) {
      if (colorSet) {
        this.#parentColorSet = colorSet;
      }
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.SetInheritProperties?.(colorSet);
      }
    }

    /** Fans a controller variable out to the attribute modifiers (Carbon base EveSmartLightBaseGroup.cpp:60-66). */
    SetControllerVariable(name, value) {
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.SetControllerVariable?.(name, value);
      }
    }

    /**
     * Newly inserted attribute modifiers inherit the parent color set (Carbon
     * base EveSmartLightBaseGroup.cpp:16-28).
     */
    OnListModified(_event, _key, _key2, value, list) {
      if (list === this.attributeModifiers && this.#parentColorSet) {
        if (value) {
          value.SetInheritProperties?.(this.#parentColorSet);
        } else {
          for (const attributeModifier of this.attributeModifiers) {
            attributeModifier?.SetInheritProperties?.(this.#parentColorSet);
          }
        }
      }
    }

    /** softQuad edits swap the flare-quad effect path (EveSmartLightQuad.cpp:36-54). */
    OnModified(_options = {}) {
      if (this.softQuad !== this.#lastAppliedSoftQuad) {
        this.#lastAppliedSoftQuad = this.softQuad;
        this.#ApplyEffectPath();
      }
      return true;
    }

    /**
     * Creates the default flare-quad effect when none was authored (Carbon
     * constructor, EveSmartLightQuad.cpp:10-34) and caches the effect key
     * (EveSmartLightQuad.cpp:56-65).
     */
    Initialize() {
      if (!this.effect) {
        this.effect = new _Tr2Effect();
        this.#ApplyEffectPath();
      }
      this.#effectKey = Number(this.effect.GetHashValue?.() ?? 0) >>> 0;
      this.#lastAppliedSoftQuad = this.softQuad;
      return true;
    }

    /** Registers the effect bucket with a quad renderer (EveSmartLightQuad.cpp:68-71). */
    RegisterWithQuadRenderer(quadRenderer) {
      quadRenderer?.RegisterEffect?.(this.#effectKey, TriBatchType.TRIBATCHTYPE_ADDITIVE, _EveSmartLightQuad.QUAD_INSTANCE_SIZE, 1, _EveChildQuad.GetQuadDefinition(), this.effect);
    }

    /**
     * Captures the activation strength, refreshes the effect key in edit mode,
     * and updates the attribute modifiers with full strength
     * (EveSmartLightQuad.cpp:73-98).
     */
    UpdateSyncronous(updateContext, params, _distribution) {
      this.#activationStrength = params?.activationStrength ?? 1;
      if (this.editMode) {
        if (this.effect) {
          const key = Number(this.effect.GetHashValue?.() ?? 0) >>> 0;
          if (key !== this.#effectKey) {
            this.#effectKey = key;
            const quadRenderer = updateContext?.GetQuadRenderer?.() ?? updateContext?.quadRenderer;
            if (quadRenderer) {
              this.RegisterWithQuadRenderer(quadRenderer);
            }
          }
        } else {
          this.#effectKey = 0;
        }
      }
      for (const attributeModifier of this.attributeModifiers) {
        attributeModifier?.UpdateSyncronous?.(updateContext, params, 1);
      }
    }

    /**
     * Rebuilds the world transform against the nearest parent's local-to-world
     * matrix (EveSmartLightQuad.cpp:100-114); the child parent wins over the
     * space object parent.
     */
    UpdateAsyncronous(_updateContext, params, _distribution) {
      let localToWorld = params?.localToWorldTransform ?? _EveSmartLightQuad.#identity;
      const parent = params?.childParent ?? params?.spaceObjectParent;
      if (parent?.GetLocalToWorldTransform) {
        const transform = parent.GetLocalToWorldTransform(_EveSmartLightQuad.#parentTransform);
        if (transform) {
          localToWorld = transform;
        }
      }
      this.UpdateTransform(localToWorld);
    }

    /**
     * Builds one frustum-culled quad per placement and submits it to the quad
     * renderer (EveSmartLightQuad.cpp:116-170). The transforms are packed as
     * Carbon's Vector4 rows (_11,_21,_31,_41 / ...), which on the shared
     * D3D-row-major / GL-column-major byte layout is the column-stride pattern
     * (m[0],m[4],m[8],m[12]) etc. Color/brightness stay float32; the half
     * packing happens at buffer-build time in the engine.
     */
    AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer) {
      if (!this.display || !this.effect) {
        return;
      }
      const statics = _EveSmartLightQuad;
      const quad = statics.#quad;
      const rotation = statics.#rotation;
      const position = statics.#position;
      const direction = statics.#direction;
      const worldPosition = statics.#worldPosition;
      const sphere = statics.#sphere;
      const color = statics.#color;
      const m = this.worldTransform;
      const groupColor = this.GetGroupColor();
      const count = Math.min(Number(size ?? placements?.length ?? 0), placements?.length ?? 0);
      for (let index = 0; index < count; index++) {
        const placement = placements[index];
        const scaleX = placement.initialScale[0] * placement.additionalScale[0] * this.staticQuadScale[0];
        const scaleY = placement.initialScale[1] * placement.additionalScale[1] * this.staticQuadScale[1];
        const scaleZ = placement.initialScale[2] * placement.additionalScale[2] * this.staticQuadScale[2];
        vec3.set(position, 0, 0, 0);
        // Carbon (row-vector): initialRotation * additionalRotation - initialRotation first.
        quat.multiply(rotation, placement.additionalRotation, placement.initialRotation);
        const offset = this.staticOffsetTranslation;
        if (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0) {
          // TriVectorRotateQuaternion == vec3.transformQuat (q v q* on both sides).
          vec3.transformQuat(position, offset, rotation);
        }
        vec3.set(direction, 0, 1, 0);
        vec3.transformQuat(direction, direction, rotation);
        // TriVectorRotateMatrix: rotate by the world basis only (no translation).
        statics.#TransformNormal(direction, direction, m);
        vec3.add(position, position, placement.initialTranslation);
        vec3.add(position, position, placement.additionalTranslation);
        const maxScale = Math.max(scaleX, scaleY, scaleZ);
        // TransformCoord == vec3.transformMat4 - identical on the shared layout.
        vec3.transformMat4(worldPosition, position, m);
        vec4.set(sphere, worldPosition[0], worldPosition[1], worldPosition[2], maxScale);
        if (frustum?.IsSphereVisible?.(sphere) !== false) {
          const strength = this.#activationStrength;
          vec3.set(color, groupColor[0] * strength, groupColor[1] * strength, groupColor[2] * strength);
          for (const attributeModifier of this.attributeModifiers) {
            attributeModifier?.ProcessAttributeModifier?.(color, placement, worldPosition, direction, strength);
          }
          vec4.set(quad.parentTransform0, m[0], m[4], m[8], m[12]);
          vec4.set(quad.parentTransform1, m[1], m[5], m[9], m[13]);
          vec4.set(quad.parentTransform2, m[2], m[6], m[10], m[14]);
          vec4.set(quad.localTransform0, scaleX, 0, 0, position[0]);
          vec4.set(quad.localTransform1, 0, scaleY, 0, position[1]);
          vec4.set(quad.localTransform2, 0, 0, scaleZ, position[2]);
          vec4.set(quad.color, color[0], color[1], color[2], this.customColor[3]);
          quad.brightness[0] = this.brightness;
          quad.brightness[1] = 0;
          quadRenderer?.AddQuads?.(this.#effectKey, quad, 1);
        }
      }
    }

    /** Applies the softQuad-selected flare effect path (EveSmartLightQuad.cpp:25-33 and cpp:40-51). */
    #ApplyEffectPath() {
      this.effect?.SetEffectPathName?.(this.softQuad ? "res:/Graphics/Effect/Managed/Space/SpecialFX/flarequadsoft.fx" : "res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx");
    }

    /** sizeof(EveSmartLightQuad::SimplifiedQuad): 6 * 16 + 4 * 2 + 2 * 2 bytes (EveSmartLightQuad.h:38-49). */

    /** TriVectorRotateMatrix (TriMath.cpp:81-94): basis-rows multiply, no translation. */

    // m_quad-equivalent CPU record (SimplifiedQuad, EveSmartLightQuad.h:38-49) -
    // scratch reused across placements; the quad renderer copies on AddQuads.
  }];
  QUAD_INSTANCE_SIZE = 108;
  #TransformNormal(out, direction, matrix) {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }
  #quad = {
    parentTransform0: vec4.create(),
    parentTransform1: vec4.create(),
    parentTransform2: vec4.create(),
    localTransform0: vec4.create(),
    localTransform1: vec4.create(),
    localTransform2: vec4.create(),
    color: vec4.create(),
    brightness: new Float32Array(2)
  };
  #identity = mat4.create();
  #parentTransform = mat4.create();
  #rotation = quat.create();
  #position = vec3.create();
  #direction = vec3.create();
  #worldPosition = vec3.create();
  #sphere = vec4.create();
  #color = vec3.create();
  constructor() {
    super(_EveSmartLightQuad), _initClass();
  }
}();

export { _EveSmartLightQuad as EveSmartLightQuad };
//# sourceMappingURL=EveSmartLightQuad.js.map
