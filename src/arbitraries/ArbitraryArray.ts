import { FluentPick } from './types'
import { mapArbitrarySize } from './util'
import { Arbitrary } from './internal'
import * as fc from './index'

export class ArbitraryArray<A> extends Arbitrary<A[]> {
  constructor(public arbitrary: Arbitrary<A>, public min = 0, public max = 10) {
    super()
  }

  size() {
    return mapArbitrarySize(this.arbitrary.size(), v => ({ value: v ** (this.max - this.min), type: 'exact' }))
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
    if (this.min === initial.value.length) return fc.empty()

    const start = this.min
    const middle = Math.floor((this.min + initial.value.length) / 2)
    const end = initial.value.length - 1

    return fc.union(fc.array(this.arbitrary, start, middle), fc.array(this.arbitrary, middle + 1, end))
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