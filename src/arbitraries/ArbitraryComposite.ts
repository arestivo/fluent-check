import {Arbitrary} from './internal'
import {FluentPick} from './types'
import {mapArbitrarySize, NilArbitrarySize} from './util'
import * as fc from './index'

export class ArbitraryComposite<A> extends Arbitrary<A> {
  constructor(public arbitraries: Arbitrary<A>[] = []) {
    super()
  }

  size() {
    return this.arbitraries.reduce((acc, e) =>
      mapArbitrarySize(e.size(), v => ({value: acc.value + v, type: acc.type, credibleInterval: acc.credibleInterval})),
    NilArbitrarySize
    )
  }

  pick(generator: () => number) {
    const weights = this.arbitraries.reduce(
      (acc, a) => { acc.push((acc[acc.length - 1] | 0) + a.size().value); return acc },
      new Array<number>()
    )
    const picked = Math.floor(generator() * weights[weights.length - 1])

    const idx = weights.findIndex(s => s > picked)
    const pick = this.arbitraries[idx].pick(generator)
    if (pick !== undefined && pick.index !== undefined)
      for (let i = 0; i < idx; i++)
        pick.index += this.arbitraries[i].size().value
    return pick
  }

  cornerCases(): FluentPick<A>[] {
    return this.arbitraries.flatMap(a => a.cornerCases())
  }

  shrink(initial: FluentPick<A>) {
    const arbitraries = this.arbitraries.filter(a => a.canGenerate(initial)).map(a => a.shrink(initial))
    return fc.union(...arbitraries)
  }

  canGenerate(pick: FluentPick<A>) {
    return this.arbitraries.some(a => a.canGenerate(pick))
  }

  toString(depth = 0) {
    return ' '.repeat(2 * depth) +
      'Composite Arbitrary:\n' + this.arbitraries.map(a => a.toString(depth + 1)).join('\n')
  }
}
