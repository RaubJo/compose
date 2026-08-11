export type Constructor<T = object> = new (...args: any[]) => T

// A composable may declare other composables it needs via a static
// `requires` list. Kept separate from `Constructor` so plain constructors
// (no `requires`) still satisfy every existing signature unchanged.
export type Composable<T = object> = Constructor<T> & {
    requires?: readonly Constructor[]
}

export type InstanceOf<T> = T extends Constructor<infer Instance> ? Instance : never

// The dependency list a composable declares, if TS can see it as a tuple.
// Plain `static requires = [X]` widens to `Constructor[]` (array, not
// tuple) per normal class-field inference, so this resolves to `readonly
// []` for it — same as a composable with no `requires` at all. Writing
// `static requires = [X] as const` keeps the literal tuple and lets
// `ExpandTraits` recurse into it below.
type RequiresOf<T> = T extends { requires: infer Required extends readonly Constructor[] } ? Required : readonly []

// Recursively expands each trait's `requires` (dependencies first, then
// the trait itself), for typing the composed instance. Duplicate entries
// from shared dependencies are harmless: `ComposedInstance` only reads
// this as a union, and unions collapse identical members.
export type ExpandTraits<Traits extends readonly Constructor[]> = Traits extends readonly [
    infer Head extends Constructor,
    ...infer Rest extends readonly Constructor[],
]
    ? readonly [...ExpandTraits<RequiresOf<Head>>, Head, ...ExpandTraits<Rest>]
    : readonly []

export type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (
    value: infer Intersection,
) => void
    ? Intersection
    : never
