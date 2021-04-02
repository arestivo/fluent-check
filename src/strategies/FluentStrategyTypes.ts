import * as espree from 'espree'
import {Arbitrary, FluentPick} from '../arbitraries'
import {FluentStrategy} from './FluentStrategy'
import * as libCoverage from 'istanbul-lib-coverage'

export declare class MixinInstance {}
export type MixinConstructor<T = {}> = new (...args: any[]) => T
export type MixinStrategy = MixinConstructor<FluentStrategy>

export type StrategyArbitraries = Record<string, FluentStrategyArbitrary<any>>
export type StrategyExtractedConstants = Record<string, Array<any>>

export type Token = espree.Token

export type FileCoverage = libCoverage.FileCoverage
export type CoverageSummary = libCoverage.CoverageSummary

export type FluentStrategyArbitrary<A> = {
  pickNum: number
  arbitrary: Arbitrary<A>
  cache?: FluentPick<A>[]
  collection: FluentPick<A>[]
}

export type FluentStrategyConfig = {
  sampleSize: number,
  shrinkSize: number,
  globSource: string,
  maxNumConst: number
  numericConstMaxRange: number
  maxStringTransformations: number
  importsPath: string
}

export type ConstantExtractionConfig = {
  globSource?: string,
  maxNumConst?: number
  numericConstMaxRange?: number
  maxStringTransformations?: number
}
