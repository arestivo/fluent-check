import { BetaDistribution } from '../statistics'
import { FluentPick } from './types'
import { lowerCredibleInterval, upperCredibleInterval } from './util'
import { BaseArbitrary, NoArbitrary, WrappedArbitrary } from './internal'

export class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

  constructor(readonly baseArbitrary: BaseArbitrary<A>, public readonly f: (a: A) => boolean) {
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