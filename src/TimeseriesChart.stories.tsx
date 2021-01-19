import React from 'react'

import { Story, Meta } from '@storybook/react/types-6-0'
import TimeseriesChart, { TimeseriesChartProps } from './TimeseriesChart'
import { loadDataUsage, loadTimeseriesViews, unwrapTimeseries } from './queries'
import { ChartConfig } from './options'
import { fileSize, compactInteger } from 'humanize-plus'

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

const Template: Story<TimeseriesChartProps | any> = (args, { loaded }) => {
    console.info(loaded)
    return <TimeseriesChart {...args} {...loaded}></TimeseriesChart>
}
export const Default = Template.bind({})
Default.args = {
    data: tsData,
    aes: {
        x: 'date',
        ySeries: [{ y: 'views' }]
    }
}

export const Views = Template.bind({})
Views['loaders'] = [
    async () => ({
        data: unwrapTimeseries(await loadTimeseriesViews(), ['views'])
    })
]
Views.args = {
    aes: {
        x: 'date',
        ySeries: [{ y: 'views', name: 'simultaneous viewers' }],
        yMin: 0,

        tooltipFormater: (s: any, datum: any) => {
            return `${s.name}: ${compactInteger(datum[s.y])} viewers <br/>`
        }
    },
    chartConfig: new ChartConfig().setSize(900, 404)
}

export const Data = Template.bind({})
Data.args = {
    aes: {
        x: 'date',
        yMin: 0,
        tooltipHeader: 'Bandwidth',
        ySeries: [
            { y: 'cdnBandwidth', name: 'CDN bandwidth' },
            { y: 'v2vBandwidth', name: 'V2V bandwidth' },
            { y: 'totalBandwidth', name: 'Total Bandwidth' }
        ],
        tooltipFormater: (s: any, datum: any) => {
            return `${s.name}: ${fileSize(datum[s.y])}/s <br/>`
        }
    },
    chartConfig: new ChartConfig().setSize(900, 404)
}
Data['loaders'] = [
    async () => ({
        data: unwrapTimeseries(await loadDataUsage(), [
            'cdn',
            'v2v',
            'total',
            'cdnBandwidth',
            'v2vBandwidth',
            'totalBandwidth'
        ])
    })
]
