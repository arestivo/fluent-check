import {FluentStrategyTypeFactory} from './FluentStrategyFactory'

const RANDOM = new FluentStrategyTypeFactory()
  .withRandomSampling()
  .withoutReplacement()
  .usingCache()

export const PBT_R_S1 = () => RANDOM
export const PBT_R_S2 = () => RANDOM.withBias()
export const PBT_R_S3 = (path = '') => RANDOM.withConstantExtraction({globSource: path})
export const PBT_R_S4 = () => RANDOM.withPairWiseTesting()
export const PBT_R_S5 = (path = '') => RANDOM.withBias().withConstantExtraction({globSource: path})
export const PBT_R_S6 = () => RANDOM.withBias().withPairWiseTesting()
export const PBT_R_S7 = (path = '') => RANDOM.withConstantExtraction({globSource: path}).withPairWiseTesting()
export const PBT_R_S8 = (path = '') => RANDOM.withBias()
  .withConstantExtraction({globSource: path})
  .withPairWiseTesting()

const COVERAGE_GUIDED = new FluentStrategyTypeFactory()
  .withCoverageGuidance()
  // .withoutReplacement()
  // .usingCache()

export const PBT_CG_S1 = () => COVERAGE_GUIDED
export const PBT_CG_S2 = () => COVERAGE_GUIDED.withBias()
export const PBT_CG_S3 = (path = '') => COVERAGE_GUIDED.withConstantExtraction({globSource: path})
export const PBT_CG_S4 = () => COVERAGE_GUIDED.withPairWiseTesting()
export const PBT_CG_S5 = (path = '') => COVERAGE_GUIDED.withBias().withConstantExtraction({globSource: path})
export const PBT_CG_S6 = () => COVERAGE_GUIDED.withBias().withPairWiseTesting()
export const PBT_CG_S7 = (path = '') => COVERAGE_GUIDED.withConstantExtraction({globSource: path}).withPairWiseTesting()
export const PBT_CG_S8 = (path = '') => COVERAGE_GUIDED.withBias()
  .withConstantExtraction({globSource: path})
  .withPairWiseTesting()