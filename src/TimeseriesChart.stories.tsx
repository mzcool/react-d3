import React from 'react'

import { Story, Meta } from '@storybook/react/types-6-0'
import TimeseriesChart, { TimeseriesChartProps } from './TimeseriesChart'
import axios from 'axios'

// import { Client } from '@elastic/elasticsearch'

const esHost = 'http://localhost:5000'
// const esClient = new Client({ node: esHost })

// async function getData(cli: Client) {
//     return cli.search({ index: 'v2_events_2020_12_12' })
// }

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

axios.post(`${esHost}/v2/dquery/test_transform/snrt`, {
    query: {
        // match_all: {}
        bool: {
            must: [],
            filter: []
        }
    }
})

const tsData = generateData(100, 60)

const Template: Story<TimeseriesChartProps> = (args) => (
    <TimeseriesChart {...args}></TimeseriesChart>
)
export const Realtime = Template.bind({})
Realtime.args = {
    data: tsData,
    aes: { x: 'date', y: 'views' }
}
