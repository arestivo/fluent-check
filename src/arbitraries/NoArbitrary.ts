import {ArbitrarySize, FluentPick} from './types'
import {Arbitrary} from './internal'

export const NoArbitrary: Arbitrary<never> = new class extends Arbitrary<never> {
  pick(): FluentPick<never> | undefined { return undefined }
  calculateIndex(_: FluentPick<any>) { return undefined }
  size(): ArbitrarySize { return {value: 0, type: 'exact', credibleInterval: [0, 0]} }
  calculateCoverage(_: number): number { return 1 }
  sampleWithBias(): FluentPick<never>[] { return [] }
  sample(): FluentPick<never>[] { return [] }
  map(_: (a: never) => any) { return NoArbitrary }
  filter(_: (a: never) => boolean) { return NoArbitrary }
  unique() { return NoArbitrary }
  canGenerate(_: FluentPick<never>) { return false }
  chain<B>(_: (a: never) => Arbitrary<B>) { return NoArbitrary }
  toString(depth = 0) { return ' '.repeat(depth * 2) + 'No Arbitrary' }
}()
