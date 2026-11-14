import { IRoot } from "../../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
import { IInitialize } from "#exposure/IInitialize";
import { ITr2AnimationUpdater } from "../../../trinity/core/animation/ITr2AnimationUpdater.js";
// Source: trinity/trinity/Tr2GStateAnimation.h
import { type } from "#schema";
import { BlueList } from "#blue";
import { Tr2GStateParameter } from "./Tr2GStateParameter.js";
import { Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";

/**
 * Character GState animation: a Granny state graph that drives a skeleton.
 *
 * Advancing the graph by itself (transitions, the per-frame update) needs Granny's proprietary GState runtime and is not
 * supported; loading it, its parameters and its time controls are portable, and the time controls are ported.
 * @adapted No own teardown hook: native destructor/Cleanup (Tr2GStateAnimation.cpp:66-79,1168-1219) release Granny/GState instances, poses, bindings and bone storage and detach resource notifications. This class acquires none of them: path setters only store strings, loading is unimplemented and instantiation is unsupported.
 */
@be.define({
  name: "Tr2GStateAnimation",
  inherit: [ IInitialize, ITr2AnimationUpdater ],
  // Tr2GStateAnimation_Blue.cpp:16-255, in Carbon's order.
  interfaces: [ IInitialize, ITr2AnimationUpdater ],
  members: [
    [ be.PROP, "resPath" ],
    [ be.ATTR, "resPath_", be.PERSISTONLY ],
    [ be.PROP, "gStateResPath" ],
    [ be.ATTR, "gStateResPath_", be.PERSISTONLY ],
    [ be.ATTR, "grannyRes", be.READ ],
    [ be.PROP, "model" ],
    [ be.ATTR, "model_", be.PERSISTONLY ],
    [ be.ATTR, "parameters", be.READ | be.PERSIST ],
    [ be.ATTR, "debugRenderSkeleton", be.READWRITE ],
    [ be.ATTR, "debugRenderJointNames", be.READWRITE ],
    [ be.ATTR, "animationEnabled", be.READWRITE ],
    [ be.ATTR, "eventListener", be.READWRITE ],
    [ be.METHOD, "TogglePauseAnimations", be.WRAP ],
    [ be.METHOD, "LoadModelFromGstate", be.WRAP ],
    [ be.METHOD, "GetGStateAnimFileRefPaths", be.WRAP ],
    [ be.METHOD, "GetTopLevelNodeNames", be.WRAP ],
    [ be.METHOD, "GetTopLevelParameterNodeNames", be.WRAP ],
    [ be.METHOD, "GetTopLevelStateNodeNames", be.WRAP ],
    [ be.METHOD, "GetParameters", be.WRAP ],
    [ be.METHOD, "GetParameterRange", be.WRAP ],
    [ be.METHOD, "GetActiveMachineElementName", be.WRAP ],
    [ be.METHOD, "GetStartStateIdx", be.WRAP ],
    [ be.METHOD, "SetStartStateIdx", be.WRAP ],
    [ be.METHOD, "SetStartStateByName", be.WRAP ],
    [ be.METHOD, "RequestChangeToState", be.WRAP ],
    [ be.METHOD, "ForceChangeToState", be.WRAP ],
    [ be.METHOD, "StartTransitionByName", be.WRAP ],
    [ be.METHOD, "GetParameter", be.WRAP ],
    [ be.METHOD, "SetParameter", be.WRAP ],
    [ be.METHOD, "RequestParameter", be.WRAP ],
    [ be.METHOD, "RequestParameterByName", be.WRAP ],
    [ be.METHOD, "GetParameterByName", be.WRAP ],
    [ be.METHOD, "GetParameterIndexByName", be.WRAP ],
    [ be.METHOD, "IsFullyLoaded", be.WRAP ],
    [ be.METHOD, "InstantiateCharacter", be.WRAP ],
    [ be.METHOD, "ResetParamsToDefault", be.WRAP ],
    [ be.METHOD, "GetAnimationTime", be.WRAP ],
    [ be.METHOD, "StartScrub", be.WRAP ],
    [ be.METHOD, "ClearScrub", be.WRAP ],
    [ be.METHOD, "PlayFromScrub", be.WRAP ],
    [ be.METHOD, "StopPlayFromScrub", be.WRAP ],
    [ be.METHOD, "GetScrubOffset", be.WRAP ],
    [ be.METHOD, "SetScrubOffset", be.WRAP ]
  ]
})
export class Tr2GStateAnimation extends IRoot
{

  /** m_resPath (std::string) [PERSISTONLY] */
  @type.string
  resPath_ = "";

  /** m_gStateResPath (std::string) [PERSISTONLY] */
  @type.string
  gStateResPath_ = "";

  /** m_model (std::string) [PERSISTONLY] */
  @type.string
  model_ = "";

  /** m_gStateParameterList (PTr2GStateParameterVector) [READ, PERSIST] */
  @type.list("Tr2GStateParameter")
  parameters = new BlueList(Tr2GStateParameter, { className: "Tr2GStateParameter" });

  /** m_grannyRes (TriGrannyResPtr) [READ] */
  @type.object.ref("TriGrannyRes")
  grannyRes = null;

  /** m_eventListener (IBlueEventListenerPtr) [READWRITE] */
  @type.object.ref("IBlueEventListener")
  eventListener = null;

  /** m_animationEnabled (bool) [READWRITE] */
  @type.boolean
  animationEnabled = true;

  /** m_debugRenderJointNames (bool) [READWRITE] */
  @type.boolean
  debugRenderJointNames = false;

  /** m_debugRenderSkeleton (bool) [READWRITE] */
  @type.boolean
  debugRenderSkeleton = false;

  /**
   * Returns the authored Granny animation resource path stored by this graph
   * shell.
   */
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
   * Carbon ForceChangeToState (Tr2GStateAnimation.cpp:616-619).
   *
   * @notSupported the state machine changes state at its instance time inside Granny's proprietary GState runtime.
   */
  ForceChangeToState(...args)
  {
    throw new Error("Tr2GStateAnimation.ForceChangeToState needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon RequestChangeToState (Tr2GStateAnimation.cpp:621-626).
   *
   * @notSupported the state machine's requested transition runs inside Granny's proprietary GState runtime.
   */
  RequestChangeToState(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestChangeToState needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon StartTransitionByName (Tr2GStateAnimation.cpp:628-631).
   *
   * @notSupported the transition runs inside Granny's proprietary GState runtime.
   */
  StartTransitionByName(...args)
  {
    throw new Error("Tr2GStateAnimation.StartTransitionByName needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon GetActiveMachineElementName (Tr2GStateAnimation.cpp:571-594).
   *
   * @notSupported the active node or transition is the state of Granny's proprietary GState runtime as it advances the graph.
   */
  GetActiveMachineElementName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetActiveMachineElementName needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon InstantiateCharacter (Tr2GStateAnimation.cpp:401-412).
   *
   * @notSupported GStateInstantiateCharacter creates the instance Granny's proprietary GState runtime advances.
   */
  InstantiateCharacter(...args)
  {
    throw new Error("Tr2GStateAnimation.InstantiateCharacter needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon LoadModelFromGstate (Tr2GStateAnimation.cpp:384-399).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  LoadModelFromGstate(...args)
  {
    throw new Error("Tr2GStateAnimation.LoadModelFromGstate is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetGStateAnimFileRefPaths (Tr2GStateAnimation.cpp:414-418).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetGStateAnimFileRefPaths(...args)
  {
    throw new Error("Tr2GStateAnimation.GetGStateAnimFileRefPaths is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetTopLevelNodeNames (Tr2GStateAnimation.cpp:468-479).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetTopLevelNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetTopLevelParameterNodeNames (Tr2GStateAnimation.cpp:482-498).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetTopLevelParameterNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelParameterNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetTopLevelStateNodeNames (Tr2GStateAnimation.cpp:501-517).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetTopLevelStateNodeNames(...args)
  {
    throw new Error("Tr2GStateAnimation.GetTopLevelStateNodeNames is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetParameters (Tr2GStateAnimation.cpp:520-534).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetParameters(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameters is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetStartStateIdx (Tr2GStateAnimation.cpp:596-599).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetStartStateIdx(...args)
  {
    throw new Error("Tr2GStateAnimation.GetStartStateIdx is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon SetStartStateIdx (Tr2GStateAnimation.cpp:601-604).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  SetStartStateIdx(...args)
  {
    throw new Error("Tr2GStateAnimation.SetStartStateIdx is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon SetStartStateByName (Tr2GStateAnimation.cpp:607-614).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  SetStartStateByName(...args)
  {
    throw new Error("Tr2GStateAnimation.SetStartStateByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetParameter (Tr2GStateAnimation.cpp:633-645).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon SetParameter (Tr2GStateAnimation.cpp:647-654).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  SetParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.SetParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon RequestParameter (Tr2GStateAnimation.cpp:656-668).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  RequestParameter(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestParameter is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon RequestParameterByName (Tr2GStateAnimation.cpp:670-694).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  RequestParameterByName(...args)
  {
    throw new Error("Tr2GStateAnimation.RequestParameterByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetParameterByName (Tr2GStateAnimation.cpp:696-720).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetParameterByName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameterByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon GetParameterIndexByName (Tr2GStateAnimation.cpp:722-738).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  GetParameterIndexByName(...args)
  {
    throw new Error("Tr2GStateAnimation.GetParameterIndexByName is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon IsFullyLoaded (Tr2GStateAnimation.cpp:112-115).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  IsFullyLoaded(...args)
  {
    throw new Error("Tr2GStateAnimation.IsFullyLoaded is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon ResetParamsToDefault (Tr2GStateAnimation.cpp:130-149).
   *
   * @notImplemented portable: our .gsf reader (CjsGr2Format.readGsf) decodes the graph, which Graphene's authoredAnimation.js walks for node names, sources and masks; this class does not read it yet.
   */
  ResetParamsToDefault(...args)
  {
    throw new Error("Tr2GStateAnimation.ResetParamsToDefault is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon PrePhysicsAnimation (Tr2GStateAnimation.cpp:1045-1140): pushes the parameters into the state machine,
   * advances it by the change in the animation time, and samples it (GStateAdvanceTime, GStateSampleAnimation).
   *
   * @notSupported Granny's proprietary GState runtime advances and samples the graph. Graphene plays chosen states' clips through
   *   Tr2GrannyAnimation instead (authoredAnimation.js), without the graph's transitions.
   */
  PrePhysicsAnimation(...args)
  {
    throw new Error("Tr2GStateAnimation.PrePhysicsAnimation needs Granny's proprietary GState runtime.");
  }

  /**
   * Carbon PostPhysicsAnimation (Tr2GStateAnimation.cpp:1142-1145): empty.
   *
   * @implemented
   * @param {number} _time Blue time in ticks.
   * @param {mat4} _modelTransform The owner's world transform.
   * @returns {void}
   */
  PostPhysicsAnimation(_time, _modelTransform) {}

  /**
   * Carbon GetParameterRange (Tr2GStateAnimation.cpp:537-542). Quirk: Carbon looks the node up and returns an
   * empty list whatever it finds.
   *
   * @implemented
   * @param {string} _paramNode The parameter node's name.
   * @param {string} _paramName The parameter's name.
   * @returns {number[]} An empty list.
   */
  GetParameterRange(_paramNode, _paramName)
  {
    return [];
  }

  /** m_paused (bool). */
  _paused = false;
  /** m_pauseTime (float): the animation time pausing held, in seconds. */
  _pauseTime = 0;
  /** m_totalPauseOffset (float): the seconds of renderer animation time spent paused. */
  _totalPauseOffset = 0;
  /** m_scrubbing (bool). */
  _scrubbing = false;
  /** m_scrub_time (float): the animation time scrubbing started at. */
  _scrub_time = 0;
  /** m_scrub_offset (float): the scrub position past _scrub_time. */
  _scrub_offset = 0;
  /** m_scrub_playing (bool). */
  _scrub_playing = false;
  /** m_scrub_play_offset (float). */
  _scrub_play_offset = 0;

  /**
   * Carbon GetAnimationTime (Tr2GStateAnimation.cpp:1255-1273): the held time while paused; while scrubbing, the
   * scrub position, moving with the clock while it plays; else the renderer's animation clock less the time spent
   * paused.
   *
   * @implemented
   * @returns {number} Seconds.
   */
  GetAnimationTime()
  {
    if (this._paused) return this._pauseTime;
    if (this._scrubbing)
    {
      if (this._scrub_playing) return Tr2Renderer.GetAnimationTime() - this._totalPauseOffset + this._scrub_play_offset;
      return this._scrub_time + this._scrub_offset;
    }
    return Tr2Renderer.GetAnimationTime() - this._totalPauseOffset;
  }

  /**
   * Carbon StartScrub (Tr2GStateAnimation.cpp:1276-1285).
   *
   * @implemented
   * @returns {void}
   */
  StartScrub()
  {
    if (this._scrubbing) return;
    this._scrub_time = this.GetAnimationTime();
    this._scrub_offset = 0;
    this._scrubbing = true;
  }

  /**
   * Carbon ClearScrub (Tr2GStateAnimation.cpp:1288-1295).
   *
   * @implemented
   * @returns {void}
   */
  ClearScrub()
  {
    this._scrubbing = false;
    this._scrub_time = 0;
    this._scrub_offset = 0;
    this._scrub_playing = false;
    this._scrub_play_offset = 0;
  }

  /**
   * Carbon PlayFromScrub (Tr2GStateAnimation.cpp:1298-1307). Quirk, reproduced: the offset ADDS the pause offset
   * (cpp:1305) that GetAnimationTime then subtracts, so after a pause the playing scrub starts twice the paused time
   * early.
   *
   * @implemented
   * @returns {void}
   */
  PlayFromScrub()
  {
    if (!this._scrubbing) return;
    this._scrub_play_offset = this._scrub_time + this._scrub_offset - (Tr2Renderer.GetAnimationTime() + this._totalPauseOffset);
    this._scrub_playing = true;
  }

  /**
   * Carbon StopPlayFromScrub (Tr2GStateAnimation.cpp:1310-1325).
   *
   * @implemented
   * @returns {void}
   */
  StopPlayFromScrub()
  {
    if (!this._scrubbing || !this._scrub_playing) return;
    this._scrub_offset = this.GetAnimationTime() - this._scrub_time;
    this._scrub_playing = false;
    this._scrub_play_offset = 0;
  }

  /**
   * Carbon SetScrubOffset (Tr2GStateAnimation.cpp:1328-1341).
   *
   * @implemented
   * @param {number} scrubOffset Seconds past the scrub start.
   * @returns {void}
   */
  SetScrubOffset(scrubOffset)
  {
    if (!this._scrubbing || this._scrub_playing) return;
    this._scrub_offset = scrubOffset;
  }

  /**
   * Carbon GetScrubOffset (Tr2GStateAnimation.cpp:1344-1352).
   *
   * @implemented
   * @returns {number} Seconds past the scrub start; 0 when not scrubbing.
   */
  GetScrubOffset()
  {
    if (!this._scrubbing) return 0;
    return this._scrub_offset;
  }

  /**
   * Carbon TogglePauseAnimations (Tr2GStateAnimation.cpp:1362-1375): pausing holds the animation time; resuming
   * adds the time spent paused to the offset GetAnimationTime subtracts.
   *
   * @implemented
   * @param {boolean} pause Whether to pause.
   * @returns {void}
   */
  TogglePauseAnimations(pause)
  {
    if (this._paused && !pause)
    {
      this._paused = false;
      this._totalPauseOffset = Tr2Renderer.GetAnimationTime() - this._pauseTime;
      this._pauseTime = 0;
    }
    else if (!this._paused && pause)
    {
      this._paused = true;
      this._pauseTime = Tr2Renderer.GetAnimationTime() - this._totalPauseOffset;
    }
  }

  /**
   * Carbon: Tr2GStateAnimation::Initialize (trinity/trinity/Tr2GStateAnimation.h:110), `bool Initialize()`.
   * Compiled only when GSTATE_ENABLED (Tr2GStateAnimation.h:7).
   *
   * @notImplemented
   * @returns {boolean} Whether initialization succeeded.
   * @throws {Error} Always.
   */
  Initialize()
  {
    throw new Error("Tr2GStateAnimation.Initialize is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon: Tr2GStateAnimation::GetAnimationTransforms (trinity/trinity/Tr2GStateAnimation.h:116), `const Matrix* GetAnimationTransforms()`.
   * Compiled only when GSTATE_ENABLED (Tr2GStateAnimation.h:7).
   *
   * @notImplemented
   * @returns {Float32Array[]} The animation's bone transforms (const Matrix*).
   * @throws {Error} Always.
   */
  GetAnimationTransforms()
  {
    throw new Error("Tr2GStateAnimation.GetAnimationTransforms is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon: Tr2GStateAnimation::GetAnimationBoneList (trinity/trinity/Tr2GStateAnimation.h:117), `const std::string* GetAnimationBoneList( unsigned int& numBones ) const`.
   * Compiled only when GSTATE_ENABLED (Tr2GStateAnimation.h:7).
   *
   * @notImplemented
   * @returns {string[]} The bone names; Carbon's numBones output is the array length.
   * @throws {Error} Always.
   */
  GetAnimationBoneList()
  {
    throw new Error("Tr2GStateAnimation.GetAnimationBoneList is not implemented in CarbonEngineJS.");
  }
}
