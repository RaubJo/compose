import type { Composable, Constructor } from "./types"

/**
 * Expands `static requires` into a flat, deduplicated, dependency-first
 * order: DFS post-order over the `requires` graph. `visiting` catches
 * cycles mid-traversal; `resolved`/`seen` dedupe by constructor identity.
 */
export function resolveDependencies(traits: readonly Composable[]): Constructor[] {
    const resolved: Constructor[] = []
    const seen = new Set<Constructor>()
    const visiting = new Set<Constructor>()

    function visit(trait: Composable, path: Constructor[]): void {
        if (seen.has(trait)) return

        if (visiting.has(trait)) {
            const cycle = [...path, trait].map((t) => t.name).join(" -> ")
            throw new Error(`Composition dependency cycle: ${cycle}`)
        }

        visiting.add(trait)

        for (const dependency of trait.requires ?? []) {
            visit(dependency, [...path, trait])
        }

        visiting.delete(trait)
        seen.add(trait)
        resolved.push(trait)
    }

    for (const trait of traits) {
        visit(trait, [])
    }

    return resolved
}
