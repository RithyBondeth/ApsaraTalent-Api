/**
 * Copy plain data onto a DTO instance, skipping keys that the class exposes as
 * a getter with no setter.
 *
 * Why this is needed: response DTOs are reconstructed from plain objects that
 * have already crossed a JSON boundary — a TCP reply from another service, or a
 * value read back out of Redis. class-transformer materialises `@Expose()`
 * getters into ordinary data properties when it serialises, so the object
 * coming back carries keys like `availableTimes` that the class defines only as
 * an accessor. A bare `Object.assign` then throws:
 *
 *   TypeError: Cannot set property availableTimes of #<CompanyResponseDTO>
 *              which has only a getter
 *
 * That is what broke chat with a company: chat-service fetches the counterpart
 * through user-service and rebuilds a UserResponseDTO from the wire payload,
 * so every company conversation failed before a message could be persisted.
 *
 * Skipping is correct rather than merely safe — these values are derived from
 * other fields, so the getter recomputes them from the data that *was* copied.
 */
export function assignDtoData<T extends object>(
  target: T,
  partial: unknown,
): void {
  if (!partial || typeof partial !== 'object') return;

  for (const [key, value] of Object.entries(partial)) {
    if (isGetterOnly(target, key)) continue;
    (target as Record<string, unknown>)[key] = value;
  }
}

/**
 * True when `key` resolves to an accessor with a getter and no setter anywhere
 * on the prototype chain. Own data properties and plain fields return false, so
 * ordinary assignment is untouched.
 */
function isGetterOnly(target: object, key: string): boolean {
  let prototype: object | null = Object.getPrototypeOf(target);

  while (prototype && prototype !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
    if (descriptor) {
      return (
        typeof descriptor.get === 'function' &&
        typeof descriptor.set !== 'function'
      );
    }
    prototype = Object.getPrototypeOf(prototype);
  }

  return false;
}
