import {FluentPick} from './types'
import {Arbitrary, WrappedArbitrary} from './internal'
import {stringify} from './util'

export class UniqueArbitrary<A> extends WrappedArbitrary<A> {
  constructor(readonly baseArbitrary: NonNullable<Arbitrary<A>>) {
    super(baseArbitrary)
  }

  sample(sampleSize = 10, cornerCases: FluentPick<A>[] = []): FluentPick<A>[] {
    // TODO: Here lies dragons! If you see start seeing things in double when
    // using this arbitrary, consider the culprit might lie in the way Map
    // deals with keys and equality
    const result = new Map<string, FluentPick<A>>()

    for (const k in cornerCases)
      result.set(stringify(cornerCases[k].value), cornerCases[k])

    const initialSize = this.size()
    let bagSize = Math.min(sampleSize, initialSize.value)
    while (result.size < bagSize) {
      const r = this.pick()
      if (!r) break
      if (!result.has(stringify(r.value))) result.set(stringify(r.value), r)
      if (initialSize.type !== 'exact') bagSize = Math.min(sampleSize, this.size().value)
    }

    return Array.from(result.values())
  }

  sampleWithBias(sampleSize = 10): FluentPick<A>[] {
    const cornerCases = this.cornerCases()

    if (sampleSize <= cornerCases.length)
      return this.sample(sampleSize)

    return this.sample(sampleSize, cornerCases)
  }

  shrink(initial: FluentPick<A>) {
    return this.baseArbitrary.shrink(initial).unique()
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      'Unique Arbitrary:\n' + this.baseArbitrary.toString(depth + 1)
  }
}
