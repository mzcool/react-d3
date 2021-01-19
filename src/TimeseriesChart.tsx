import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { ChartConfig } from './options'

import './tooltip.css'
export interface TimeseriesChartProps {
    // tooltip settings
    // markers
    // data types settings
    data?: any[]
    aes: {
        x: string
        ySeries: { y: string; name: string }[]
        yMin?: number
        tooltipHeader: string
        tooltipFormater: (s: any, datum: any) => string
    }
    chartConfig?: ChartConfig
}

const functorKeyScale = (v: string, scale: any) => {
    return (d: any) => {
        return scale(d[v])
    }
}

const getOrCreate = (
    c: d3.Selection<d3.BaseType, any, any, any>,
    className: string,
    element: string
) => {
    let s = c.select('.' + className)
    // console.info(s['_groups'][0][0])
    if (s.empty()) {
        c.append(element).attr('class', className)
        s = c.select(element + '.' + className)
    }
    return s
}

const TimeseriesChart: React.FC<TimeseriesChartProps> = ({
    data,
    aes,
    chartConfig
}) => {
    if (!data) {
        return <div>No Data</div>
    }
    const config = chartConfig ?? new ChartConfig()
    config.paddings.bottom = 18.5
    const { height, width } = config

    const ref = useRef<any>()
    useEffect(() => {
        const container = d3.select(ref.current)
        const svg = container.select('svg')

        const containers = aes.ySeries.map((_, i) =>
            getOrCreate(svg, `line-${i}`, 'g')
        )

        const dotsContainer = container.select('.dots-container')
        // const textContainer = container.select('.text-container')
        const tooltipContainer = container.select('.tooltip-container')
        const xaxis = svg.select('.lineplot-xaxis')
        const vline = svg.selectAll('.vline')
        const yExtend = config.yExtend()
        const dateBisector = d3.bisector((v: any) => v[aes.x])
        const curveType = d3.curveBasis

        // the x axis is
        const x = d3
            .scaleTime()
            .domain(d3.extent(data.map((v) => v[aes.x])) as any)
            .range(config.xExtend())

        // const brush = d3.brushX()

        xaxis
            .attr('transform', `translate(0, ${config.yExtend()[1]})`)
            .call(d3.axisBottom(x) as any)

        const yDomain = aes.ySeries
            .map((s) => data.map((v) => v[s.y]))
            .reduce((x, y) => [...x, ...y])

        // take the yMin or not take
        if (aes.yMin) {
            yDomain.push(aes.yMin)
        }
        const yMinMax = d3.extent(yDomain)

        const y = d3
            .scaleLinear()
            .domain(yMinMax as any)
            .range(config.yExtend().reverse())

        // initiate the verticle line
        vline
            .selectAll('line')
            .data([{ x: 0 }])
            .join('line')
            .attr('x1', (d) => d.x)
            .attr('x2', (d) => d.x)
            .attr('y1', yExtend[0])
            .attr('y2', yExtend[1])
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,4')

        // create the verticle line
        svg.on('mousemove click touchmove', (d) => {
            let xvalue = d.offsetX
            xvalue = x.invert(xvalue)
            // the verticle line
            vline
                .selectAll('line')
                .data([{ x: d.offsetX }])
                .join('line')
                .attr('transform', `translate(${d.offsetX}, 0)`)

            let idx = dateBisector.right(data, xvalue)

            const left = Math.round(x(xvalue)) + 'px'

            tooltipContainer.style('left', left).style('display', null)
            tooltipContainer
                .select('.tooltip-content')
                .html(
                    aes.ySeries
                        .map((s) => aes.tooltipFormater(s, data[idx]))
                        .reduce((a, b) => a + b)
                )

            // the text container to show the tool tip
            // textContainer
            //     .selectAll('text')
            //     .data([
            //         {
            //             msg: `${(xvalue as Date).toLocaleString()}: \n
            //             ${aes.ySeries[0].name} ${
            //                 data[idx] ? data[idx][aes.ySeries[0].y] : ''
            //             }`
            //         }
            //     ])
            //     .join('text')
            //     .attr('x', 10)
            //     .attr('y', 20)
            //     .attr('style', 'font-size: 10px; font-family: Monaco')
            //     .text((x) => x.msg)
        })

        svg.on('mouseleave', (d) => {
            tooltipContainer.style('display', 'none')
        })

        // drop all the lines
        containers.forEach((c, id) => {
            // Create the line
            c.selectAll('path')
                // we use this instead of datum because datum cannot calculate leave
                .data([data])
                .join('path')
                .attr('fill', 'none')
                .attr('stroke', '#A6B1E1')
                .attr('stroke-width', 3)
                .attr(
                    'd',
                    d3
                        .line()
                        .curve(curveType)
                        .x(functorKeyScale(aes.x, x))
                        .y(functorKeyScale(aes.ySeries[id].y, y))
                )

            const p = getOrCreate(c, 'patharea', 'path')
            p.datum(data)
                .attr('fill', '#A6B1E1')
                .attr('opacity', '0.5')
                .attr(
                    'd',
                    d3
                        .area()
                        .x(functorKeyScale(aes.x, x))
                        .curve(curveType)
                        .y0(y(yMinMax[0]))
                        .y1(functorKeyScale(aes.ySeries[id].y, y))
                )
        })

        // lineContainer.call(
        //     brush.extent([
        //         [0, 0],
        //         [config.width, config.height]
        //     ]) as any
        // )

        if (false) {
            dotsContainer
                .selectAll('circle')
                .data(data as any)
                .join('circle')
                // options
                .attr('fill', '#424874')
                .attr('stroke', 'none')
                .attr('cx', functorKeyScale(aes.x, x))
                .attr('cy', functorKeyScale(aes.ySeries[0].y, y))
                // Option
                .attr('r', 2)
        }
    }, [data])
    return (
        <div style={{ height, width }} ref={ref}>
            <div className='tooltip-container' style={{ display: 'none' }}>
                <div className='tooltip-header'>Tooltip</div>
                <div className='tooltip-content'>The content here</div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`}>
                {/* <g className='line-y1'></g> */}
                <g className='lineplot-xaxis'></g>
                <g className='vline'></g>
                <g className='dots-container'></g>
                <g className='text-container'></g>
            </svg>
        </div>
    )
}

export default TimeseriesChart
