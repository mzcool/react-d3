import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { ChartConfig } from './options'
import { axisLeft } from 'd3'
export interface TimeseriesChartProps {
    // tooltip settings
    // markers
    // data types settings
    data: any[]
    aes: { x: string; y: string }
    chartConfig?: ChartConfig
}

const functorKeyScale = (v: string, scale: any) => {
    return (d: any) => {
        return scale(d[v])
    }
}

const TimeseriesChart: React.FC<TimeseriesChartProps> = ({
    data,
    aes,
    chartConfig
}) => {
    const config = chartConfig ?? new ChartConfig()
    config.paddings.bottom = 18.5
    const ref = useRef<any>()
    useEffect(() => {
        const container = d3.select(ref.current)
        const svg = container.select('svg')
        const lineContainer = container.select('.line')
        const dotsContainer = container.select('.dots-container')
        const textContainer = container.select('.text-container')
        const xaxis = svg.select('.lineplot-xaxis')
        const vline = svg.selectAll('.vline')
        const yExtend = config.yExtend()
        const dateBisector = d3.bisector((v: any) => v[aes.x])
        const x = d3
            .scaleTime()
            .domain(d3.extent(data.map((v) => v[aes.x])) as any)
            .range(config.xExtend())

        const brush = d3.brushX()

        xaxis
            .attr('transform', `translate(0, ${config.yExtend()[1]})`)
            .call(d3.axisBottom(x))

        const y = d3
            .scaleLinear()
            .domain(d3.extent(data.map((v) => v[aes.y])) as any)
            .range(config.yExtend().reverse())

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

        svg.on('mousemove click touchmove', (d) => {
            let xvalue = d.offsetX
            xvalue = x.invert(xvalue)
            vline
                .selectAll('line')
                .data([{ x: d.offsetX }])
                .join('line')
                .attr('transform', `translate(${d.offsetX}, 0)`)

            let idx = dateBisector.right(data, xvalue)
            textContainer
                .selectAll('text')
                .data([
                    {
                        msg: `${(xvalue as Date).toLocaleString()}: ${
                            data[idx][aes.y]
                        }`
                    }
                ])
                .join('text')
                .attr('x', 10)
                .attr('y', 20)
                .attr('style', 'font-size: 10px; font-family: Monaco')
                .text((x) => x.msg)
        })

        lineContainer
            .selectAll('path')
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
                    .curve(d3.curveCardinalOpen)
                    .x(functorKeyScale(aes.x, x))
                    .y(functorKeyScale(aes.y, y))
            )
        lineContainer.call(
            brush.extent([
                [0, 0],
                [300, 185]
            ])
        )

        dotsContainer
            .selectAll('circle')
            .data(data)
            .join('circle')
            // options
            .attr('fill', '#424874')
            .attr('stroke', 'none')
            .attr('cx', functorKeyScale(aes.x, x))
            .attr('cy', functorKeyScale(aes.y, y))
            // Option
            .attr('r', 2)
    }, [data])
    return (
        <div style={{ height: 185, width: 300 }} ref={ref}>
            <svg viewBox={`0 0 300 185`}>
                <g className='line'></g>
                <g className='lineplot-xaxis'></g>
                <g className='vline'></g>
                <g className='dots-container'></g>
                <g className='text-container'></g>
            </svg>
        </div>
    )
}

export default TimeseriesChart
