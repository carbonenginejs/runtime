// Source: blue/include/IBlueResMan.h:137-151
//
// DROPPED: IT IS A STATIC-INITIALISATION TRICK, AND JAVASCRIPT HAS MODULES.
//
// The class has one constructor and no members. Constructing it calls
// `BlueResManRegisterFileExtension( ext, factory )`, and the only thing that
// ever constructs it is the macro beneath it:
//
//     #define BLUE_REGISTER_RESOURCE_EXTENSION( ext, factory ) \
//         static BlueResManRegistrar CCP_ANONYMOUS_VARIABLE(...)( ext, factory )
//
// So its whole purpose is to run a registration when a translation unit loads,
// which C++ can only do by constructing something at file scope. A JavaScript
// module runs its own body on import, so the equivalent is the registration
// call itself, and a class wrapping it would carry no information.
//
// The REGISTRATION survives and is not dropped - it is
// `RegisterResourceConstructor` on the manager, which the gradient and colour
// textures already use to bind themselves to a `dynamic:/<name>`.
import { CjsSchema } from "#schema";

/** Carbon's file-extension registrar; dropped because a module body registers directly. */
export class BlueResManRegistrar
{

}

CjsSchema.define(BlueResManRegistrar, {
  className: "BlueResManRegistrar", carbon: "BlueResManRegistrar", family: "blue", fields: {}
});
