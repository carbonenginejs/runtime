import { IRoot } from "../../../blue/blueexposure/IRoot.js";
import { exposure as be } from "#be";
import { IInitialize } from "#blueexposure/IInitialize";
import { ITr2AnimationUpdater } from "../../../trinity/core/animation/ITr2AnimationUpdater.js";
// Source: trinity/trinity/Tr2GStateAnimation.h
import { type } from "#schema";

/** Character GState animation record for an external state-machine adapter. */
@be.define("Tr2GStateAnimation")
@be.inherit(IInitialize, ITr2AnimationUpdater)
@be.mapInterface(IInitialize)
@be.mapInterface(ITr2AnimationUpdater)
export class Tr2GStateAnimation extends IRoot
{

  /** m_resPath (std::string) [PERSISTONLY] */
  @be.mapAttribute(be.PERSISTONLY)
  @type.string
  resPath_ = "";

  /** m_gStateResPath (std::string) [PERSISTONLY] */
  @be.mapAttribute(be.PERSISTONLY)
  @type.string
  gStateResPath_ = "";

  /** m_model (std::string) [PERSISTONLY] */
  @be.mapAttribute(be.PERSISTONLY)
  @type.string
  model_ = "";

  /** m_gStateParameterList (PTr2GStateParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.list("Tr2GStateParameter")
  parameters = [];

  /** m_grannyRes (TriGrannyResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriGrannyRes")
  grannyRes = null;

  /** m_eventListener (IBlueEventListenerPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.object.ref("IBlueEventListener")
  eventListener = null;

  /** m_animationEnabled (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  animationEnabled = true;

  /** m_debugRenderJointNames (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  debugRenderJointNames = false;

  /** m_debugRenderSkeleton (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  debugRenderSkeleton = false;

  /**
   * Returns the authored Granny animation resource path stored by this graph
   * shell.
   */
  @be.mapProperty()
  @type.string
  get resPath()
  {
    return this.GetResPath();
  }

  /**
   * Stores an authored Granny animation resource path without acquiring its
   * resource.
   */
  set resPath(value)
  {
    this.SetResPath(value);
  }

  /** Returns the authored state-graph resource path stored by this graph shell. */
  @be.mapProperty()
  @type.string
  get gStateResPath()
  {
    return this.GetGStateResPath();
  }

  /**
   * Stores an authored state-graph resource path without loading or evaluating
   * it.
   */
  set gStateResPath(value)
  {
    this.SetGStateResPath(value);
  }

  /** Returns the authored Granny model name stored by this graph shell. */
  @be.mapProperty()
  @type.string
  get model()
  {
    return this.GetModel();
  }

  /**
   * Stores an authored Granny model name without instantiating native model
   * state.
   */
  set model(value)
  {
    this.SetModel(value);
  }

  /**
   * Returns the persisted Granny animation path without resolving a resource.
   *
   * @implemented
   */
  GetResPath()
  {
    return this.resPath_;
  }

  /**
   * Persists the authored Granny animation path for an external resource
   * adapter.
   *
   * @adapted Stores the authored path; Granny resource loading belongs to the
   *   resource/state-machine adapter.
   */
  SetResPath(value)
  {
    this.resPath_ = String(value ?? "");
  }

  /**
   * Returns the persisted state-graph path without resolving a resource.
   *
   * @implemented
   */
  GetGStateResPath()
  {
    return this.gStateResPath_;
  }

  /**
   * Persists the authored state-graph path for an external state-machine
   * adapter.
   *
   * @adapted Stores the authored path; state-graph loading belongs to the
   *   resource/state-machine adapter.
   */
  SetGStateResPath(value)
  {
    this.gStateResPath_ = String(value ?? "");
  }

  /**
   * Returns the persisted authored model name without instantiating it.
   *
   * @implemented
   */
  GetModel()
  {
    return this.model_;
  }

  /**
   * Persists the authored model name for an external Granny runtime adapter.
   *
   * @adapted Stores the authored model name; native model instantiation belongs to the
   *   Granny runtime adapter.
   */
  SetModel(value)
  {
    this.model_ = String(value ?? "");
  }

  /**
   * Carbon method ClearScrub (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  ClearScrub(...args)
  {
    throw new Error("Tr2GStateAnimation.ClearScrub is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method ForceChangeToState (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  ForceChangeToState(...args)
  {
    throw new Error("Tr2GStateAnimation.ForceChangeToState is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetActiveMachineElementName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetActiveMachineElementName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetActiveMachineElementName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetAnimationTime (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetAnimationTime(...args)
  {
    throw new Error("Tr2GStateAnimation.GetAnimationTime is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetGStateAnimFileRefPaths (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetGStateAnimFileRefPaths(...args)
  {
    throw new Error("Tr2GStateAnimation.GetGStateAnimFileRefPaths is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetParameter (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetParameterByName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetParameterByName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameterByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetParameterIndexByName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetParameterIndexByName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameterIndexByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetParameterRange (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetParameterRange(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameterRange is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetParameters (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetParameters(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameters is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetScrubOffset (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetScrubOffset(...args)
  {
    throw new Error("Tr2GStateAnimation.GetScrubOffset is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetStartStateIdx (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetStartStateIdx(...args)
  {
    throw new Error("Tr2GStateAnimation.GetStartStateIdx is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetTopLevelNodeNames (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetTopLevelNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetTopLevelParameterNodeNames (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetTopLevelParameterNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelParameterNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method GetTopLevelStateNodeNames (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  GetTopLevelStateNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelStateNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method InstantiateCharacter (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  InstantiateCharacter(...args)
  {
    throw new Error("Tr2GStateAnimation.InstantiateCharacter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method IsFullyLoaded (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  IsFullyLoaded(...args)
  {
    throw new Error("Tr2GStateAnimation.IsFullyLoaded is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method LoadModelFromGstate (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  LoadModelFromGstate(...args)
  {
    throw new Error("Tr2GStateAnimation.LoadModelFromGstate is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method PlayFromScrub (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  PlayFromScrub(...args)
  {
    throw new Error("Tr2GStateAnimation.PlayFromScrub is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method RequestChangeToState (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  RequestChangeToState(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestChangeToState is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method RequestParameter (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  RequestParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method RequestParameterByName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  RequestParameterByName(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestParameterByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method ResetParamsToDefault (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  ResetParamsToDefault(...args)
  {
    throw new Error("Tr2GStateAnimation.ResetParamsToDefault is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method SetParameter (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SetParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.SetParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method SetScrubOffset (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SetScrubOffset(...args)
  {
    throw new Error("Tr2GStateAnimation.SetScrubOffset is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method SetStartStateByName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SetStartStateByName(...args)
  {
    throw new Error("Tr2GStateAnimation.SetStartStateByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method SetStartStateIdx (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SetStartStateIdx(...args)
  {
    throw new Error("Tr2GStateAnimation.SetStartStateIdx is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method StartScrub (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  StartScrub(...args)
  {
    throw new Error("Tr2GStateAnimation.StartScrub is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method StartTransitionByName (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  StartTransitionByName(...args)
  {
    throw new Error("Tr2GStateAnimation.StartTransitionByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method StopPlayFromScrub (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  StopPlayFromScrub(...args)
  {
    throw new Error("Tr2GStateAnimation.StopPlayFromScrub is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon method TogglePauseAnimations (MAP_METHOD_AND_WRAP).
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  TogglePauseAnimations(...args)
  {
    throw new Error("Tr2GStateAnimation.TogglePauseAnimations is not implemented in CarbonEngineJS.");
  }

}
