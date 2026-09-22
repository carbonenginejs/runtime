// Source: blue/include/IBlueResMan.h:135, blue/include/IBluePaths.h:49,
//   blue/include/IBlueOS.h:226
//
// Carbon's process-wide Blue facilities, which it declares as externs beside
// the interfaces they point at:
//
//     extern BLUEIMPORT IBlueResMan* BeResMan;
//     extern BLUEIMPORT IBluePaths*  BePaths;
//     extern BLUEIMPORT IBlueOS*     BeOS;
//
// `Be` is Blue, so `BeResMan` is `blue.resMan` with the prefix spelled out.
//
// WHY A HOLDER RATHER THAN EXPORTED SERVICES. Reach a service THROUGH `blue`
// and never capture it: `blue.resMan.GetResource(...)`, not
// `const resMan = blue.resMan` at module scope. The holder owns the reference,
// so whatever sits behind it can be replaced at any time - a stub, a recording
// manager, one with a different cache - without anyone's cooperation. ccpwgl
// had this right on `tw2` and lost it by re-exporting `resMan` and `device` as
// module bindings, after which 120 files held the implementation directly:
// that one shortcut fixed the instance count at one AND gave away the
// swappability the arrangement existed to provide.
//
// WHY IT IMPORTS NOTHING BUT ITS OWN INTERFACES. A holder that constructs
// nothing has no dependency on what it holds, so every layer may read it
// without the import cycle ccpwgl pays for (`global` imports the root, the
// root constructs the services, the services import `global`). Composition
// fills the slots from above.
//
// The slots are never empty. Each starts as its interface, whose methods
// throw, so a call before composition says so at the call site instead of
// failing later on a null. One CarbonEngineJS per page; see
// /docs/internal/decisions/composition-root-is-the-wrapper.md.
import { IBlueResMan } from "./IBlueResMan.js";
import { CjsBluePaths } from "./CjsBluePaths.js";
import { CjsBlueOS } from "./CjsBlueOS.js";
import { BlueClasses } from "./BlueClasses.js";
import { blueEnums } from "./enums/CjsBlueEnumRegistry.js";

/** Carbon's process-wide Blue facilities: `blue.resMan`, `blue.paths`, `blue.os` and `blue.classes`. */
export const blue = {
  /** EnumRegistration and BlueEnum responsibilities combined for JavaScript. */
  enums: blueEnums,
  /** `BeResMan` (IBlueResMan.h:135) - the resource manager every consumer asks. */
  resMan: new IBlueResMan(),

  // Paths differs from the manager: an uncomposed one can still answer its
  // main question truthfully - no, that file is not here - which is what
  // Carbon returns for a file absent from the local machine, and what every
  // caller is already written for. The verbs it cannot answer without a real
  // file system stay refused. See CjsBluePaths.
  /** `BePaths` (IBluePaths.h:49) - search paths, resolution, existence and streams. */
  paths: new CjsBluePaths(),

  // The OS is the ROOT CLOCK, and the reason this slot matters beyond time:
  // its pump is what calls TriDevice.OnTick, which advances the animation
  // clock the whole render path reads. Composed like the others, and answering
  // truthfully before anything composes it - see CjsBlueOS.
  /** `BeOS` (IBlueOS.h:226) - the clock, the pump, and the tick registry. */
  os: new CjsBlueOS(),

  // The class registry. Like paths it answers truthfully uncomposed: nothing
  // registered means nothing found, which is Carbon's answer too. It is how a
  // layer builds a class another layer owns without importing it.
  /** `BeClasses` (blueexposure/BlueClasses.cpp:28) - class registration and creation by name. */
  classes: new BlueClasses()
};
