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
