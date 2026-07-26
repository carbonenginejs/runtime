// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocatorSets.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocatorSets.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Locator } from "./Locator.js";


/**
 * Named group of locators that a space object publishes for turrets, effects and
 * distributions to attach to.
 */
@type.define({
  className: "EveLocatorSets",
  family: "eve/utils"
})
export class EveLocatorSets extends CjsModel
{
  @io.persist
  @type.list("Locator")
  locators = [];

  @io.persist
  @type.string
  name = "";

  /**
   * Shifts the position of every locator in the set by an offset, doing nothing
   * for a zero offset.
   */
  @carbon.method
  @impl.implemented
  Translate(offset)
  {
    if (EveLocatorSets.#lengthSq(offset) === 0)
    {
      return;
    }
    for (const locator of this.locators)
    {
      vec3.add(locator.position, locator.position, offset);
    }
  }

  /**
   * Appends copies of the given locators, so the set never aliases the caller's
   * records.
   */
  @carbon.method
  @impl.adapted
  Append(locators)
  {
    for (const locator of locators)
    {
      this.locators.push(Locator.from(locator));
    }
  }

  /**
   * Reports whether the set carries exactly this name; set lookups are an exact
   * string match.
   */
  @carbon.method
  @impl.implemented
  HasName(name)
  {
    return this.name === String(name);
  }

  /** Returns the set's live locator list, not a copy. */
  @carbon.method
  @impl.implemented
  GetLocators()
  {
    return this.locators;
  }

  /** Returns the name callers look this set up by. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the name callers look this set up by, coercing the value to a string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Replaces both the set name and its whole locator list with copies of the
   * given locators.
   */
  @carbon.method
  @impl.adapted
  Set(name, locators)
  {
    this.SetName(name);
    this.locators = locators.map(locator => Locator.from(locator));
  }

  /**
   * Overwrites the locator at an index from a plain value, defaulting a missing
   * scale to zero and a missing bone index to 0; an index outside the list is
   * ignored.
   */
  @carbon.method
  @impl.adapted
  SetLocator(index, value)
  {
    const existing = this.locators[index];
    if (existing)
    {
      existing.SetValues({
        position: value.position,
        direction: value.direction,
        scale: value.scale ?? [0, 0, 0],
        boneIndex: value.boneIndex ?? 0
      });
    }
  }

  /**
   * Squared length of a three-component value, used to test an offset for being
   * zero without a square root.
   */
  static #lengthSq(value)
  {
    return value[0] * value[0] + value[1] * value[1] + value[2] * value[2];
  }
}
