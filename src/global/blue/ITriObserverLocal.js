// Source: blue/include/ITriObserverLocal.h
import { CjsSchema, meta } from "#schema";

/** Native IRoot-shaped contract for binding a local placement observer. */
export class ITriObserverLocal
{
  /** Gets the bound placement observer. @returns {object|null} Observer. */
  GetObserver()
  {
  }

  /** Binds a placement observer. @param {object|null} _observer Observer. @returns {void} */
  SetObserver(_observer)
  {
  }
}

for (const method of ["GetObserver", "SetObserver"])
{
  CjsSchema.decorateMethod(ITriObserverLocal, method, meta.compose.abstract, meta.impl.abstract);
}
CjsSchema.define(ITriObserverLocal, { className: "ITriObserverLocal", carbon: "ITriObserverLocal", family: "blue", fields: {} });
