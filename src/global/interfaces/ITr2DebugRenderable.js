// Source: blue/include/ITr2DebugRenderer2.h:13-14,189-194
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch_Blue.cpp:8
import { CjsSchema, meta } from "#schema";


/**
 * Debug-rendering contract shared by Trinity and providers such as audio.
 * It lives with the shared interfaces so providers need no Trinity implementation
 * dependency. Carbon derives it from IRoot; JavaScript uses a plain class.
 */
export class ITr2DebugRenderable
{
  /**
   * Adds this object's supported debug options to the caller's set.
   * Native signature: void GetDebugOptions(Tr2DebugRendererOptions& options) = 0.
   * @param {Set<string>} _options The caller-owned set, adapting std::set<std::string>.
   * @returns {void}
   */
  GetDebugOptions(_options)
  {
  }

  /**
   * Submits this object's debug information to the supplied renderer.
   * Native signature: void RenderDebugInfo(ITr2DebugRenderer2& renderer) = 0.
   * @param {object} _renderer The caller's debug renderer.
   * @returns {void}
   */
  RenderDebugInfo(_renderer)
  {
  }
}

for (const method of [ "GetDebugOptions", "RenderDebugInfo" ])
{
  CjsSchema.decorateMethod(ITr2DebugRenderable, method, meta.requires, meta.abstract);
}
// Carbon defines an IID, not a class factory. JavaScript registers the interface
// constructor so named declarations and nominal composition resolve one identity.
CjsSchema.define(ITr2DebugRenderable, {
  className: "ITr2DebugRenderable", carbon: "ITr2DebugRenderable", fields: {}
});
