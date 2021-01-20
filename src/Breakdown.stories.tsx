import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

import { Story, Meta } from '@storybook/react/types-6-0'
import { ChartConfig } from './options'
import './breakdown.css'
import { loadQoeMetricsBy } from './queries'
import { getOrCreate } from './utils'

interface QualityBreakdownProps {
    data?: any
    chartConfig?: ChartConfig
    aes: {
        jitter?: boolean
        scale?: 'linear' | 'log'
    }
}
const QualityBreakdown: React.FC<QualityBreakdownProps> = ({
    data,
    chartConfig,
    aes
}) => {
    const config = chartConfig ?? new ChartConfig()

    if (!data) {
        return <div>No data</div>
    }

    config.setSize(config.width, 55 * data.length)
    const { height, width } = config

    const ref = useRef<any>()
    const minMax = [1, 3000]
    const x = d3.scaleLog().domain(minMax).range(config.xExtend())
    const xAxis = d3.axisBottom(x).ticks(3)
    const splits = [100, 1000]
    const colors = ['#D1462F', '#F5D547', '#3DDC97'].reverse()

    useEffect(() => {
        // create some containers
        const svgElement = d3.select(ref.current),
            container = getOrCreate(svgElement, 'breakdown-svg-container', 'g')
        // create the axis
        getOrCreate(svgElement, 'breakdown-xaxis-container', 'g')
            .attr('transform', `translate(0, ${config.yExtend()[1]})`)
            .call(xAxis as any)

        data.map((v: any, idx: number) => {
            const yCor = idx * 50,
                rebufferingPercentiles = v['rebuffering']['values']
            let pre = 0,
                lastV = -1,
                lastK = ''
            // for each percentile
            Object.entries(rebufferingPercentiles)
                .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
                .forEach(([k, v], idx) => {
                    v = (v as any) + 1
                    if (aes.jitter) {
                        v = (v as any) + idx
                    }
                    const xCor = x(v as number),
                        percentOfUser = parseFloat(k) - parseFloat(lastK),
                        heightOfRect = (percentOfUser * 30) / 25

                    // break out because there is nothing to draw
                    if (lastV == -1) {
                        lastK = k
                        lastV = v as number
                        return
                    }
                    // find where to insert this percentile
                    const n = d3.bisectLeft(splits, v as number)
                    // if it crosses a pre-set threshold
                    if (n > pre) {
                        let left = x(lastV)
                        const toGo = n - pre
                        for (let i = 0; i < toGo; i++) {
                            container
                                .append('rect')
                                .attr('x', left)
                                .attr('y', yCor)
                                .attr('height', heightOfRect)
                                .attr('width', x(splits[pre]) - left)
                                .attr('fill', colors[pre])

                            left = x(splits[pre])

                            pre++
                        }
                        container
                            .append('rect')
                            .attr('x', left)
                            .attr('y', yCor)
                            .attr('height', heightOfRect)
                            .attr('width', x(v as any) - left)
                            .attr('fill', colors[n])

                        // pre = n
                    } else {
                        container
                            .append('rect')
                            .attr('x', x(lastV))
                            .attr('y', yCor)
                            .attr('height', heightOfRect)
                            .attr('width', x(v as number) - x(lastV))
                            .attr('fill', colors[n])
                        // console.info('draw from', lastV, 'to', v, colors[n])
                    }
                    // Draw the cover
                    container
                        .append('rect')
                        .attr('class', 'userchunk-cover')
                        .attr('x', x(lastV as number))
                        .attr('y', yCor)
                        .attr('rx', 2)
                        .attr('ry', 2)
                        .attr('height', '30')
                        .attr('fill', 'none')
                        // .attr('opacity', '0')
                        .attr('stroke', 'black')
                        .attr('stroke-width', '0')
                        .attr('width', x(v as number) - x(lastV))
                        .on('mouseenter', function (d) {
                            // console.info(d.srcElement)
                            d3.select(d.srcElement).attr(
                                'class',
                                'userchunk-cover entered'
                            )
                        })
                        .on('mouseleave', (d) => {
                            d3.select(d.srcElement).attr(
                                'class',
                                'userchunk-cover'
                            )
                        })
                    // move last forward
                    lastV = v as number
                    lastK = k

                    // draw the verticle line
                    if (xCor) {
                        container
                            .append('line')
                            .attr('x1', xCor)
                            .attr('x2', xCor)
                            .attr('y1', yCor)
                            .attr('y2', yCor + 30)
                            .attr('stroke', 'black')
                            .attr('stroke-width', 2)
                            .attr('stroke-dasharray', '4, 2')
                    }
                    if (k == '50.0') {
                        container
                            .append('text')
                            .attr('text-anchor', 'middle')
                            .attr('font-size', '0.75rem')
                            .attr('x', xCor)
                            .attr('y', yCor + 40)
                            .attr('dy', '.35em')
                            .text(k + '%')
                    }
                })
        })
    }, [aes])

    return (
        <div>
            <svg
                ref={ref}
                style={{ height, width }}
                viewBox={`0 0 ${width} ${height}`}
            ></svg>
        </div>
    )
}

export default {
    title: 'Visualization/QualityBreakdown',
    component: QualityBreakdown
} as Meta

const Template: Story<QualityBreakdownProps | any> = (args, { loaded }) => (
    <QualityBreakdown {...args} {...loaded}></QualityBreakdown>
)

export const Default = Template.bind({})
Default.args = {
    aes: {
        jitter: true
    }
}
Default['loaders'] = [
    async () => ({
        data: await loadQoeMetricsBy('snrt', 'rebuffering').then(
            (x) => x['buckets']
        )
    })
]
