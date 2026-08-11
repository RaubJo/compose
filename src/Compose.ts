import { copyProperties } from "./copyProperties"
import type { Constructor, InstanceOf, UnionToIntersection } from "./types"

type ComposedInstance<Traits extends readonly Constructor[]> = Compose & UnionToIntersection<InstanceOf<Traits[number]>>

type ComposedConstructor<Traits extends readonly Constructor[]> = new (...args: any[]) => ComposedInstance<Traits>

export class Compose {
    constructor(..._args: any[]) {}

    static with<const Traits extends readonly Constructor[]>(traits: Traits): ComposedConstructor<Traits>
    static with<const Traits extends readonly Constructor[]>(...traits: Traits): ComposedConstructor<Traits>
    static with(...args: any[]): ComposedConstructor<any> {
        // ponytail: array-arg call style kept for back-compat, no known callers use it
        const traits: Constructor[] = Array.isArray(args[0]) ? args[0] : args

        class ComposedClass extends Compose {
            constructor(...args: any[]) {
                super(...args)

                for (const Trait of traits) {
                    const instance = new Trait()

                    copyProperties(this, instance, Trait.name)
                }
            }
        }

        for (const Trait of traits) {
            copyProperties(ComposedClass.prototype, Trait.prototype, Trait.name, ["constructor"])
        }

        return ComposedClass as unknown as ComposedConstructor<any>
    }
}
