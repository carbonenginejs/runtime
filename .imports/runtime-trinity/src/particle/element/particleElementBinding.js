// Source: E:\carbonengine\trinity\trinity\ITr2AttributeGenerator.h

/**
 * Claims a particle-system element of the given type for one consumer, so two consumers cannot write the same element.
 * @param {object} particleSystem must implement Carbon's GetElement contract
 * @param {Set} boundElements shared set of already-claimed element keys; the claimed key is added to it
 * @returns {object|null} the element, or null when the system has no such element or it is already claimed
 */
export function bindParticleElement(particleSystem, type, boundElements)
{
  if (!particleSystem || typeof particleSystem.GetElement !== "function")
  {
    throw new TypeError("Particle element binding requires Carbon's Tr2ParticleSystem.GetElement contract.");
  }
  if (!(boundElements instanceof Set))
  {
    throw new TypeError("Particle element binding requires Carbon's shared bound-elements Set.");
  }

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
  if (!particleSystem || typeof particleSystem.GetElementDeclaration !== "function")
  {
    throw new TypeError("Particle binding validation requires Carbon's Tr2ParticleSystem.GetElementDeclaration contract.");
  }
  if (!(boundElements instanceof Set))
  {
    throw new TypeError("Particle binding validation requires Carbon's shared bound-elements Set.");
  }

  const declaration = particleSystem.GetElementDeclaration();
  if (!(declaration instanceof Map))
  {
    throw new TypeError("Tr2ParticleSystem.GetElementDeclaration must return the CPU declaration Map.");
  }
  for (const key of declaration.keys())
  {
    if (!boundElements.has(key))
    {
      return true;
    }
  }
  return false;
}
