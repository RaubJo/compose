# @raubjo/compose

Trait-style multiple inheritance for TypeScript classes. Merges instance
properties and prototype methods from several classes into one, and throws
on name collisions instead of silently overwriting them.

```bash
bun install
```

## Usage

```ts
import { Compose } from "@raubjo/compose"

class HasAttributes {
	attrs: Record<string, unknown> = {}
}

class HasCasts {
	cast(value: number) {
		return value * 2
	}
}

class Model extends Compose.with(HasAttributes, HasCasts) {}

const model = new Model()
model.attrs.name = "hi"
model.cast(3) // 6
```

`Compose.with(...traits)` also accepts an array, `Compose.with([HasAttributes, HasCasts])`,
for cases where the trait list is built dynamically.

Trait classes are used as plain property/method bags:

- Instance fields (assigned in the trait's constructor, e.g. `attrs = {}`) are
  copied onto each new instance.
- Prototype methods and accessors (`get`/`set`) are copied onto the composed
  class's prototype, so they're shared across instances like normal methods.
- Trait constructors run (so instance fields get initialized), but any
  arguments passed to `new Model(...)` are only forwarded to `Compose`'s own
  constructor, not to the traits.

## Dependencies

A trait can declare other traits it needs via a static `requires` list. The
caller only has to ask for the capability it wants; `requires` is expanded
automatically:

```ts
class HasAttributes {
	attributes: Record<string, unknown> = {}
}

class HasCasts {
	static requires = [HasAttributes] as const

	cast(value: number) {
		return value * 2
	}
}

class Model extends Compose.with(HasCasts) {}

const model = new Model()

model.attributes.name = "Example" // typechecks, even though HasAttributes
model.cast(3) // 6                // was never passed to Compose.with()
```

- `requires` is resolved recursively — a required trait's own `requires` are
  pulled in too.
- A shared dependency is only composed once, however many traits require it,
  and deduplication is by constructor identity (not class name).
- Dependencies are always composed before the trait that requires them.
  Unrelated traits otherwise keep the order you passed to `Compose.with()`.
- A dependency cycle (`A` requires `B` requires `A`) throws instead of
  recursing forever: `Composition dependency cycle: A -> B -> A`.
- `requires` must be declared explicitly. Extending a trait with `extends`
  is plain JS inheritance and is never treated as a composition dependency.

The `as const` on `requires` is what makes a dependency's members show up on
the composed instance's *type*. Without it, `requires = [HasAttributes]`
still composes and works fine at runtime — TS just widens the array to
`Constructor[]`, losing which constructor is in it, so it can't add
`attributes` to `Model`'s type. `as const` keeps it a literal tuple instead.

## Conflicts

If two traits (or a trait and the class itself) define the same property or
method name, composition throws instead of letting one silently clobber the
other:

```ts
class A { value = 1 }
class B { value = 2 }

Compose.with(A, B) // fine, conflict isn't checked until instantiation for
                    // instance fields; prototype method conflicts throw here
new (Compose.with(A, B))()
// Error: Composition conflict: "value" from B already exists.
```

## Testing

```bash
bun test
bun test --coverage
```
