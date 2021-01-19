import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './barchart.css'
import { ChartConfig } from './options'

export interface BarchartProps {
    data: { x: string; y: number }[]
    barPadding: number
    chartConfig?: ChartConfig
}

const Barchart: React.FC<BarchartProps> = ({
    data,
    barPadding,
    chartConfig
}) => {
    const config = chartConfig ?? new ChartConfig()
    console.info(config.yExtend())

    const { height, width } = config
    const ref = useRef<any>()

    useEffect(() => {
        // load the reference to the containers
        const svgElement = d3.select(ref.current).select('svg')
        const tooltip = d3.select(ref.current).select('.tooltip')
        const bars = svgElement.select('.bars')
        const xlabels = svgElement.select('.xlabels')

        // the common accesors
        const xAccessor = (d: any) => x(d['x']) as any
        const yAccessor = (d: any) => y(d['y']) as any

        // create x scale
        // scaleBand is for the band like vis, e.g. The bar chart
        // set the range to domain
        // range = []
        const x = d3
            .scaleBand()
            // the range is from left padding to the x of right padding
            .range(config.xExtend())
            // domain is of course the list of the keywords
            .domain(data.map((x) => x['x']))
            // padding is to create nice looking white spaces
            .padding(barPadding)

        // create y scale
        const y = d3
            // the most common type of scale
            .scaleLinear()
            // it's better to take the inverse for easier calculation
            .domain([0, d3.max(data.map((y) => y.y)) || 0])
            .range(config.yExtend().reverse())

        xlabels
            .attr('transform', `translate(0, ${height - 20} )`)
            .call(d3.axisBottom(x) as any)
            .call((g) => g.selectAll('.domain').remove())
            .call((g) => g.selectAll('line').remove())
            .call((g) => g.selectAll('text').attr('class', 'barchart-xlabels'))

        bars.selectAll('rect')
            .data(data)
            .join('rect')
            .attr('x', xAccessor)
            .attr('class', 'barchart-bar')
            .attr('rx', 3)
            .attr('ry', 3)
            .attr('height', (d: any) => 0)
            .attr('width', x.bandwidth())
            .attr('y', height - 20)
            .call((enter) =>
                enter
                    .transition()
                    .duration(200)
                    .attr('y', yAccessor)
                    .attr(
                        'height',
                        (d: any) => (height - 20 - y(d['y'])) as any
                    )
            )

            .on('mouseover', (d, datum) => {
                tooltip
                    .html(datum.x + '<br/>views: ' + datum.y)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .style('left', d.offsetX + 'px')
                    .style('top', d.offsetY - 10 + 'px')
            })
            .on('mouseleave', (d) => {
                tooltip.transition().duration(200).style('opacity', 0)
            })
    }, [data, barPadding])

    return (
        <div ref={ref} style={{ display: 'inline-block' }}>
            <div className='tooltip'>Yes</div>
            <svg style={{ width, height }} viewBox={`0 0 ${width} ${height}`}>
                <g className='bars'></g>
                <g className='xlabels'></g>
            </svg>
        </div>
    )
}

export default Barchart
