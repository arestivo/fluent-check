import { BetaDistribution } from './statistics'

export type FluentPick<V> = {
  value: V
  original?: any
}

export type ArbitrarySize = {
  value: number
  type: 'exact' | 'estimated'
  credibleInterval?: [number, number]
}

const NilArbitrarySize: ArbitrarySize = { value: 0, type: 'exact' }
const significance = 0.90
const lowerCredibleInterval = (1 - significance) / 2
const upperCredibleInterval = 1 - lowerCredibleInterval

// -----------------------------
// ------ Base Arbitraries -----
// -----------------------------

export abstract class Arbitrary<A> {
  abstract size(): ArbitrarySize

  mapArbitrarySize(f: (v: number) => ArbitrarySize): ArbitrarySize {
    const baseSize = this.size()
    const result = f(baseSize.value)
    return { value : result.value,
      type : baseSize.type === 'exact' && result.type === 'exact' ? 'exact' : 'estimated',
      credibleInterval : result.credibleInterval }
  }

  pick(): FluentPick<A> | undefined { return undefined }

  sample(sampleSize = 10): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    for (let i = 0; i < sampleSize; i += 1) {
      const pick = this.pick()
      if (pick) result.push(pick)
      else break
    }

    return result
  }

  cornerCases(): FluentPick<A>[] { return [] }

  sampleWithBias(sampleSize = 10): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize)

    const sample = this.sample(sampleSize - cornerCases.length)
    sample.unshift(...cornerCases)

    return sample
  }

  shrink(_initial: FluentPick<A>): Arbitrary<A> {
    return NoArbitrary
  }

  canGenerate(_: FluentPick<A>): boolean {
    return false
  }

  map<B>(f: (a: A) => B): Arbitrary<B> { return new MappedArbitrary(this, f) }
  filter(f: (a: A) => boolean): Arbitrary<A> { return new FilteredArbitrary(this, f) }
  chain<B>(f: (a: A) => Arbitrary<B>): Arbitrary<B> { return new ChainedArbitrary(this, f) }
  unique(): Arbitrary<A> { return new UniqueArbitrary(this) }
}

// -----------------------------
// ---- Special Arbitraries ----
// -----------------------------

const NoArbitrary: Arbitrary<any> = new class extends Arbitrary<any> {
  size(): ArbitrarySize { return { value: 0, type: 'exact' } }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never[]>) { return false }
}()

class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    return this.arbitrary.mapArbitrarySize(v => ({ value: v ** (this.max - this.min), type: 'exact' }))
  }

  pick(): FluentPick<A[]> | undefined {
    const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    const fpa = this.arbitrary.sampleWithBias(size)

    const value = fpa.map(v => v.value)
    const original = fpa.map(v => v.original)

    return {
      value,
      original: original.every(o => o === undefined) ? value : original
    }
  }

  shrink(initial: FluentPick<A[]>): Arbitrary<A[]> {
    if (this.min === initial.value.length) return NoArbitrary

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return union(array(this.arbitrary, start, middle), array(this.arbitrary, middle + 1, end))
  }

  canGenerate(pick: FluentPick<A[]>) {
    return pick.value.length >= this.min && pick.value.length <= this.max &&
           pick.value.every((v, i) => this.arbitrary.canGenerate({ value: v, original: pick.original[i] }))
  }

  cornerCases(): FluentPick<A[]>[] {
    return this.arbitrary.cornerCases().flatMap(cc => [
      { value: Array(this.min).fill(cc.value), original: Array(this.min).fill(cc.original) },
      { value: Array(this.max).fill(cc.value), original: Array(this.max).fill(cc.original) }
    ]).filter(v => v !== undefined) as FluentPick<A[]>[]
  }
}

class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      e.mapArbitrarySize(v => ({ value: acc.value + v, type: acc.type })),
    NilArbitrarySize)
  }

  pick() {
    const picked = Math.floor(Math.random() * this.arbitraries.length)
    return this.arbitraries[picked].pick()
  }

  cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial)).map(a => a.shrink(initial)).filter(a => a !== NoArbitrary)
    if (arbitraries.length === 0) return NoArbitrary
    return union(...arbitraries)
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }
}

// -----------------------------
// --- Primitive Arbitraries ---
// -----------------------------

class ArbitraryInteger extends Arbitrary<number> {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super()
    this.min = min
    this.max = max
  }

  size(): ArbitrarySize { return { value: this.max - this.min + 1, type: 'exact' } }

  pick() { return { value: Math.floor(Math.random() * (this.max - this.min + 1)) + this.min } }

  cornerCases() {
    return (this.min < 0 && this.max > 0) ?
      [{ value: 0 }, { value: this.min }, { value: this.max }] :
      [{ value: this.min }, { value: this.max }]
  }

  shrink(initial: FluentPick<number>): Arbitrary<number> {
    if (initial.value > 0) {
      const lower = Math.max(0, this.min)
      const upper = Math.max(lower, initial.value! - 1)
      const midpoint = Math.floor((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return union(new ArbitraryInteger(lower, midpoint - 1), new ArbitraryInteger(midpoint, upper))
    } else if (initial.value! < 0) {
      const upper = Math.min(0, this.max)
      const lower = Math.min(upper, initial.value! + 1)
      const midpoint = Math.ceil((upper + lower) / 2)

      if (lower === upper) return NoArbitrary

      return union(new ArbitraryInteger(midpoint, upper), new ArbitraryInteger(lower, midpoint - 1))
    }

    return NoArbitrary
  }

  canGenerate(pick: FluentPick<number>) {
    return pick.value >= this.min && pick.value <= this.max
  }
}

class ArbitraryReal extends ArbitraryInteger {
  constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
    super(min, max)
  }

  pick() { return { value: Math.random() * (this.max - this.min) + this.min } }
}

// -----------------------------
// -- Transformed Arbitraries --
// -----------------------------

class WrappedArbitrary<A> extends Arbitrary<A> {
  constructor(public readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super()
  }

  pick() { return this.baseArbitrary.pick() }
  size() { return this.baseArbitrary.size() }
  cornerCases() { return this.baseArbitrary.cornerCases() }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick)
  }
}

class ArbitraryConstant<A> extends Arbitrary<A> {
  constructor(public readonly constant: A) {
    super()
  }

  size(): ArbitrarySize { return { type: 'exact', value: 1 } }
  pick(): FluentPick<A> { return { value: this.constant } }
  cornerCases() { return [ this.pick() ]}
}

class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  size() { return this.baseArbitrary.size() }
  pick() {
    const pick = this.baseArbitrary.pick()
    return (pick === undefined) ? undefined : this.f(pick.value).pick()
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }
}

class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super(baseArbitrary)
  }

  sample(sampleSize = 10): FluentPick<A>[] {
    // TODO: Here lies dragons! If you see start seeing things in double when
    // using this arbitrary, consider the culprit might lie in the way Map
    // deals with keys and equality
    const result = new Map<A, FluentPick<A>>()

    let bagSize = sampleSize
    while (result.size < bagSize) {
      const r = this.pick()
      if (!r) break
      if (!result.has(r.value)) result.set(r.value, r)
      bagSize = Math.min(sampleSize, this.size().value)
    }

    return Array.from(result.values())
  }

  shrink(initial: FluentPick<A>) {
    return this.baseArbitrary.shrink(initial).unique()
  }
}

class MappedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => B) {
    super()
  }

  mapFluentPick(p: FluentPick<A>): FluentPick<B> {
    const original = ('original' in p) ? p.original : p.value
    return ({ original, value: this.f(p.value) })
  }

  pick(): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick()
    return pick ? this.mapFluentPick(pick) : undefined
  }

  // TODO: This is not strictly true when the mapping function is not bijective. I suppose this is
  // a count-distinct problem, so we should probably either count the cardinality with a Set (for
  // small arbitraries), or use a cardinality estimator such as HyperLogLog for big ones. One
  // interesting information we could leverage here is that the new arbitrary size will never
  // be *above* the baseArbitrary.
  size() { return this.baseArbitrary.size() }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().map(p => this.mapFluentPick(p))
  }

  shrink(initial: FluentPick<B>): Arbitrary<B> {
    return this.baseArbitrary.shrink({ original: initial.original, value: initial.original }).map(v => this.f(v))
  }

  canGenerate(pick: FluentPick<B>) {
    return this.baseArbitrary.canGenerate({ value: pick.original, original: pick.original }) /* && pick.value === this.f(pick.original) */
  }
}

class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

  constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
    super(baseArbitrary)
    this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
  }

  size() {
    // TODO: Still not sure if we should use mode or mean for estimating the size (depends on which error we are trying to minimize, L1 or L2)
    // Also, this assumes we estimate a continuous interval between 0 and 1;
    // We could try to change this to a beta-binomial distribution, which would provide us a discrete approach
    // for when we know the exact base population size.
    return this.baseArbitrary.mapArbitrarySize(v =>
      ({ type: 'estimated',
        value: Math.round(v * this.sizeEstimation.mode()),
        credibleInterval: [v * this.sizeEstimation.inv(lowerCredibleInterval), v * this.sizeEstimation.inv(upperCredibleInterval)] }))
  }

  pick(): FluentPick<A> | undefined {
    do {
      const pick = this.baseArbitrary.pick()
      if (!pick) break // TODO: update size estimation accordingly
      if (this.f(pick.value)) { this.sizeEstimation.update(1, 0); return pick }
      this.sizeEstimation.update(0, 1)
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1) // If we have a pretty good confidence that the size < 1, we stop trying

    return undefined
  }

  cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    return this.baseArbitrary.shrink(initialValue).filter(v => this.f(v))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) /* && this.f(pick.value) */
  }
}

// -----------------------------
// ---- Derived Arbitraries ----
// -----------------------------

class ArbitraryBoolean extends MappedArbitrary<number, boolean> {
  constructor() { super(new ArbitraryInteger(0, 1), x => x === 0) }
  shrink(_: FluentPick<boolean>) { return NoArbitrary }
  canGenerate(pick: FluentPick<boolean>) { return pick.value !== undefined}
}

class ArbitraryString extends MappedArbitrary<string[], string> {
  constructor(public readonly min = 2, public readonly max = 10, public readonly chars = 'abcdefghijklmnopqrstuvwxyz') {
    super(array(integer(0, chars.length - 1).map(n => this.chars[n]), min, max), a => a.join(''))
  }

  canGenerate(pick: FluentPick<string>) {
    // const value = pick.value.split('').map(c => this.chars[c])
    return this.baseArbitrary.canGenerate({ value: pick.original, original: pick.original })
  }
}

// -----------------------------
// ----- Arbitrary Builders ----
// -----------------------------

export const integer  = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryInteger(min, max))
export const real     = (min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): Arbitrary<number> => min > max ? NoArbitrary : (min === max ? new ArbitraryConstant(min) : new ArbitraryReal(min, max))
export const nat      = (min = 0, max = Number.MAX_SAFE_INTEGER) => new ArbitraryInteger(min, max)
export const string   = (min = 2, max = 10, chars = 'abcdefghijklmnopqrstuvwxyz') => chars === '' ? new ArbitraryConstant('') : new ArbitraryString(min, max, chars)
export const array    = <A>(arbitrary: Arbitrary<A>, min = 0, max = 10) => min > max ? NoArbitrary : new ArbitraryArray(arbitrary, min, max)
export const union    = <A>(...arbitraries: Arbitrary<A>[]) => arbitraries.length === 1 ? arbitraries[0] : new ArbitraryComposite(arbitraries)
export const boolean  = () => new ArbitraryBoolean()
export const empty    = () => NoArbitrary
export const constant = <A>(constant: A) => new ArbitraryConstant(constant)