import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/ITr2PostProcessOwner.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPostProcessVolume_Blue.cpp:9 (BLUE_DEFINE_INTERFACE)
//
// Carbon also registers this as the "PostProcessOwner" component type
// (ITr2PostProcessOwner.h:15, REGISTER_COMPONENT_TYPE); the component
// registry is a separate mechanism and is not declared here.
import { IRoot } from "#blue/IRoot";
import { blue } from "#schema";


/**
 * Carbon ITr2PostProcessOwner (ITr2PostProcessOwner.h:8-13): an object that
 * supplies post-process attributes for the scene to blend.
 */
@be.interface("ITr2PostProcessOwner")
@blue.inherit(IRoot)
export class ITr2PostProcessOwner
{

  /**
   * Carbon's pure virtual `Tr2PostProcessAttributes*
   * GetPostProcessAttributes()` (h:12).
   * @returns {Tr2PostProcessAttributes|null} The owner's attributes.
   */
  @blue.abstract
  GetPostProcessAttributes() {}
}
