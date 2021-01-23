import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { Story, Meta } from '@storybook/react/types-6-0'
import { ChartConfig } from './options'
import {
    EstimateDistribution,
    EstimationToConfiguration,
    getOrCreate
} from './utils'
import { config } from 'process'
import './breakdown.css'
import { QualityPercent } from './BreakdownPercent'

interface QualityBreakdownPercentProps {
    data?: any
    chartConfig?: ChartConfig
}

const QualityBreakdownPercent: React.FC<QualityBreakdownPercentProps> = () => {
    const threshold = [400, 700, 1400, 5600]
    const colors = ['#C81D25', '#087E8B', '#0B3954', '#BFD7EA', 'red']

    const values = [100, 200, 400, 600, 870, 900, 1000, 2000, 5000]

    const thresholdPercents = EstimateDistribution(threshold, values)
    const configuration = EstimationToConfiguration(thresholdPercents).map(
        (v, i) => {
            return { ...v, color: colors[i] }
        }
    )

    const ref = useRef<any>()

    const plotBar = (
        parent: d3.Selection<d3.BaseType, any, any, any>,
        width: number,
        height: number,
        configuration: QualityPercent[]
    ) => {
        const x = d3.scaleLinear().domain([0, 100]).range([0, width])

        parent
            .selectAll('.block')
            .data(configuration)
            .join('rect')
            .attr('x', (d) => x(d.fromPercent))
            .attr('width', (d) => x(d.percent))
            .attr('height', height)
            .attr('fill', (d) => d.color)
            .attr('class', 'block')
            .on('mouseenter', (e) => {
                d3.select(e.srcElement).attr('class', 'block block-hovered')
            })
            .on('mouseleave', (e) => {
                d3.select(e.srcElement).attr('class', 'block')
            })
    }

    useEffect(() => {
        const svgElement = d3.select(ref.current)

        const data = [
            { content: 'c1', configuration: configuration },
            { content: 'c2', configuration: configuration },
            { content: 'c3', configuration: configuration }
        ]

        data.map((_, i) =>
            getOrCreate(svgElement, `block-container-${i}`, 'g').attr(
                'transform',
                `translate(0, ${i * 30})`
            )
        ).map(
            (c, i) =>
                plotBar(
                    c,
                    400,
                    25,
                    data[i].configuration.map((v) => {
                        return {
                            ...v,
                            key: data[i].content,
                            percent: v.toPercent - v.fromPercent
                        }
                    })
                )

            // plotPie(
            //     c,
            //     400,
            //     25,
            //     data[i].configuration.map((v) => {
            //         return {
            //             ...v,
            //             key: data[i].content,
            //             percent: v.toPercent - v.fromPercent
            //         }
            //     })
            // )
        )
    }, [])

    return (
        <div>
            <svg ref={ref}></svg>
        </div>
    )
}

export default {
    title: 'Visualization/QualityBreakdownPercent',
    component: QualityBreakdownPercent
} as Meta

const Template: Story<QualityBreakdownPercentProps | any> = (
    args,
    { loaded }
) => <QualityBreakdownPercent {...args} {...loaded}></QualityBreakdownPercent>

export const Default = Template.bind({})
Default.args = {}
