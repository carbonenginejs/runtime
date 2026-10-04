// Source: trinity/trinity/TriDebugResourceHelper.h
// Source: trinity/trinity/TriDebugResourceHelper.cpp
import { meta } from "#schema";
import { Tr2Effect } from "../shader/Tr2Effect.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "./vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { TriDevice } from "./device/TriDevice.js";
import { Tr2Renderer } from "./Tr2Renderer.js";


const DEBUG_EFFECT_PATH = "res:/Graphics/Effect/Managed/Utility/Debug.fx";
const DEBUG_LINE_EFFECT_PATH = "res:/Graphics/Effect/Managed/Utility/DebugLine.fx";


/**
 * Carbon's TriDebugResourceHelper (TriDebugResourceHelper.{h,cpp}): the debug-drawing effects and the two vertex
 * declarations debug geometry uses, a position-only one and a position-and-colour one. Carbon keeps one global
 * instance, g_debugResourceHelper; it is created here on first use (TriDebugResourceHelper.g_debugResourceHelper()).
 */
@meta.define({ className: "TriDebugResourceHelper", family: "trinityCore" })
export class TriDebugResourceHelper
{
  /** m_vertexPosColorDecl */
  _vertexPosColorDecl = Tr2EffectStateManager.Unknown;

  /** m_vertexPosDecl */
  _vertexPosDecl = Tr2EffectStateManager.Unknown;

  /** m_effect, created on first GetEffect. */
  _effect = null;

  /** m_lineEffect, created on first GetLineEffect. */
  _lineEffect = null;

  /** Registers the device-resource lifetime, as Carbon's Tr2DeviceResource base does. */
  constructor()
  {
    TriDevice.RegisterResource(this);
  }

  /** Carbon Tr2DeviceResource::PrepareResources (Tr2DeviceResource.cpp:21-32): only while resource creation is allowed. */
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Carbon OnPrepareResources (cpp:22-37): interns the position and the position-and-colour declarations. */
  @meta.implemented
  OnPrepareResources()
  {
    const position = new Tr2VertexDefinition();
    position.Add("FLOAT32_3", "POSITION");
    this._vertexPosDecl = Tr2EffectStateManager.getVertexDeclarationHandle(position);

    const positionColor = new Tr2VertexDefinition();
    positionColor.Add("FLOAT32_3", "POSITION");
    positionColor.Add("UBYTE_4_NORM", "COLOR");
    this._vertexPosColorDecl = Tr2EffectStateManager.getVertexDeclarationHandle(positionColor);
    return true;
  }

  /**
   * Carbon ReleaseResources (cpp:39-43): resets both declarations. Carbon quirk, kept: it resets them to 0, not to
   * UNINITIALIZED_DECLARATION, so a released helper reports handle 0 until it is prepared again.
   */
  @meta.implemented
  ReleaseResources(_storage)
  {
    this._vertexPosDecl = 0;
    this._vertexPosColorDecl = 0;
  }

  /**
   * Carbon GetDescription (TriDebugResourceHelper.h:27-31, TRINITYDEV): the device-resource description.
   *
   * Adapted: returned rather than written to an output string, as the other resource descriptions are.
   * @returns {string} "TriDebugResourceHelper".
   */
  @meta.adapted
  GetDescription()
  {
    return "TriDebugResourceHelper";
  }

  /** Carbon GetEffect (cpp:45-54): Debug.fx, created on first use. */
  @meta.implemented
  GetEffect()
  {
    if (!this._effect)
    {
      this._effect = new Tr2Effect();
      this._effect.SetEffectPathName(DEBUG_EFFECT_PATH);
    }
    return this._effect;
  }

  /** Carbon GetLineEffect (cpp:56-65): DebugLine.fx, created on first use. */
  @meta.implemented
  GetLineEffect()
  {
    if (!this._lineEffect)
    {
      this._lineEffect = new Tr2Effect();
      this._lineEffect.SetEffectPathName(DEBUG_LINE_EFFECT_PATH);
    }
    return this._lineEffect;
  }

  /** Carbon GetVertexPosDecl (cpp:67-70). */
  @meta.implemented
  GetVertexPosDecl()
  {
    return this._vertexPosDecl;
  }

  /** Carbon GetVertexPosColorDecl (cpp:72-75). */
  @meta.implemented
  GetVertexPosColorDecl()
  {
    return this._vertexPosColorDecl;
  }

  /**
   * Carbon's global g_debugResourceHelper (cpp:10), created and prepared on first use.
   *
   * Ours: Carbon constructs the global during static initialization; a module-level instance here would register
   * with the device on import, so it is created on first request instead.
   * @returns {TriDebugResourceHelper} The shared helper.
   */
  @meta.ours
  static g_debugResourceHelper()
  {
    if (!TriDebugResourceHelper._instance)
    {
      TriDebugResourceHelper._instance = new TriDebugResourceHelper();
      TriDebugResourceHelper._instance.PrepareResources();
    }
    return TriDebugResourceHelper._instance;
  }

  static _instance = null;
}
