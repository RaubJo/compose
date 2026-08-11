export type Constructor<T = object> = new (...args: any[]) => T

export type InstanceOf<T> = T extends Constructor<infer Instance> ? Instance : never

export type UnionToIntersection<T> = (T extends unknown ? (value: T) => void : never) extends (
    value: infer Intersection,
) => void
    ? Intersection
    : never
