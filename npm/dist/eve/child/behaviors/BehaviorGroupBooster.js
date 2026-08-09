import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { carbonPerlin1D } from '@carbonenginejs/runtime-utils/noise';
import { Tr2Effect as _Tr2Effect } from '../../../shader/Tr2Effect.js';

let _initProto, _initClass, _init_display, _init_extra_display, _init_boosterOffset, _init_extra_boosterOffset, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_boosterEffect, _init_extra_boosterEffect, _init_flareCount, _init_extra_flareCount, _init_displayAmbientFlare, _init_extra_displayAmbientFlare, _init_displayBoosters, _init_extra_displayBoosters, _init_displayHazeFlare, _init_extra_displayHazeFlare, _init_ambientFlareBrightness, _init_extra_ambientFlareBrightness, _init_haloFlareBrightness, _init_extra_haloFlareBrightness, _init_ambientFlareColor, _init_extra_ambientFlareColor, _init_haloFlareColor, _init_extra_haloFlareColor, _init_lightColor, _init_extra_lightColor, _init_ambientFlareEffect, _init_extra_ambientFlareEffect, _init_haloFlareEffect, _init_extra_haloFlareEffect, _init_ambientFlareNoiseAmplitude, _init_extra_ambientFlareNoiseAmplitude, _init_haloFlareNoiseAmplitude, _init_extra_haloFlareNoiseAmplitude, _init_ambientFlareNoiseOctaves, _init_extra_ambientFlareNoiseOctaves, _init_haloFlareNoiseOctaves, _init_extra_haloFlareNoiseOctaves, _init_ambientFlareNoiseSpeed, _init_extra_ambientFlareNoiseSpeed, _init_haloFlareNoiseSpeed, _init_extra_haloFlareNoiseSpeed, _init_ambientFlareOffset, _init_extra_ambientFlareOffset, _init_haloFlareOffset, _init_extra_haloFlareOffset, _init_lightRadius, _init_extra_lightRadius, _init_ambientFlareScale, _init_extra_ambientFlareScale, _init_haloFlareScale, _init_extra_haloFlareScale;

// Module scratch for the light registration path.
const LIGHT_COLOR = vec4.create();

/** A drone-group component that builds and drives the group's shared booster and ambient or halo flare effects and contributes their point light to the scene. */
let _BehaviorGroupBooster;
new class extends _identity {
  static [class BehaviorGroupBooster extends CjsModel {
    static {
      ({
        e: [_init_display, _init_extra_display, _init_boosterOffset, _init_extra_boosterOffset, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_boosterEffect, _init_extra_boosterEffect, _init_flareCount, _init_extra_flareCount, _init_displayAmbientFlare, _init_extra_displayAmbientFlare, _init_displayBoosters, _init_extra_displayBoosters, _init_displayHazeFlare, _init_extra_displayHazeFlare, _init_ambientFlareBrightness, _init_extra_ambientFlareBrightness, _init_haloFlareBrightness, _init_extra_haloFlareBrightness, _init_ambientFlareColor, _init_extra_ambientFlareColor, _init_haloFlareColor, _init_extra_haloFlareColor, _init_lightColor, _init_extra_lightColor, _init_ambientFlareEffect, _init_extra_ambientFlareEffect, _init_haloFlareEffect, _init_extra_haloFlareEffect, _init_ambientFlareNoiseAmplitude, _init_extra_ambientFlareNoiseAmplitude, _init_haloFlareNoiseAmplitude, _init_extra_haloFlareNoiseAmplitude, _init_ambientFlareNoiseOctaves, _init_extra_ambientFlareNoiseOctaves, _init_haloFlareNoiseOctaves, _init_extra_haloFlareNoiseOctaves, _init_ambientFlareNoiseSpeed, _init_extra_ambientFlareNoiseSpeed, _init_haloFlareNoiseSpeed, _init_extra_haloFlareNoiseSpeed, _init_ambientFlareOffset, _init_extra_ambientFlareOffset, _init_haloFlareOffset, _init_extra_haloFlareOffset, _init_lightRadius, _init_extra_lightRadius, _init_ambientFlareScale, _init_extra_ambientFlareScale, _init_haloFlareScale, _init_extra_haloFlareScale, _initProto],
        c: [_BehaviorGroupBooster, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "BehaviorGroupBooster",
        family: "eve/child/behaviors"
      })], [[[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.vec3], 16, "boosterOffset"], [[io, io.persist, type, type.uint32], 16, "atlasIndex0"], [[io, io.persist, type, type.uint32], 16, "atlasIndex1"], [[io, io.persist, void 0, type.model("Tr2Effect")], 16, "boosterEffect"], [[io, io.read, type, type.uint32], 16, "flareCount"], [[io, io.readwrite, type, type.boolean], 16, "displayAmbientFlare"], [[io, io.readwrite, type, type.boolean], 16, "displayBoosters"], [[io, io.readwrite, type, type.boolean], 16, "displayHazeFlare"], [[io, io.notify, io, io.persist, type, type.float32], 16, "ambientFlareBrightness"], [[io, io.notify, io, io.persist, type, type.float32], 16, "haloFlareBrightness"], [[io, io.notify, io, io.persist, type, type.color], 16, "ambientFlareColor"], [[io, io.notify, io, io.persist, type, type.color], 16, "haloFlareColor"], [[io, io.persist, type, type.color], 16, "lightColor"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "ambientFlareEffect"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2Effect")], 16, "haloFlareEffect"], [[io, io.persist, type, type.float32], 16, "ambientFlareNoiseAmplitude"], [[io, io.persist, type, type.float32], 16, "haloFlareNoiseAmplitude"], [[io, io.persist, type, type.uint32], 16, "ambientFlareNoiseOctaves"], [[io, io.persist, type, type.uint32], 16, "haloFlareNoiseOctaves"], [[io, io.persist, type, type.float32], 16, "ambientFlareNoiseSpeed"], [[io, io.persist, type, type.float32], 16, "haloFlareNoiseSpeed"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "ambientFlareOffset"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "haloFlareOffset"], [[io, io.persist, type, type.float32], 16, "lightRadius"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "ambientFlareScale"], [[io, io.notify, io, io.persist, type, type.vec3], 16, "haloFlareScale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Effect graph construction is ported; Tr2QuadRenderer::Instance() flare registration and the quad buffers are renderer-owned seams.")], 18, "InitializeEffects"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLightSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOffset"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAtlasIndex0"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAtlasIndex1"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEffect"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The flare Quad lists are GPU quad packing owned by the quad-renderer seam; only the CPU count is tracked.")], 18, "RebuildFlareBuffer"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's frame clock maps to Date.now seconds for the noise phase; the light registers through the duck-typed manager (AddPointLight), never a GPU structure.")], 18, "AddLight"], [[carbon, carbon.method, impl, impl.noop], 18, "Initialize"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "AddFlare"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatch"], [[carbon, carbon.method, impl, impl.noop], 18, "CreateBuffer"], [[carbon, carbon.method, impl, impl.noop], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.noop], 18, "AddQuadsToQuadRenderer"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_haloFlareScale(this);
    }
    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_initProto(this), _init_display(this, true));

    /** m_boosterOffset (Vector3) [READWRITE, PERSIST] */
    boosterOffset = (_init_extra_display(this), _init_boosterOffset(this, vec3.create()));

    /** m_atlasIndex0 (uint32_t) [READWRITE, PERSIST] */
    atlasIndex0 = (_init_extra_boosterOffset(this), _init_atlasIndex(this, 0));

    /** m_atlasIndex1 (uint32_t) [READWRITE, PERSIST] */
    atlasIndex1 = (_init_extra_atlasIndex(this), _init_atlasIndex2(this, 0));

    /** m_boosterEffect (Tr2EffectPtr) [READWRITE, PERSIST] */
    boosterEffect = (_init_extra_atlasIndex2(this), _init_boosterEffect(this, null));

    /** m_flareCount (unsigned int) [READ] */
    flareCount = (_init_extra_boosterEffect(this), _init_flareCount(this, 0));

    /** m_displayAmbientFlare (bool) [READWRITE] */
    displayAmbientFlare = (_init_extra_flareCount(this), _init_displayAmbientFlare(this, true));

    /** m_displayBoosters (bool) [READWRITE] */
    displayBoosters = (_init_extra_displayAmbientFlare(this), _init_displayBoosters(this, true));

    /** m_displayHazeFlare (bool) [READWRITE] */
    displayHazeFlare = (_init_extra_displayBoosters(this), _init_displayHazeFlare(this, true));

    /** m_ambientFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
    ambientFlareBrightness = (_init_extra_displayHazeFlare(this), _init_ambientFlareBrightness(this, 0));

    /** m_haloFlareBrightness (float) [READWRITE, PERSIST, NOTIFY] */
    haloFlareBrightness = (_init_extra_ambientFlareBrightness(this), _init_haloFlareBrightness(this, 0));

    /** m_ambientFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
    ambientFlareColor = (_init_extra_haloFlareBrightness(this), _init_ambientFlareColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_haloFlareColor (Color) [READWRITE, PERSIST, NOTIFY] */
    haloFlareColor = (_init_extra_ambientFlareColor(this), _init_haloFlareColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_lightColor (Color) [READWRITE, PERSIST] */
    lightColor = (_init_extra_haloFlareColor(this), _init_lightColor(this, vec4.fromValues(1, 1, 1, 1)));

    /** m_ambientFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
    ambientFlareEffect = (_init_extra_lightColor(this), _init_ambientFlareEffect(this, null));

    /** m_haloFlareEffect (Tr2EffectPtr) [READWRITE, PERSIST, NOTIFY] */
    haloFlareEffect = (_init_extra_ambientFlareEffect(this), _init_haloFlareEffect(this, null));

    /** m_ambientFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
    ambientFlareNoiseAmplitude = (_init_extra_haloFlareEffect(this), _init_ambientFlareNoiseAmplitude(this, 0.2));

    /** m_haloFlareNoiseAmplitude (float) [READWRITE, PERSIST] */
    haloFlareNoiseAmplitude = (_init_extra_ambientFlareNoiseAmplitude(this), _init_haloFlareNoiseAmplitude(this, 0.2));

    /** m_ambientFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
    ambientFlareNoiseOctaves = (_init_extra_haloFlareNoiseAmplitude(this), _init_ambientFlareNoiseOctaves(this, 1));

    /** m_haloFlareNoiseOctaves (uint32_t) [READWRITE, PERSIST] */
    haloFlareNoiseOctaves = (_init_extra_ambientFlareNoiseOctaves(this), _init_haloFlareNoiseOctaves(this, 1));

    /** m_ambientFlareNoiseSpeed (float) [READWRITE, PERSIST] */
    ambientFlareNoiseSpeed = (_init_extra_haloFlareNoiseOctaves(this), _init_ambientFlareNoiseSpeed(this, 1));

    /** m_haloFlareNoiseSpeed (float) [READWRITE, PERSIST] */
    haloFlareNoiseSpeed = (_init_extra_ambientFlareNoiseSpeed(this), _init_haloFlareNoiseSpeed(this, 1));

    /** m_ambientFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
    ambientFlareOffset = (_init_extra_haloFlareNoiseSpeed(this), _init_ambientFlareOffset(this, vec3.create()));

    /** m_haloFlareOffset (Vector3) [READWRITE, PERSIST, NOTIFY] */
    haloFlareOffset = (_init_extra_ambientFlareOffset(this), _init_haloFlareOffset(this, vec3.create()));

    /** m_lightRadius (float) [READWRITE, PERSIST] */
    lightRadius = (_init_extra_haloFlareOffset(this), _init_lightRadius(this, 3.5));

    /** m_ambientFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
    ambientFlareScale = (_init_extra_lightRadius(this), _init_ambientFlareScale(this, vec3.fromValues(1, 1, 1)));

    /** m_haloFlareScale (Vector3) [READWRITE, PERSIST, NOTIFY] */
    haloFlareScale = (_init_extra_ambientFlareScale(this), _init_haloFlareScale(this, vec3.fromValues(1, 1, 1)));

    /**
     * Creates the hardcoded booster and flare effects when absent (Carbon
     * InitializeEffects, cpp:149-166). Carbon also registers the flare effects
     * with the Tr2QuadRenderer singleton - a quad-renderer/GPU seam that the
     * JS port omits.
     */
    InitializeEffects() {
      if (this.boosterEffect === null) {
        this.boosterEffect = _BehaviorGroupBooster.#CreateBoosterEffect("BOOSTER_LOD_HIGH");
      }
      if (this.ambientFlareEffect === null) {
        this.ambientFlareEffect = _BehaviorGroupBooster.#CreateFlareEffect();
      }
      if (this.haloFlareEffect === null) {
        this.haloFlareEffect = _BehaviorGroupBooster.#CreateFlareEffect();
      }
    }

    /** Carbon BehaviorGroupBooster::GetDisplay (cpp:254-257). */
    GetDisplay() {
      return this.display;
    }

    /** Carbon BehaviorGroupBooster::GetLightSize (cpp:259-266). */
    GetLightSize() {
      if (this.display) {
        return this.lightRadius;
      }
      return 0;
    }

    /** Carbon BehaviorGroupBooster::GetOffset (cpp:268-271). */
    GetOffset() {
      return this.boosterOffset;
    }

    /** Carbon BehaviorGroupBooster::GetAtlasIndex0 (cpp:273-276). */
    GetAtlasIndex0() {
      return this.atlasIndex0;
    }

    /** Carbon BehaviorGroupBooster::GetAtlasIndex1 (cpp:278-281). */
    GetAtlasIndex1() {
      return this.atlasIndex1;
    }

    /** Carbon BehaviorGroupBooster::GetEffect (cpp:365-368). */
    GetEffect() {
      return this.boosterEffect;
    }

    /**
     * Tracks the flare instance count (Carbon RebuildFlareBuffer, cpp:359-363).
     * The Quad lists Carbon resizes alongside it are GPU quad packing, kept
     * with the quad-renderer seam.
     */
    RebuildFlareBuffer(count) {
      this.flareCount = Math.max(0, Number(count) | 0);
    }

    /**
     * Registers one booster point light with the duck-typed light manager
     * (Carbon AddLight, cpp:435-445). Carbon ignores the parentTransform
     * parameter; the JS port keeps the signature.
     * @param {Object} lightManager
     * @param {Float32Array} position - light position (xyz read)
     * @param {Number} radiusModifier
     * @param {Number} agentIndex - phase-offsets the noise
     * @param {Float32Array} _parentTransform - unused (as Carbon)
     */
    AddLight(lightManager, position, radiusModifier, agentIndex, _parentTransform) {
      vec4.copy(LIGHT_COLOR, this.lightColor);
      if (this.ambientFlareNoiseAmplitude !== 0) {
        const time = Date.now() / 1000 + agentIndex * 0.01;
        const noise = carbonPerlin1D(time * this.ambientFlareNoiseSpeed, 2, 2, this.ambientFlareNoiseOctaves);
        vec4.scale(LIGHT_COLOR, LIGHT_COLOR, (noise + 1) / 2 * this.ambientFlareNoiseAmplitude);
      }
      lightManager?.AddPointLight?.(position, radiusModifier * this.lightRadius, LIGHT_COLOR);
    }

    /** Carbon method Initialize (cpp:119-147) - flare quad setup and the
     * booster instanced vertex declaration; renderer-owned in JS. */
    Initialize() {
      return true;
    }

    /** Carbon method AddFlare (cpp:447-515) - fills the GPU flare quad lists. */
    AddFlare(..._args) {
      throw new Error("BehaviorGroupBooster.AddFlare is not implemented in CarbonEngineJS (GPU flare-quad fill).");
    }

    /** Carbon method GetBatch (cpp:375-400) - builds the instanced render batch. */
    GetBatch(..._args) {
      throw new Error("BehaviorGroupBooster.GetBatch is not implemented in CarbonEngineJS (render-batch construction).");
    }

    /** Carbon method CreateBuffer (cpp:351-357) - procedural GPU vertex buffer. */
    CreateBuffer() {}

    /** Carbon method RegisterWithQuadRenderer (cpp:402-415) - quad renderer
     * effect registration seam. */
    RegisterWithQuadRenderer(_quadRenderer) {}

    /** Carbon method AddQuadsToQuadRenderer (cpp:417-433) - quad renderer
     * submission seam. */
    AddQuadsToQuadRenderer(_frustum, _quadRenderer) {}

    // Builds the hardcoded volumetric drone booster effect (Carbon
    // CreateBoosterEffect + SetupBoosterEffect, cpp:284-336).
    /**
     * Builds and configures the drone booster effect, including its noise, colour and texture parameters.
     */

    // Builds the shared flare quad effect (Carbon CreateFlareEffect, cpp:338-349).
    /**
     * Builds the shared flare-quad effect used by both the ambient and halo flares.
     */
  }];
  #CreateBoosterEffect(lodOption) {
    const effect = new _Tr2Effect();
    effect.StartUpdate();
    effect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/Booster/DroneBoosterVolumetric.fx");
    effect.SetOption("BOOSTER_LOD", lodOption);
    effect.AddParameterFloat("NoiseSpeed0", 6);
    effect.AddParameterVector4("NoiseAmplitudeStart0", vec4.fromValues(-0.05, -0.05, -0.05, -0.05));
    effect.AddParameterVector4("NoiseAmplitudeEnd0", vec4.fromValues(0.1, 0.1, 0.1, 0.2));
    effect.AddParameterVector4("NoiseFrequency0", vec4.fromValues(0.1, 0.1, 0, 0.1));
    effect.AddParameterColor("Color0", vec4.fromValues(10, 13, 15, 0));
    effect.AddParameterFloat("NoiseSpeed1", 6);
    effect.AddParameterVector4("NoiseAmplitudeStart1", vec4.fromValues(-0.05, -0.05, -0.05, -0.05));
    effect.AddParameterVector4("NoiseAmplitudeEnd1", vec4.fromValues(0.14, 0.7, 0.14, 0.14));
    effect.AddParameterColor("Color1", vec4.fromValues(15, 13, 13, 0));

    // omitted warping, since these drones don't warp yet (Carbon comment);
    // NoiseFrequency1 is likewise absent in Carbon's setup.

    effect.AddParameterVector4("ShapeAtlasSize", vec4.fromValues(256, 8, 0, 0));
    effect.AddParameterVector4("BoosterScale", vec4.fromValues(1, 1, 1, 1));
    effect.AddResourceTexture2D("ShapeMap", "res:/dx9/model/booster/shape01.dds");
    effect.AddResourceTexture2D("GradientMap0", "res:/dx9/model/booster/gradient01.dds");
    effect.AddResourceTexture2D("GradientMap1", "res:/dx9/model/booster/gradient02.dds");
    effect.AddResourceTexture2D("NoiseMap", "res:/Texture/Global/noise32cube_volume.dds");
    effect.EndUpdate();
    return effect;
  }
  #CreateFlareEffect() {
    const effect = new _Tr2Effect();
    effect.StartUpdate();
    effect.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx");
    effect.EndUpdate();
    return effect;
  }
  constructor() {
    super(_BehaviorGroupBooster), _initClass();
  }
}();

export { _BehaviorGroupBooster as BehaviorGroupBooster };
//# sourceMappingURL=BehaviorGroupBooster.js.map
