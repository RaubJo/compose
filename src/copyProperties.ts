import { assertNoConflict } from "./assertNoConflict"

export function copyProperties(target: object, source: object, sourceName: string, exclude: PropertyKey[] = []): void {
    for (const key of Reflect.ownKeys(source)) {
        if (exclude.includes(key)) {
            continue
        }

        assertNoConflict(target, key, sourceName)

        const descriptor = Object.getOwnPropertyDescriptor(source, key)

        if (descriptor) {
            Object.defineProperty(target, key, descriptor)
        }
    }
}
