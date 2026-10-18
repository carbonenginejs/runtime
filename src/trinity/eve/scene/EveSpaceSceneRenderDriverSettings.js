// Source: trinity/trinity/Eve/EveSpaceSceneRenderDriver.h:54-71
import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";
import { AmbientOcclusionQuality, AntiAliasingQuality, EveVisualizeMethod } from "../../generated/eve/enums.js";
import { ShadowQuality, Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Quality } from "../../generated/postProcess/enums.js";

/**
 * Carbon EveSpaceSceneRenderDriver::Settings (public, h:54-71): the quality
 * and debug switches a driver renders with, handed in whole through
 * SetSettings (h:81-84). Carbon does not expose the struct to Blue; the
 * driver's Blue map exposes its members one by one as driver attributes
 * (EveSpaceSceneRenderDriver_Blue.cpp:148-231).
 *
 * Every default is Carbon's member initializer (h:56-70).
 */
@meta.define({ className: "EveSpaceSceneRenderDriverSettings", donors: [ "EveSpaceSceneRenderDriver::Settings" ] })
export class EveSpaceSceneRenderDriverSettings
{

  /** shadowQuality (ShadowQuality), SHADOW_HIGH (h:56). */
  @type.int32
  @type.enum("trinity.ShadowQuality")
  shadowQuality = ShadowQuality.SHADOW_HIGH;

  /** antiAliasingQuality (AntiAliasingQuality), High (h:57). */
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AntiAliasingQuality")
  antiAliasingQuality = AntiAliasingQuality.High;

  /** aoQuality (AmbientOcclusionQuality), High (h:58). */
  @type.int32
  @type.enum("trinity.EveSpaceSceneRenderDriver.AmbientOcclusionQuality")
  aoQuality = AmbientOcclusionQuality.High;

  /** postProcessingQuality (PostProcess::Quality), HIGH (h:59). */
  @type.int32
  @type.enum("trinity.PostProcess.Quality")
  postProcessingQuality = Quality.HIGH;

  /** volumetricQuality (Tr2VolumerticQuality), High (h:60). */
  @type.int32
  @type.enum("trinity.Tr2VolumerticQuality")
  volumetricQuality = Tr2VolumerticQuality.High;

  /** clearColor (Color), opaque black (h:62). */
  @type.color
  clearColor = vec4.fromValues(0, 0, 0, 1);

  /** forceOpaqueBuffer (bool), false (h:64). */
  @type.boolean
  forceOpaqueBuffer = false;

  /** forceNormalMap (bool), false (h:65). */
  @type.boolean
  forceNormalMap = false;

  /** forceVelocityMap (bool), false (h:66). */
  @type.boolean
  forceVelocityMap = false;

  /** enableUpscaling (bool), true (h:67). */
  @type.boolean
  enableUpscaling = true;

  /** enableDistortion (bool), true (h:68); Carbon notes it should be tied to shader quality. */
  @type.boolean
  enableDistortion = true;

  /** showFPS (bool), false (h:69). */
  @type.boolean
  showFPS = false;

  /** visualizeMethod (EveSpaceScene::EveVisualizeMethod), VM_NONE (h:70). */
  @type.int32
  @type.enum("trinity.EveSpaceScene.EveVisualizeMethod")
  visualizeMethod = EveVisualizeMethod.VM_NONE;

}
