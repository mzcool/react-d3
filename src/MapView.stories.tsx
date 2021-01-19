import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { ChartConfig } from './options'
import { Story, Meta } from '@storybook/react/types-6-0'
import * as topojson from 'topojson'
import * as L from 'leaflet'
import { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import './react-leaflet-fix.css'
import { worldGeoJsonWithStats } from './queries'
import { fileSize } from 'humanize-plus'
// const L = require('leaflet')

interface MapViewProps {
    chartConfig?: ChartConfig
    tileServer: number
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
const MapView: React.FC<MapViewProps> = ({ chartConfig, tileServer }) => {
    const config = chartConfig ?? new ChartConfig()
    const ref = useRef<any>()

    const drawSvgLayer = (
        svgElement: d3.Selection<any, any, any, any>,
        geoj: FeatureCollection,
        pathGen: d3.GeoPath<any, d3.GeoPermissibleObjects>,
        map: L.Map
    ) => {
        const g = svgElement.select('g.map')

        const valueAccessor = (n: string) => {
            return (d: any) => d.properties[n]
        }

        const maxValue = d3.max(geoj.features.map(valueAccessor('views')))
        const interpolator = d3.interpolateBlues
        g.selectAll('path')
            .data(geoj.features)
            .join('path')
            .attr('d', pathGen)
            .attr('class', 'leaflet-interactive')
            .attr('fill', (v) =>
                interpolator(valueAccessor('views')(v) / maxValue)
            )
            .attr('stroke-width', 1)
            .attr('stroke', 'steelblue')
            .attr('opacity', '0.5')
            .on('mouseleave', (e, feat) => {
                const container = d3
                    .select(ref.current)
                    .select('.tooltip-container')
                    .style('display', 'none')

                // const p = map.latLngToContainerPoint(
                //     d3.geoCentroid(feat).reverse() as any
                // )
                // console.info('goto', p)
            })
            .on('mouseenter', (e, feat) => {
                const p = map.latLngToContainerPoint(
                    d3.geoCentroid(feat).reverse() as any
                )
                const container = d3
                    .select(ref.current)
                    .select('.tooltip-container')
                    .style('display', null)

                container
                    .transition()
                    .duration(100)
                    .style('width', '100px')
                    .style('z-index', '1111')
                    .style('left', p.x + 'px')
                    .style('top', p.y + 'px')
                // set the title
                container
                    .select('.tooltip-header')
                    .text(valueAccessor('name')(feat))
                container
                    .select('.tooltip-content')
                    .html(
                        `Views: ${valueAccessor('views')(
                            feat
                        )}<br/> Data: ${fileSize(
                            valueAccessor('total')(feat) || 0
                        )}`
                    )
            })

        const otherLayer = svgElement.select('g.quality').attr('opacity', 0.5)

        const pie = d3.pie()
        const arcs = pie([100, 43, 100])

        // Generate two fake points
        // Map it according to the current scale
        const p1 = map.project([0, 1], map.getZoom())
        const p2 = map.project([0, 3], map.getZoom())

        // calculate the distance in terms of map pixels
        const length = Math.abs(p1.x - p2.x)

        const colorInterpolate = d3.interpolateRgb('red', 'green')
        const toTrans = map.latLngToLayerPoint(new L.LatLng(10, 10))
        otherLayer
            .selectAll('path')
            .data(arcs)
            .join('path')
            .attr(
                'd',
                d3
                    .arc()
                    .innerRadius(length / 3)
                    .outerRadius(length) as any
            )
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('fill', (_, i) => {
                return colorInterpolate(i / 2)
            })
            .attr('transform', `translate(${toTrans.x}, ${toTrans.y})`)
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
        svgElement.append('g').attr('class', 'map')
        svgElement.append('g').attr('class', 'quality')
        const transform = d3.geoTransform({
            point: function (x, y) {
                var point: any = map.latLngToLayerPoint(new L.LatLng(y, x))
                this.stream.point(point.x, point.y)
            }
        })
        var path = d3.geoPath().projection(transform)

        worldGeoJsonWithStats('snrt').then((r) => {
            drawSvgLayer(svgElement, r, path, map)
            map.on('zoom', () => {
                drawSvgLayer(svgElement, r, path, map)
            })
        })

        // d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(
        //     (us: TopoJSON.Topology) => {
        //         drawSvgLayer(svgElement, us, path, map)
        //         // This needs to be set up after we have the data ready
        //         map.on('zoom', () => {
        //             drawSvgLayer(svgElement, us, path, map)
        //         })
        //     }
        // )

        // const arcs = pie([{}])
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
                <div className='tooltip-header'>Tooltip</div>
                <div className='tooltip-content'>The content here</div>
            </div>
            {/*<svg
                ref={ref}
                height={config.svgHeight}
                width={config.svgWidth}
                viewBox={`0 0 ${config.svgWidth} ${config.svgHeight}`}
            >
                <g></g>
            </svg> */}
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
    tileServer: 0
}
