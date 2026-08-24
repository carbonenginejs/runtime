// Source: trinity/trinity/ITr2AttributeGenerator.h

/**
 * Claims a particle-system element of the given type for one consumer, so two consumers cannot write the same element.
 * @param {object} particleSystem Carbon particle system
 * @param {Set} boundElements shared set of already-claimed element keys; the claimed key is added to it
 * @returns {object|null} the element, or null when the system has no such element or it is already claimed
 */
export function bindParticleElement(particleSystem, type, boundElements)
{
  const element = particleSystem.GetElement(type);
  if (!element || boundElements.has(element.key))
  {
    return null;
  }
  boundElements.add(element.key);
  return element;
}

/**
 * Reports whether any element in the particle system's CPU declaration has not
 * yet been claimed in the shared bound-elements set, which means some consumer
 * would read uninitialised data.
 */
export function hasUnboundParticleElements(particleSystem, boundElements)
{
  const declaration = particleSystem.GetElementDeclaration();
  for (const key of declaration.keys())
  {
    if (!boundElements.has(key))
    {
      return true;
    }
  }
  return false;
}
