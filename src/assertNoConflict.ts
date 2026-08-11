import { findPropertyDescriptor } from "./findPropertyDescriptor"

export function assertNoConflict(target: object, key: PropertyKey, sourceName: string): void {
    if (!findPropertyDescriptor(target, key)) {
        return
    }

    throw new Error(`Composition conflict: "${String(key)}" from ${sourceName} already exists.`)
}
