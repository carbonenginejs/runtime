// Source: blue/include/ICacheable.h:8-18
//
// An object that can say how much memory it holds. MotherLode asks for it when
// a resource stops being used and keeps the resource in its byte-budgeted cache
// while it fits (MotherLode.cpp:329-401); a class without it is dropped instead.
import { CjsSchema, blue } from "#schema";

/** `ICacheable` - reports an object's memory use to the cache. */
export class ICacheable
{
  /**
   * `IsMemoryUsageKnown` - whether `GetMemoryUsage` can be asked yet. An
   * asynchronously loaded resource does not know until its load has finished.
   *
   * @returns {boolean}
   */
  IsMemoryUsageKnown() {}

  /**
   * `GetMemoryUsage` - the object's memory use in bytes. Once
   * `IsMemoryUsageKnown` returns true, this should not change.
   *
   * @returns {number}
   */
  GetMemoryUsage() {}
}

CjsSchema.decorateMethod(ICacheable, "IsMemoryUsageKnown", blue.abstract);
CjsSchema.decorateMethod(ICacheable, "GetMemoryUsage", blue.abstract);

CjsSchema.exposure.interface("ICacheable")(ICacheable);
