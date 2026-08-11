import { expect, test } from "bun:test"
import { Compose, type Constructor, resolveDependencies } from "./index"

class HasAttributes {
    attrs = { a: 1 }
}

class HasCasts {
    cast(v: number) {
        return v * 2
    }
}

class HasAccessor {
    _label = "default"
    get label() {
        return this._label
    }
    set label(value: string) {
        this._label = value
    }
}

class TakesArgs {
    seen: any[] = []
    constructor(..._args: any[]) {
        this.seen.push("constructed")
    }
}

test("Compose.with(...traits) merges instance props and prototype methods", () => {
    class Model extends Compose.with(HasAttributes, HasCasts) {}
    const m = new Model()

    expect(m.attrs.a).toBe(1)
    expect(m.cast(3)).toBe(6)
})

test("Compose.with([traits]) array form is equivalent (back-compat)", () => {
    class Model extends Compose.with([HasAttributes, HasCasts]) {}
    const m = new Model()

    expect(m.attrs.a).toBe(1)
    expect(m.cast(3)).toBe(6)
})

test("accessor (get/set) descriptors are copied intact", () => {
    class Model extends Compose.with(HasAccessor) {}
    const m = new Model()

    expect(m.label).toBe("default")
    m.label = "changed"
    expect(m.label).toBe("changed")
})

test("trait constructors run but their args are not forwarded", () => {
    class Model extends Compose.with(TakesArgs) {}
    const m = new Model() as any

    expect(m.seen).toEqual(["constructed"])
})

test("conflicting instance properties throw on instantiation", () => {
    class Dup {
        attrs = { a: 1 }
    }

    const Model = Compose.with(HasAttributes, Dup)
    expect(() => new Model()).toThrow('Composition conflict: "attrs" from Dup already exists.')
})

test("conflicting prototype methods throw", () => {
    class Dup {
        cast(v: number) {
            return v
        }
    }

    expect(() => Compose.with(HasCasts, Dup)).toThrow('Composition conflict: "cast" from Dup already exists.')
})

test("empty trait list produces a plain Compose subclass", () => {
    class Model extends Compose.with() {}
    const m = new Model()

    expect(m).toBeInstanceOf(Compose)
})

// ── static `requires` dependency resolution ──────────────────────────────

class Attributes {
    attributes: Record<string, unknown> = {}
}

class Casts {
    static requires = [Attributes] as const
    cast(v: number) {
        return v * 2
    }
}

class Relationships {
    static requires = [Attributes] as const
    relations: Record<string, unknown> = {}
}

class Serialization {
    static requires = [Casts] as const
    serialize() {
        return "serialized"
    }
}

test("a composable with one dependency auto-includes it, typed (#1, #14)", () => {
    class Model extends Compose.with(Casts) {}
    const m = new Model()

    // `attributes` comes from Casts.requires, not a directly-requested
    // trait — typechecks because Casts declares `requires` `as const`.
    expect(m.attributes).toEqual({})
    expect(m.cast(3)).toBe(6)
})

test("multiple composables sharing a dependency include it once, typed (#2)", () => {
    class Model extends Compose.with(Casts, Relationships) {}
    const m = new Model()

    m.attributes.name = "hi"
    expect(m.relations).toEqual({})
    expect(m.cast(2)).toBe(4)
})

test("requires without `as const` still composes at runtime, just untyped", () => {
    class Untyped {
        static requires = [Attributes]
        untypedMethod() {
            return "ok"
        }
    }

    class Model extends Compose.with(Untyped) {}
    const m = new Model() as any

    expect(m.attributes).toEqual({})
    expect(m.untypedMethod()).toBe("ok")
})

test("explicitly supplying a required dependency is harmless (#3)", () => {
    const resolved = resolveDependencies([Attributes, Casts])

    expect(resolved).toEqual([Attributes, Casts])
})

test("transitive dependencies are recursively resolved (#4, #5)", () => {
    const resolved = resolveDependencies([Serialization])

    expect(resolved).toEqual([Attributes, Casts, Serialization])
})

test("preserves requested order among unrelated composables (#6)", () => {
    class Standalone {}

    const resolved = resolveDependencies([Standalone, Casts])

    expect(resolved).toEqual([Standalone, Attributes, Casts])
})

test("direct circular dependency throws with a readable path (#7)", () => {
    class A {
        static requires: Constructor[] = []
    }
    class B {
        static requires: Constructor[] = [A]
    }
    A.requires = [B]

    expect(() => Compose.with(A)).toThrow("Composition dependency cycle: A -> B -> A")
})

test("indirect circular dependency throws with the full path (#8)", () => {
    class A {
        static requires: Constructor[] = []
    }
    class B {
        static requires: Constructor[] = []
    }
    class C {
        static requires: Constructor[] = [A]
    }
    A.requires = [B]
    B.requires = [C]

    expect(() => Compose.with(A)).toThrow("Composition dependency cycle: A -> B -> C -> A")
})

test("prototype conflicts still throw after dependency expansion (#9)", () => {
    class WithMethod {
        static requires = [Casts]
        cast(v: number) {
            return v
        }
    }

    expect(() => Compose.with(WithMethod)).toThrow('Composition conflict: "cast" from WithMethod already exists.')
})

test("instance-field conflicts still throw after dependency expansion (#10)", () => {
    class A {
        value = 1
    }
    class B {
        value = 2
    }
    class C {
        static requires = [A, B]
    }

    const Model = Compose.with(C)
    expect(() => new Model()).toThrow('Composition conflict: "value" from B already exists.')
})

test("a composable without requires still works (#11)", () => {
    const resolved = resolveDependencies([Attributes])

    expect(resolved).toEqual([Attributes])
})

test("Compose.with(A, B) variadic form resolves dependencies (#12)", () => {
    class Model extends Compose.with(Casts, Relationships) {}
    const m = new Model()

    expect(m.cast(5)).toBe(10)
    expect(m.relations).toEqual({})
})

test("Compose.with([A, B]) array form resolves dependencies (#13)", () => {
    class Model extends Compose.with([Casts, Relationships]) {}
    const m = new Model()

    expect(m.cast(5)).toBe(10)
    expect(m.relations).toEqual({})
})

test("dedup is by constructor identity, not by class name (#15)", () => {
    const makeAttrsLike = () => class Attributes {}
    const AttributesA = makeAttrsLike()
    const AttributesB = makeAttrsLike()
    expect(AttributesA.name).toBe(AttributesB.name)

    const resolved = resolveDependencies([AttributesA, AttributesB])
    expect(resolved).toEqual([AttributesA, AttributesB])

    const deduped = resolveDependencies([Attributes, Attributes])
    expect(deduped).toEqual([Attributes])
})
