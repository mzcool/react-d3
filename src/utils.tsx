import * as d3 from 'd3'

export function getOrCreate(
    c: d3.Selection<d3.BaseType, any, any, any>,
    className: string,
    element: string
) {
    let s = c.select('.' + className)
    // console.info(s['_groups'][0][0])
    if (s.empty()) {
        c.append(element).attr('class', className)
        s = c.select(element + '.' + className)
    }
    return s
}

export const EstimateDistribution = (
    thresholds: number[],
    deciles: number[]
): number[] => {
    if (deciles.length != 9) {
        return thresholds.map((_) => 0)
    }

    return thresholds.map((v) => (d3.bisectCenter(deciles.sort(), v) + 1) * 10)
}

export const EstimationToConfiguration = (estimation: number[]) => {
    estimation.unshift(0)
    estimation.push(100)
    const result = []

    for (let i = 0; i < estimation.length - 1; i++) {
        result.push({
            fromPercent: estimation[i],
            toPercent: estimation[i + 1]
        })
    }
    return result
}
