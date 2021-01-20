import axios from 'axios'
import { Feature, FeatureCollection } from 'geojson'
import * as topojson from 'topojson'

const esHost = 'http://localhost:5000'

export async function loadTimeseriesViews() {
    const interval = '5m'
    return axios
        .post(`${esHost}/v2/dquery/peer_5m/snrt`, {
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            range: {
                                // timestamp: {
                                //     gte: '2021-01-11',
                                //     lte: '2021-01-13'
                                // }
                                timestamp: {
                                    gte: 'now-3h/h',
                                    lt: 'now'
                                }
                            }
                        }
                    ]
                }
            },
            size: 1,
            aggs: {
                response: {
                    date_histogram: {
                        field: 'timestamp',
                        fixed_interval: interval
                    },
                    // auto_date_histogram: {
                    //     field: 'timestamp',
                    //     buckets: 200
                    // },
                    aggs: {
                        views: {
                            cardinality: {
                                field: 'pid'
                            }
                        }
                    }
                }
            }
        })
        .then((x) => x.data['aggregations']['response'])
        .then((v) => {
            v['interval'] = interval
            return v
        })
}

export async function loadDataUsage() {
    const interval = '5m'
    return axios
        .post(`${esHost}/v2/dquery/peer_5m/snrt`, {
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: 'now-3h/h',
                                    lt: 'now'
                                }
                            }
                        }
                    ]
                }
            },
            size: 1,
            aggs: {
                response: {
                    date_histogram: {
                        field: 'timestamp',
                        fixed_interval: interval
                    },
                    aggs: {
                        v2v: {
                            sum: {
                                field: 'dataV2V'
                            }
                        },
                        cdn: {
                            sum: {
                                field: 'dataCDN'
                            }
                        }
                    }
                }
            }
        })
        .then((x) => x.data['aggregations']['response'])
        .then((v) => {
            const seconds = parseInterval(interval)
            v['interval'] = interval
            v['buckets'] = v['buckets'].map((v: any) => {
                Object.assign(v, {
                    total: { value: v['v2v'].value || 0 + v['cdn'].value || 0 },
                    totalBandwidth: {
                        value:
                            ((v['v2v'].value || 0) + (v['cdn'].value || 0)) /
                            seconds
                    },
                    v2vBandwidth: { value: v['v2v'].value / seconds },
                    cdnBandwidth: { value: v['cdn'].value / seconds }
                })
                return v
            })
            return v
        })
}

const unitSecondMap = {
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
    M: 60 * 60 * 24 * 30,
    q: 60 * 60 * 24 * 90,
    y: 60 * 60 * 24 * 365
}

export function parseInterval(interval: string): number {
    const unit = interval.slice(-1)
    if (unitSecondMap[unit]) {
        return parseInt(interval.slice(0, -1)) * unitSecondMap[unit]
    }
    return 1
}

interface TimeseriesData {
    date: Date
    [id: string]: number | Date
}

// Turn the timeseries into a great format for plotting the timeseries with d3
export function unwrapTimeseries(
    tsFromEs: any,
    cols: string[]
): TimeseriesData[] {
    return tsFromEs['buckets'].map((v: any) => {
        const obj = {
            date: new Date(v['key'])
        }

        cols.forEach((c) => {
            obj[c] = v[c]['value']
        })
        return obj
    })
}

// LoadContentStats will be the data for the content table anyway
export async function loadContentStats(apiKey: string, topN: number) {
    const timeRange = 3 * 3600
    return axios
        .post(`${esHost}/v2/dquery/peer_5m/${apiKey}`, {
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            range: {
                                timestamp: {
                                    gte: 'now-3h/h',
                                    lt: 'now'
                                }
                            }
                        }
                    ]
                }
            },
            size: 0,
            aggs: {
                response: {
                    terms: {
                        field: 'content',
                        size: topN
                    },
                    aggs: {
                        views: {
                            cardinality: {
                                field: 'pid'
                            }
                        },
                        cdn: {
                            sum: {
                                field: 'dataCDN'
                            }
                        },
                        v2v: {
                            sum: {
                                field: 'dataV2V'
                            }
                        }
                    }
                }
            }
        })
        .then((x) => x.data['aggregations']['response'])
        .then((x) => {
            x['buckets'].map((v: any) => {
                v['total'] = {
                    value: v['cdn'].value || 0 + v['v2v'].value || 0
                }
                v['avgBandwidth'] = {
                    value:
                        (v['cdn'].value || 0 + v['v2v'].value || 0) / timeRange
                }

                return v
            })
            return x
        })
}

export async function loadCountryStats(apiKey: string) {
    return axios
        .post(`${esHost}/v2/dquery/peer_entire/${apiKey}`, {
            query: {
                bool: {
                    must: [],
                    filter: [
                        {
                            range: {
                                startedAt: {
                                    gte: 'now-5h/h',
                                    lt: 'now'
                                }
                            }
                        }
                    ]
                }
            },
            size: 0,
            aggs: {
                response: {
                    terms: {
                        field: 'countryISO.keyword',
                        size: 65535
                    },
                    aggs: {
                        views: {
                            cardinality: {
                                field: 'pid'
                            }
                        },
                        cdn: {
                            sum: {
                                field: 'dataCDN'
                            }
                        },
                        v2v: {
                            sum: {
                                field: 'dataV2V'
                            }
                        }
                    }
                }
            }
        })
        .then((r) => {
            return Object.fromEntries(
                r.data['aggregations']['response']['buckets'].map((v: any) => [
                    v.key,
                    {
                        v2v: v.v2v.value,
                        cdn: v.cdn.value,
                        views: v.views.value,
                        total: v.v2v.value + v.cdn.value
                    }
                ])
            )
        })
}

export async function worldGeoJsonWithStats(apiKey: string) {
    const c = await axios.get(
        'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json'
    )
    const stats = await loadCountryStats(apiKey)
    const topo = c.data

    const geo: FeatureCollection = topojson.feature(
        topo,
        topo.objects['countries1']
    ) as any

    geo.features.map((v) => {
        const matched = stats[v.properties ? v.properties['Alpha-2'] : 'x']
        if (matched) {
            v.properties = { ...v.properties, ...matched }
        } else {
            v.properties = { ...v.properties, ...{ views: 0, cdn: 0, v2v: 0 } }
        }
        return v
    })

    return geo
}

export async function loadQoeMetricsBy(apiKey: string, metrics: string) {
    const aggs = {
        rebuffering: {
            percentiles: {
                field: 'qoeRebufferingTime'
            }
        },
        startupDelay: {
            percentiles: {
                field: 'qoeStartupDelay'
            }
        },
        watchingTime: {
            percentiles: {
                field: 'qoeWatchingTime'
            }
        },
        chunkSize: {
            percentiles: {
                field: 'qoeChunkSize.50'
            }
        }
    }
    const wantMetrics = metrics.split(',')

    const newAggs = Object.keys(aggs)
        .filter((k) => wantMetrics.includes(k))
        .reduce((obj, key) => {
            obj[key] = aggs[key]
            return obj
        }, {})

    const query = {
        query: {
            bool: {
                must: [],
                filter: [
                    {
                        term: { apiKey: 'snrt' }
                    },
                    {
                        range: {
                            startedAt: {
                                gte: 'now-1h/h'
                            }
                        }
                    }
                ]
            }
        },
        size: 0,
        aggs: {
            response: {
                terms: {
                    field: 'content.keyword',
                    size: 10
                },
                aggs: newAggs
            }
        }
    }

    return axios
        .post(`${esHost}/v2/dquery/peer_entire/${apiKey}`, query)
        .then((x) => x.data['aggregations']['response'])
}
