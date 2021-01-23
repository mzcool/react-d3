import axios from 'axios'
import {
    loadContentStats,
    loadCountryStats,
    loadDataUsage,
    loadQoeMetricsBy,
    loadTimeseriesViews,
    parseInterval,
    unwrapTimeseries,
    worldGeoJsonWithStats
} from './queries'

describe('timeseries queries', () => {
    it('views timeseires', async () => {
        try {
            const r = await loadTimeseriesViews('snrt')
            expect(r['interval']).toBeDefined()
            expect(r['buckets']).toBeDefined()
            const unwrapped = unwrapTimeseries(r, ['views'])
            expect(unwrapped).toHaveLength(r['buckets'])
        } catch {}
    })

    it('data / bandwidth timeseries queries', async () => {
        const r = await loadDataUsage('snrt')
        expect(r['interval']).toBeDefined()
        expect(r['buckets']).toBeDefined()
        if (r['buckets'].length > 0) {
            expect(r['buckets'][0]['cdn']).toBeDefined()
            expect(r['buckets'][0]['v2v']).toBeDefined()
            expect(r['buckets'][0]['total']).toBeDefined()
            expect(r['buckets'][0]['cdnBandwidth']).toBeDefined()
            expect(r['buckets'][0]['v2vBandwidth']).toBeDefined()
            expect(r['buckets'][0]['totalBandwidth']).toBeDefined()
            unwrapTimeseries(r, ['total'])
        }
    })
})

describe('Parse interval function', () => {
    it('the intervals should return the seconds', () => {
        expect(parseInterval('1m')).toEqual(60)
        expect(parseInterval('1h')).toEqual(3600)
        expect(parseInterval('1d')).toEqual(3600 * 24)
        expect(parseInterval('1w')).toEqual(3600 * 24 * 7)
        expect(parseInterval('1M')).toEqual(3600 * 24 * 30)
        expect(parseInterval('1q')).toEqual(3600 * 24 * 90)
        expect(parseInterval('1y')).toEqual(3600 * 24 * 365)
    })
})

describe('Load views per', () => {
    it('Should return the values by content', async () => {
        const r = await loadContentStats('snrt', 2)
        expect(r['buckets']).toBeDefined()
        expect(r['buckets']).toHaveLength(2)
        const toVerify = ['v2v', 'cdn', 'total', 'avgBandwidth']
        toVerify.forEach((v) => {
            expect(r['buckets'][0][v]).toBeDefined()
            expect(r['buckets'][0][v]).toBeDefined()
            expect(r['buckets'][0][v]).toBeDefined()
        })
    })
})

describe('Load country stats', () => {
    it('should load geo json with all the stats', async () => {
        const r = await worldGeoJsonWithStats('snrt')
        for (var i = 0; i < 100; i++) {
            expect(r.features[i].properties).toHaveProperty('views')
            expect(r.features[i].properties).toHaveProperty('cdn')
            expect(r.features[i].properties).toHaveProperty('v2v')
        }
    })
})

describe('Load the breakdown', () => {
    it('should load the qoe rebufferingTime', async () => {
        const r = await loadQoeMetricsBy(
            'snrt',
            'content',
            'rebuffering,watchingTime'
        )
        expect(r['buckets']).toBeDefined()
        if (r['buckets'].length > 0) {
            expect(r['buckets'][0]['rebuffering']).toBeDefined()
            expect(r['buckets'][0]['watchingTime']).toBeDefined()
        }
    })
})

export {}
