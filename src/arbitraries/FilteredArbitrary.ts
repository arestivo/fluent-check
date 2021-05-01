import {FluentPick} from './types'
import {BetaDistribution} from '../statistics'
import {Arbitrary, NoArbitrary, WrappedArbitrary} from './internal'
import {StrategyExtractedConstants} from '../strategies/FluentStrategyTypes'
import {lowerCredibleInterval, mapArbitrarySize, upperCredibleInterval, computeNumMutations} from './util'

export class FilteredArbitrary<A> extends WrappedArbitrary<A> {
  sizeEstimation: BetaDistribution

  constructor(readonly baseArbitrary: Arbitrary<A>, public readonly f: (a: A) => boolean) {
    super(baseArbitrary)
    this.sizeEstimation = new BetaDistribution(2, 1) // use 1,1 for .mean instead of .mode in point estimation
  }

  size() {
    // TODO: Still not sure if we should use mode or mean for estimating the size (depends on which error we are trying
    // to minimize, L1 or L2)
    // Also, this assumes we estimate a continuous interval between 0 and 1;
    // We could try to change this to a beta-binomial distribution, which would provide us a discrete approach
    // for when we know the exact base population size.
    return mapArbitrarySize(this.baseArbitrary.size(), v => ({
      type: 'estimated',
      value: Math.round(v * this.sizeEstimation.mode()),
      credibleInterval: [
        v * this.sizeEstimation.inv(lowerCredibleInterval),
        v * this.sizeEstimation.inv(upperCredibleInterval)
      ]
    }))
  }

  pick(generator: () => number): FluentPick<A> | undefined {
    do {
      const pick = this.baseArbitrary.pick(generator)
      if (pick === undefined) break // TODO: update size estimation accordingly
      if (this.f(pick.value)) { this.sizeEstimation.alpha += 1; return pick }
      this.sizeEstimation.beta += 1
      // If we have a pretty good confidence that the size < 1, we stop trying
    } while (this.baseArbitrary.size().value * this.sizeEstimation.inv(upperCredibleInterval) >= 1)

    return undefined
  }

  cornerCases() { return this.baseArbitrary.cornerCases().filter(a => this.f(a.value)) }

  extractedConstants(constants: StrategyExtractedConstants): FluentPick<A>[] {
    return this.baseArbitrary.extractedConstants(constants).filter(a => this.f(a.value))
  }

  shrink(initialValue: FluentPick<A>) {
    if (!this.f(initialValue.value)) return NoArbitrary
    return this.baseArbitrary.shrink(initialValue).filter(v => this.f(v))
  }

  canGenerate(pick: FluentPick<A>) {
    return this.baseArbitrary.canGenerate(pick) && this.f(pick.value)
  }

  mutate(pick: FluentPick<A>, generator: () => number, maxNumMutations: number): FluentPick<A>[] {
    const result: FluentPick<A>[] = []
    const numMutations = computeNumMutations(this.size(), generator, maxNumMutations)

    while (result.length < numMutations) {
      const mutatedPick = this.baseArbitrary.mutate(pick, generator, 1)[0]
      if (mutatedPick === undefined) return result
      else if (this.canGenerate(mutatedPick)
      && JSON.stringify(pick.value) !== JSON.stringify(mutatedPick.value)
      && result.every(x => JSON.stringify(x.value) !== JSON.stringify(mutatedPick.value))) result.push(mutatedPick)
    }

    return result
  }

  toString(depth = 0) {
    return ' '.repeat(depth * 2) +
      `Filtered Arbitrary: f = ${this.f.toString()}\n` + this.baseArbitrary.toString(depth + 1)
  }
}
