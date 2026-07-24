// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocatorSets.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Utils\EveLocatorSets.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Locator } from "./Locator.js";


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
  @carbon.method
  @impl.adapted
  Append(locators)
  {
    for (const locator of locators)
    {
      this.locators.push(Locator.from(locator));
    }
  }
  @carbon.method
  @impl.implemented
  HasName(name)
  {
    return this.name === String(name);
  }
  @carbon.method
  @impl.implemented
  GetLocators()
  {
    return this.locators;
  }
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }
  @carbon.method
  @impl.adapted
  Set(name, locators)
  {
    this.SetName(name);
    this.locators = locators.map(locator => Locator.from(locator));
  }
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

  static #lengthSq(value)
  {
    return value[0] * value[0] + value[1] * value[1] + value[2] * value[2];
  }
}
