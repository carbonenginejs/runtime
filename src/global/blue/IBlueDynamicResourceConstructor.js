// Source: blue/include/IBlueResMan.h:39-44
//
// The factory behind a `dynamic:/<name>/<query>` path. The manager knows
// nothing about what it builds: the thing that knows registers itself, as
// Carbon's procedural textures do from their own files -
// `BeResMan->RegisterResourceConstructor( L"gradient_1d", this )`
// (`Resources/Procedural/GradientTexture.cpp:35`) and `L"color"`
// (`SolidColorTexture.cpp:21`).
//
// Declared beside IBlueResMan in Carbon's one header; here it takes its own
// file, because a class is found by its own name.
import { CjsSchema, compose, impl } from "#schema";

/** `IBlueDynamicResourceConstructor` - builds a resource for a `dynamic:/<name>` path. */
export class IBlueDynamicResourceConstructor
{
  /** `GetResource` - construct the resource this query describes. */
  GetResource(_query) {}
}

CjsSchema.decorateMethod(IBlueDynamicResourceConstructor, "GetResource", compose.abstract, impl.abstract);
CjsSchema.define(IBlueDynamicResourceConstructor, {
  className: "IBlueDynamicResourceConstructor", carbon: "IBlueDynamicResourceConstructor", family: "blue", fields: {}
});
