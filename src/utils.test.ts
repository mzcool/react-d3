import * as d3 from 'd3'
import { EstimateDistribution } from './utils'

describe('Test utils', () => {
    it('should return approximate percents', () => {
        const result = EstimateDistribution(
            [100, 400, 500, 50, 600],
            [10, 100, 200, 400, 500, 600, 700, 800, 900]
        )

        console.info(result)

        const result2 = EstimateDistribution(
            [100, 400, 500, 10000],
            [10, 100, 200, 400, 500, 600, 700, 800, 900]
        )
        console.info(result2)
    })
})
