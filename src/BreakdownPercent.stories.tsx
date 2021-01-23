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
import { loadContentStats, loadQoeMetricsBy } from './queries'

interface QualityBreakdownPercentProps {
    data?: any
    chartConfig?: ChartConfig
}

const QualityBreakdownPercent: React.FC<QualityBreakdownPercentProps> = ({
    data
}) => {
    const threshold = [1, 10]
    const colors = ['#C13D59', '#F8D119', '#08C388'].reverse()

    data = data.map((v: any) => {
        return {
            content: v.key,
            configuration: EstimationToConfiguration(
                EstimateDistribution(
                    threshold,
                    Object.values(v.rebuffering.values)
                )
            ).map((v, i) => {
                return { ...v, color: colors[i] }
            })
        }
    })

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
            .attr('transform', `translate(0, 5)`)
            .on('mouseenter', (e) => {
                d3.select(e.srcElement).attr('class', 'block block-hovered')
            })
            .on('mouseleave', (e) => {
                d3.select(e.srcElement).attr('class', 'block')
            })
    }

    useEffect(() => {
        const svgElement = d3
            .select(ref.current)
            .attr('height', data.length * 50)
            .attr('width', 500)

        data.map((_, i) =>
            getOrCreate(svgElement, `block-container-${i}`, 'g')
                .attr('height', 50)
                .attr('transform', `translate(0, ${i * 50 + 20})`)
        ).map(
            (c, i) => {
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

                getOrCreate(c, 'key-name', 'text').text(data[i].content)
            }
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

Default['loaders'] = [
    async () => ({
        data: await loadQoeMetricsBy('snrt', 'content', 'rebuffering').then(
            (x) => x['buckets']
        )
    })
]
