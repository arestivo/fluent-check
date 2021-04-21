import {MixinStrategy} from '../FluentStrategyTypes'

export function Cached<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {
    protected setArbitraryCache<K extends string>(arbitraryName: K) {
      if (this.arbitraries[arbitraryName].cache === undefined)
        this.arbitraries[arbitraryName].cache = this.buildArbitraryCollection(
          this.arbitraries[arbitraryName].arbitrary,
          this.getArbitraryExtractedConstants(this.arbitraries[arbitraryName].arbitrary))
    }
  }
}
