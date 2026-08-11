import { expect, test } from "bun:test"
import { Compose } from "./index"

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
