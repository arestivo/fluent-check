import { FluentPick } from './types'
import { Arbitrary } from './internal'

export class ChainedArbitrary<A, B> extends Arbitrary<B> {
  constructor(public readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => Arbitrary<B>) {
    super()
  }

  size() { return this.baseArbitrary.size() }
  pick(): FluentPick<B> | undefined {
    const pick = this.baseArbitrary.pick()
    return (pick === undefined) ? undefined : this.f(pick.value).pick()
  }

  cornerCases(): FluentPick<B>[] {
    return this.baseArbitrary.cornerCases().flatMap(p => this.f(p.value).cornerCases())
  }
}