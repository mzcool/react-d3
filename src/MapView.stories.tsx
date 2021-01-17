import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { ChartConfig } from './options'
import { Story, Meta } from '@storybook/react/types-6-0'
import * as topojson from 'topojson'
import * as L from 'leaflet'
import { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import './react-leaflet-fix.css'
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
    const setupMap = () => {
        const svgElement = d3.select(ref.current)
        const g = svgElement.select('g')

        // Equirectangular simply maps longitidue and latitude to the flat surface
        // path is actually a path generator which takes the features
        // and create the geometrics as pathes
        const path = d3.geoPath(
            d3
                .geoEquirectangular()
                // .geoMercator()
                .translate([config.svgWidth / 2, config.svgHeight / 2])
                .scale(config.svgWidth / 2 / Math.PI)
        )

        // we load te data here.. hmm. seems like we don't need a store to display something,
        // isn't it nice?
        // i mean we only need to store the time range and stuff
        // not neccessarily the volatile data.
        d3.json('http://178.62.232.185/topo/s10/gadm36_FIN_0.json').then(
            (r: TopoJSON.Topology) => {
                // okay, that's a very nice part of the code
                // topojson library can help me simplifiy the map!
                // without losing the topology and without gaps
                let n = topojson.simplify(topojson.presimplify(r as any), 8)

                // topojson -> geojson
                const geoj = topojson.feature(
                    n,
                    n.objects['gadm36_FIN_0']
                ) as FeatureCollection

                // generate the path for real this time
                g.selectAll('path')
                    .data(
                        geoj.features.filter(
                            (x) => (x.properties as any).name != 'Antarctica'
                        )
                    )
                    .join('path')
                    .attr('d', path)
                    .attr('fill', 'lightsteelblue')
                // do not use stroke, this will cause performance issue

                // this is for detecting whether it's a scale event in 'on zoom' handler
                let scale = -1
                svgElement.call(
                    d3
                        .zoom()
                        .extent([
                            [0, 0],
                            [config.svgWidth, config.svgHeight]
                        ])
                        .scaleExtent([1, 8])
                        .on('zoom', (x) => {
                            // We only change the simplification level when the scale changes
                            if (x.transform.k != scale) {
                                scale = x.transform.k
                                n = topojson.simplify(
                                    topojson.presimplify(r as any),
                                    8 - Math.round(x.transform.k)
                                )
                                const geoj = topojson.feature(
                                    n,
                                    n.objects['gadm36_FIN_0']
                                ) as FeatureCollection
                                g.selectAll('path')
                                    .data(
                                        geoj.features.filter(
                                            (x) =>
                                                (x.properties as any).name !=
                                                'Antarctica'
                                        )
                                    )
                                    .join('path')
                                    .attr('d', path)
                                    .attr('fill', 'lightsteelblue')
                            }

                            g.attr('transform', x.transform)
                        })
                )
            }
        )
    }

    const drawSvgLayer = (
        svgElement: d3.Selection<any, any, any, any>,
        topoData: TopoJSON.Topology,
        pathGen: d3.GeoPath<any, d3.GeoPermissibleObjects>,
        map: L.Map
    ) => {
        const geoj = topojson.feature(
            topoData,
            topoData.objects.states
        ) as FeatureCollection

        const g = svgElement.select('g.map')

        g.selectAll('path')
            .data(geoj.features)
            .join('path')
            .attr('d', pathGen)
            .attr('fill', 'lightsteelblue')
            .attr('stroke-width', 1)
            .attr('stroke', 'steelblue')
            .attr('opacity', '0.5')

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

        d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json').then(
            (us: TopoJSON.Topology) => {
                drawSvgLayer(svgElement, us, path, map)
                // This needs to be set up after we have the data ready
                map.on('zoom', () => {
                    drawSvgLayer(svgElement, us, path, map)
                })
            }
        )

        // const arcs = pie([{}])
    }, [])

    return (
        <div
            id='map'
            style={{
                height: 500,
                width: '100%'
            }}
        >
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
    chartConfig: {
        svgHeight: 300,
        svgWidth: 716
    },
    tileServer: 0
}
