// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226 (process-wide Be* service references).
import { CjsSchema, meta } from "#schema";
import { CjsBlueResMan } from "./CjsBlueResMan.js";
import { CjsBluePaths } from "./CjsBluePaths.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { CjsBlueClasses } from "./CjsBlueClasses.js";
import { blueEnums } from "./enums/CjsBlueEnumRegistry.js";
import { CjsWwiseSoundEngineStub } from "../audio/CjsWwiseSoundEngineStub.js";

/**
 * Inert holder of the process-wide Blue facilities. Construction creates only
 * local state: no tick registration, pumping, workers, fetch or device work.
 * SOF and playback implementations are installed by the composition root;
 * this layer never imports them. Enum/class registration remains shared with
 * schema so module definitions and the holder have one authoritative registry.
 */
export class CjsBlue
{
  /** Named enum definitions shared with schema. */
  enums = blueEnums;

  /** Resource manager, configured by the application before acquisition. */
  resMan = new CjsBlueResMan();

  /** Path service with no filesystem or remote cache installed initially. */
  paths = new CjsBluePaths();

  /** Host-pumped clock; construction does not register any tick recipient. */
  os = new CjsBlueOS();

  /** Registry facade over the shared class declarations. */
  classes = new CjsBlueClasses();

  /** Installed SOF service; absent until the composition root supplies it. */
  sof = null;

  /** Silent, dependency-light default; an installed playback engine replaces it. */
  audio = new CjsWwiseSoundEngineStub();

  /**
   * Delegates DNA to the installed SOF and all other requests to ResMan.
   * Custom: the application-facing common entry point needs only this routing.
   * Three or more colon-separated segments identify DNA unless a path scheme
   * is present. Carbon's backslash path spelling is accepted alongside '/'.
   * Options and results pass through unchanged; the services own readiness.
   */
  async Fetch(value, options)
  {
    if (typeof value === "string" && !/^[a-z][a-z0-9+.-]*:[/\\]/i.test(value)
      && value.split(":").length >= 3)
    {
      if (!this.sof) throw new Error("SOF is not configured");
      return this.sof.Fetch(value, options);
    }
    return this.resMan.Fetch(value, options);
  }
}

CjsSchema.define(CjsBlue, {
  className: "CjsBlue", family: "blue", fields: {},
  methods: { Fetch: [meta.ours] }
});
