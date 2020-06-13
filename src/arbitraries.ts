export abstract class Arbitrary<A> { 
    pick(): A | undefined { return undefined }

    sample(size: number = 10): A[] {
        const result = []
        for (let i = 0; i < size; i += 1)
            result.push(this.pick())

        return result
    }

    cornerCases(): A[] { return [] }

    sampleWithBias(size: number = 10): A[] {
        const cornerCases = this.cornerCases()
        cornerCases.push(...this.sample(Math.max(0, size - cornerCases.length)))
        return cornerCases
    }

    shrink(initialValue: A): Arbitrary<A> | NoArbitrary {
        return new NoArbitrary()
    }
}

export class ArbitraryCollection<A> extends Arbitrary<A[]> {
    constructor(public arbitrary : Arbitrary<A>, public min = 0, public max = 10) {
        super()
    }
    
    pick(): A[] {
        const size = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
        return this.arbitrary.sample(size)
    }

    shrink(initialValue: A[]): Arbitrary<A[]> {
        if (this.min == initialValue.length) return new NoArbitrary()
        if (this.min > (this.min + initialValue.length) / 2) return new NoArbitrary()
        return new ArbitraryCollection(this.arbitrary, this.min, (this.min + initialValue.length) / 2)
    }
}

export class ArbitraryComposite<A> extends Arbitrary<A> {
    constructor(public arbitraries = []) {
        super()
    }    

    pick(): A {
        const picked = Math.floor(Math.random() * this.arbitraries.length)
        return this.arbitraries[picked].pick()
    }

    cornerCases(): A[] {
        const cornerCases = []
        for (const a of this.arbitraries)
            cornerCases.push(...a.cornerCases())
    
        return cornerCases
    }

    shrink<B>(initialValue: A): Arbitrary<B> {
        if (this.arbitraries.length == 1) return new NoArbitrary()
        if (this.arbitraries.length == 2) return this.arbitraries[0]
        return new ArbitraryComposite(this.arbitraries.slice(0, -1))
    }
}

export class ArbitraryString extends Arbitrary<string> {
    constructor(public min = 2, public max = 10, public chars = 'abcdefghijklmnopqrstuvwxyz') {
        super()
        this.min = min
        this.max = max
        this.chars = chars
    }

    pick(size = Math.floor(Math.random() * (Math.max(0, this.max - this.min) + 1)) + this.min) {
        let string = ''
        for (let i = 0; i < size; i++) string += this.chars.charAt(Math.floor(Math.random() * this.chars.length))
        return string
    }

    cornerCases() {
        return [this.pick(this.min), this.pick(this.max)]
    }

    shrink(initialValue: string): Arbitrary<string> | NoArbitrary {
        if (this.min > initialValue.length - 1) return new NoArbitrary()
        return new ArbitraryString(this.min, initialValue.length - 1, initialValue)
    }
}

export class ArbitraryBoolean extends Arbitrary<Boolean> {
    constructor() { super() }
    pick() { return Math.random() > 0.5 }
}

export class ArbitraryInteger extends Arbitrary<number> {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super()
        this.min = min
        this.max = max
    }

    pick() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min
    }

    cornerCases() {
        if (this.min < 0 && this.max > 0)
            return [0, this.min, this.max]
        else
            return [this.min, this.max]
    }

    shrink(initialValue: number): Arbitrary<number> | NoArbitrary {
        if (initialValue > 0) {            
            const lower = Math.max(0, this.min)
            const upper = Math.max(lower, initialValue - 1)
            const midpoint = Math.floor((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint), new ArbitraryInteger(midpoint, upper)])
        } else if(initialValue < 0) {
            const upper = Math.max(0, this.max)
            const lower = Math.max(upper, initialValue + 1)
            const midpoint = Math.ceil((upper + lower) / 2)

            if (lower == upper) return new NoArbitrary()

            return new ArbitraryComposite([new ArbitraryInteger(lower, midpoint), new ArbitraryInteger(midpoint, upper)])
        }
        return new NoArbitrary()
    }
}

export class ArbitraryReal extends ArbitraryInteger {
    constructor(public min = Number.MIN_SAFE_INTEGER, public max = Number.MAX_SAFE_INTEGER) {
        super(min, max)
    }

    pick() {
        return Math.random() * (this.max - this.min) + this.min
    }
}

class NoArbitrary extends Arbitrary<undefined> {
    sampleWithBias(_: number) { return [] }
    sample(_: number) { return [] }
}