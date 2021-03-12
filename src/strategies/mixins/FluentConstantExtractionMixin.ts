
import * as espree from 'espree'
import * as glob from 'glob'
import * as fs from 'fs'
import {Arbitrary, FluentPick} from '../../arbitraries'
import {MixinStrategy, StrategyExtractedConstants, Token} from '../FluentStrategyTypes'

export function ConstantExtractionBased<TBase extends MixinStrategy>(Base: TBase) {
  return class extends Base {

    /**
     * Indicates whether the extraction process was already performed (True) or not (False).
     */
    public extractionStatus = false

    /**
     * Record that contains all the constants extracted.
     */
    public constants: StrategyExtractedConstants = {'numeric': []}

    /**
     * Tokenizes either the file or function passed as parameter.
     */
    tokenize(data: Buffer | ((...args: any[]) => boolean)) {
      const tokens = espree.tokenize(data.toString('utf-8')) //.replace(/['`]/g, '"')
      this.parseNumericTokens(tokens)
    }

    /**
     * Parses the numeric tokens already extracted. So far it only extract integer constants.
     * TODO - Parse floats
     */
    parseNumericTokens(tokens: Token[]) {
      const filteredTokens = tokens.filter(token => {
        return (token.type === 'Punctuator') || (token.type === 'Numeric' && !token.value.includes('.'))
      })

      const numericsAndPunctuators = filteredTokens.reduce(function (acc, token, index) {
        if (token.type === 'Numeric')
          acc.push(
            {punctuator: filteredTokens[index - 1], numeric: filteredTokens[index]},
            {punctuator: filteredTokens[index + 1], numeric: filteredTokens[index]}
          )
        return acc
      }, [])

      const constants: number[] = []
      const lesserThanConstants: number[] = []
      const greaterThanConstants: number[] = []

      for (const pair of numericsAndPunctuators) {
        if (pair.punctuator === undefined) continue

        const punctuator = pair.punctuator.value
        const value = Number.parseInt(pair.numeric.value)

        if (punctuator === '===' || punctuator === '==' || punctuator === '>=' || punctuator === '<=')
          constants.push(value)
        else if (punctuator === '!==' || punctuator === '!=') constants.push(value - 1, value + 1)
        else if (punctuator === '>') greaterThanConstants.push(value + 1)
        else if (punctuator === '<') lesserThanConstants.push(value - 1)
        else constants.push(value * (punctuator === '-' ? -1 : 1))

      }

      greaterThanConstants.sort((a,b) => a - b)
      lesserThanConstants.sort((a,b) => a - b)

      let last
      constants.push(...greaterThanConstants
        .flatMap(lower => lesserThanConstants.map(upper => ([lower, upper])))
        .filter(range => (range[0] < range[1] && range[1] - range[0] <= this.configuration.maxRange!))
        .reduce((nonOverlappingRanges, range) => {
          if (!last || range[0] > last[1]) nonOverlappingRanges.push(last = range)
          else if (range[1] > last[1]) last[1] = range[1]
          return nonOverlappingRanges
        }, [] as any)
        .flatMap(range => (
          Array.from({length: range[1] - range[0] + 1}, (_, index) => index + 1).map(value => value + range[0] - 1))
        )
      )

      this.constants['numeric'] = [...new Set(this.constants['numeric'].concat(constants))]
    }

    /**
     * Extracts the constants from a set of functions and files and returns an array of FluentPicks.
     */
    extractConstants() {
      for (const assertion of this.assertions)
        this.tokenize(assertion)

      if (this.configuration.globSource !== '') {
        const files = fs.lstatSync(this.configuration.globSource!).isDirectory() ?
          glob.sync(this.configuration.globSource + '/**/*', {nodir: true}) :
          [this.configuration.globSource]

        for (const file of files)
          this.tokenize(fs.readFileSync(file))
      }
    }

    getArbitraryExtractedConstants<A>(arbitrary: Arbitrary<A>): FluentPick<A>[] {
      if (!this.extractionStatus) {
        this.extractConstants()
        this.extractionStatus = !this.extractionStatus
      }

      const extractedConstants: Array<FluentPick<A>> = []

      if (arbitrary.toString().includes('Integer Arbitrary'))
        for (const elem of this.constants['numeric'])
          if (arbitrary.canGenerate({value: elem, original: elem}))
            extractedConstants.push({value: elem, original: elem})

      return extractedConstants
    }

  }
}
