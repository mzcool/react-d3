import axios from 'axios'
import { Feature, FeatureCollection } from 'geojson'
import * as topojson from 'topojson'

const esHost = 'http://localhost:6066/api/dev/proxy/es/zhuzhulovesyy'

export async function loadTimeseriesViews(apiKey: string) {
    const interval = '5m'
    return axios
        .post(`${esHost}/peer_5m_*`, {
            filter: {
                from: 'now-5h/h',
                apiKey: [apiKey],
                to: 'now'
            },
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

export async function loadDataUsage(apiKey: string) {
    const interval = '5m'
    return axios
        .post(`${esHost}/peer_5m_*`, {
            filter: {
                from: 'now-5h/h',
                to: 'now',
                apiKey: [apiKey]
            },
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
    return (
        axios
            // .post(`${esHost}/v2/dquery/peer_5m/${apiKey}`, {
            .post(`${esHost}/peer_session_*`, {
                filter: {
                    from: 'now-10h/h',
                    to: 'now',
                    apiKey: [apiKey]
                },
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
                            (v['cdn'].value || 0 + v['v2v'].value || 0) /
                            timeRange
                    }

                    return v
                })
                return x
            })
    )
}

export async function loadCountryStats(apiKey: string) {
    return axios
        .post(`${esHost}/peer_session_*`, {
            filter: {
                from: 'now-15h/h',
                to: 'now',
                apiKey: [apiKey]
            },
            aggs: {
                response: {
                    terms: {
                        field: 'countryISO',
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
                        },
                        chunkSize: {
                            percentiles: {
                                field: 'qoeChunkSize',
                                percents: [10, 20, 30, 40, 50, 60, 70, 80, 90]
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
                        total: v.v2v.value + v.cdn.value,
                        chunkSize: v.chunkSize.values
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
            v.properties = {
                ...v.properties,
                ...{ views: 0, cdn: 0, v2v: 0, chunkSize: {} }
            }
        }
        return v
    })

    return geo
}

export async function loadQoeMetricsBy(
    apiKey: string,
    col: string,
    metrics: string
) {
    const aggs = {
        rebuffering: {
            percentiles: {
                field: 'qoeRebufferingTime',
                percents: [10, 20, 30, 40, 50, 60, 70, 80, 90]
            }
        },
        startupDelay: {
            percentiles: {
                field: 'qoeStartupDelay',
                percents: [10, 20, 30, 40, 50, 60, 70, 80, 90]
            }
        },
        watchingTime: {
            percentiles: {
                field: 'qoeWatchingTime',
                percents: [10, 20, 30, 40, 50, 60, 70, 80, 90]
            }
        },
        chunkSize: {
            percentiles: {
                field: 'qoeChunkSize',
                percents: [10, 20, 30, 40, 50, 60, 70, 80, 90]
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
        filter: {
            from: 'now-15h/h',
            to: 'now',
            apiKey: [apiKey]
        },
        aggs: {
            response: {
                terms: {
                    field: col,
                    size: 63555
                },
                aggs: newAggs
            }
        }
    }

    return axios
        .post(`${esHost}/peer_session_*`, query)
        .then((x) => x.data['aggregations']['response'])
}
