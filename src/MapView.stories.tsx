import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { ChartConfig } from './options'
import { Story, Meta } from '@storybook/react/types-6-0'
import * as L from 'leaflet'
import { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import './map-view.css'
import { worldGeoJsonWithStats } from './queries'
import { fileSize } from 'humanize-plus'
import {
    EstimateDistribution,
    EstimationToConfiguration,
    getOrCreate
} from './utils'
import { QualityPercent } from './BreakdownPercent'
// const L = require('leaflet')

interface MapAes {
    tileLayer: {
        color: string
        tooltipCol: {
            formatter: (x: any) => any
            col: string
            title: string
        }[]
    }
    qualityMap: { colors: string[]; lowerBounds: number[]; decile: string }
}

interface MapViewProps {
    chartConfig?: ChartConfig
    tileServer: number
    aes: MapAes
}
export const plotPie = (
    parent: d3.Selection<d3.BaseType, any, any, any>,
    radius: number,
    configuration: QualityPercent[],
    innerRadius = 3
) => {
    const pie = d3.pie().value((d) => d['percent'])
    const arcs = pie(configuration as any)
    parent
        .append('g')
        .attr('transform', `translate(${radius}, ${radius})`)
        .selectAll('path')
        .data(arcs)
        .join('path')
        .attr('d', d3.arc().innerRadius(innerRadius).outerRadius(radius) as any)
        .attr('fill', (d) => (d.data as any)['color'])
}
// needed components:
// a world map topojson
// when clicking on each country, the topojson of that country

// implementation of quality map:
// the quality map is done per geo centroid or per region_iso_code
// if we do it with geo centroid, we don't need to have to map to the svgs
// if we do it per region_iso_code, then we have to join with the actual value

// and as we use the elasticsearch it provides very good aggregation of the centroid
// so i think i will do it like Kibana without inventing another thing

// @deprecated
const MapView: React.FC<MapViewProps> = ({ chartConfig, tileServer, aes }) => {
    const config = chartConfig ?? new ChartConfig()
    const ref = useRef<any>()

    const drawTileLayer = (
        svgElement: d3.Selection<any, any, any, any>,
        geoj: FeatureCollection,
        pathGen: d3.GeoPath<any, d3.GeoPermissibleObjects>,
        map: L.Map,
        aes: MapAes
    ) => {
        const g = getOrCreate(svgElement, 'map', 'g')
        const { color } = aes.tileLayer
        const qualityLayerG = getOrCreate(svgElement, 'quality', 'g')

        const valueAccessor = (n: string) => {
            return (d: any) => d.properties[n]
        }

        const maxValue = d3.max(geoj.features.map(valueAccessor(color)))
        const interpolator = d3.interpolateBlues

        const getConfigFromProperties = (p: any) => {
            const values = Object.values(p['chunkSize'])
            const config = EstimationToConfiguration(
                EstimateDistribution(
                    aes.qualityMap.lowerBounds,
                    values.sort() as any
                )
            ).map((v, i) => {
                return {
                    ...v,
                    color: aes.qualityMap.colors[i],
                    percent: v.toPercent - v.fromPercent,
                    key: `${i}`
                }
            })
            return config
        }

        // Maps the configuration of piechart to features
        // geoj.features = geoj.features.map((v: any) => {
        //     const values = Object.values(v['properties']['chunkSize'])
        //     const config = EstimationToConfiguration(
        //         EstimateDistribution(aes.qualityMap.lowerBounds, values as any)
        //     ).map((v, i) => {
        //         return {
        //             ...v,
        //             color: aes.qualityMap.colors[i],
        //             percent: v.toPercent - v.fromPercent
        //         }
        //     })
        //     return { ...v, config }
        // })

        g.selectAll('path.tiles')
            .data(geoj.features)
            .join('path')
            .attr('d', pathGen)
            .attr('class', 'tiles leaflet-interactive')
            .attr('fill', (v) =>
                interpolator(valueAccessor(color)(v) / maxValue)
            )
            .attr('stroke-width', 1)
            .attr('stroke', 'steelblue')
            .attr('opacity', '0.5')
            .on('mouseleave', () => {
                d3.select(ref.current)
                    .select('.tooltip-container')
                    .style('display', 'none')
            })
            .on('mouseenter', (_, feat) => {
                const p = map.latLngToContainerPoint(
                    d3.geoCentroid(feat).reverse() as any
                )

                const pieChartConfig = getConfigFromProperties(feat.properties)
                console.info(pieChartConfig, feat.properties)

                const container = d3
                    .select(ref.current)
                    .select('.tooltip-container')
                    .style('display', null)

                container
                    .transition()
                    .duration(100)
                    .style('width', '110px')
                    .style('z-index', '1111')
                    .style('left', p.x + 'px')
                    .style('top', p.y + 'px')
                // set the title
                container
                    .select('.tooltip-header')
                    .text(valueAccessor('name')(feat))

                const contentContainer = container.select('.tooltip-content')

                getOrCreate(contentContainer, 'text-tooltip', 'div').html(
                    aes.tileLayer.tooltipCol
                        .map(
                            (v) =>
                                `${v.title}: ${v.formatter(
                                    valueAccessor(v.col)(feat)
                                )}`
                        )
                        .reduce((a, b) => a + '<br/>' + b)
                )

                const piechartContainer = getOrCreate(
                    contentContainer,
                    'piechart-tooltip',
                    'svg'
                )
                    .attr('height', 20)
                    .attr('width', 20)
                    .attr('viewbox', '0 0 20 20')

                plotPie(piechartContainer, 10, pieChartConfig)
            })

        const getLayerXY = (f: any) => {
            const p = map.latLngToLayerPoint(d3.geoCentroid(f).reverse() as any)
            return p
        }

        const { qualityMap } = aes

        qualityLayerG
            .selectAll('circle.dots')
            .data(geoj.features)
            .join('circle')
            .attr('class', 'dots')
            .attr('cx', (f) => {
                return getLayerXY(f).x
            })
            .attr('cy', (f) => {
                return getLayerXY(f).y
            })
            .attr('r', () => {
                const p1 = map.project([0, 1], map.getZoom())
                const p2 = map.project([0, 1.5], map.getZoom())
                const length = Math.abs(p1.x - p2.x)
                return length
            })
            .attr('fill', (f) => {
                const v = valueAccessor('chunkSize')(f)[qualityMap.decile]

                return v
                    ? qualityMap.colors[
                          d3.bisectLeft(qualityMap.lowerBounds, v)
                      ]
                    : 'none'
            })
    }

    useEffect(() => {
        const parisCenter = [10, 10]
        const initialZoom = 5

        const map = L.map('map').setView(parisCenter as any, initialZoom)

        const servers = [
            'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
            'http://b.tile.stamen.com/toner/{z}/{x}/{y}.png',
            'http://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
        ]
        const mapUrl = servers[tileServer]
        L.tileLayer(mapUrl, {
            maxZoom: 18
        }).addTo(map)

        L.svg().addTo(map)

        const svgElement = d3.select('#map').select('svg')
        const transform = d3.geoTransform({
            point: function (x, y) {
                var point: any = map.latLngToLayerPoint(new L.LatLng(y, x))
                this.stream.point(point.x, point.y)
            }
        })
        var path = d3.geoPath().projection(transform)

        worldGeoJsonWithStats('snrt').then((r) => {
            drawTileLayer(svgElement, r, path, map, aes)
            map.on('zoom', () => {
                drawTileLayer(svgElement, r, path, map, aes)
            })
        })
    }, [])

    return (
        <div
            id='map'
            style={{
                height: 500,
                width: '100%'
            }}
            ref={ref}
        >
            <div className='tooltip-container'>
                <div className='tooltip-header'></div>
                <div className='tooltip-content'></div>
            </div>
        </div>
    )
}

export default {
    title: 'Visualization/MapView',
    component: MapView
} as Meta

const Template: Story<MapViewProps> = (args) => <MapView {...args}></MapView>
export const Basic = Template.bind({})
Basic.args = {
    chartConfig: new ChartConfig().setSize(716, 300),
    tileServer: 0,
    aes: {
        qualityMap: {
            colors: ['#C13D59', '#F8D119', '#08C388'],
            lowerBounds: [568309, 900000],
            decile: '50.0'
        },
        tileLayer: {
            color: 'views',
            tooltipCol: [
                {
                    formatter: (x: any) => x,
                    col: 'views',
                    title: 'Views'
                },
                {
                    formatter: (x: any) => fileSize(x || 0),
                    col: 'total',
                    title: 'Data'
                }
            ]
        }
    }
}
