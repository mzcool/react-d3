import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { ChartConfig } from './options'
import { Story, Meta } from '@storybook/react/types-6-0'
import * as topojson from 'topojson'
import { FeatureCollection } from 'geojson'

interface MapViewProps {
    chartConfig?: ChartConfig
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
const MapView: React.FC<MapViewProps> = ({ chartConfig }) => {
    const config = chartConfig ?? new ChartConfig()
    const ref = useRef<any>()
    useEffect(() => {
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
    }, [])
    return (
        <>
            <div>Map view</div>
            <svg
                ref={ref}
                height={config.svgHeight}
                width={config.svgWidth}
                viewBox={`0 0 ${config.svgWidth} ${config.svgHeight}`}
            >
                <g></g>
            </svg>
        </>
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
    }
}
