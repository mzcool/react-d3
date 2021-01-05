import React from 'react'

import { Story, Meta } from '@storybook/react/types-6-0'
import TimeseriesChart, { TimeseriesChartProps } from './TimeseriesChart'
import { scaleLinear } from 'd3'

export default {
    title: 'Visualization/TimeseriesChart',
    component: TimeseriesChart
} as Meta

/**
 * Test data section
 * In this section, we list all the data that fits the visualizations
 */

function generateData(nPoints: number, scaleSecond: 60): any[] {
    let result = []
    let start = Math.random() * 10
    let startDate = new Date()

    for (let i = 0; i < nPoints; i++) {
        result.push({
            date: startDate,
            views: start
        })

        startDate = new Date(startDate.getTime() + scaleSecond * 1000)
        start += Math.random() * 5 - 2.5
    }

    return result
}

const tsData = generateData(100, 60)

const Template: Story<TimeseriesChartProps> = (args) => (
    <TimeseriesChart {...args}></TimeseriesChart>
)
export const Realtime = Template.bind({})
Realtime.args = {
    data: tsData,
    aes: { x: 'date', y: 'views' }
}
