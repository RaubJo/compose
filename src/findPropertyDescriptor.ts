export function findPropertyDescriptor(target: object, key: PropertyKey): PropertyDescriptor | undefined {
    let current: object | null = target

    while (current) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key)

        if (descriptor) {
            return descriptor
        }

        current = Object.getPrototypeOf(current)
    }

    return undefined
}
