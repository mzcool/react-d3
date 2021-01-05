import React from 'react'
import Barchart, { BarchartProps } from './Barchart'

import { Story, Meta } from '@storybook/react/types-6-0'

export default {
    title: 'Visualization/Barchart',
    component: Barchart
} as Meta

/**
 * Test data section
 * In this section, we list all the data that fits the visualizations
 */
const viewsByWeekday: any[] = [
    { y: 5, x: 'Mon' },
    { y: 10, x: 'Tue' },
    { y: 8, x: 'Wed' },
    { y: 7, x: 'Thu' },
    { y: 5, x: 'Fri' },
    { y: 10, x: 'Sat' },
    { y: 20, x: 'Sun' }
]
const viewsByMonth: any[] = [
    { y: 5, x: 'Jan' },
    { y: 10, x: 'Feb' },
    { y: 8, x: 'Mar' },
    { y: 7, x: 'May' },
    { y: 5, x: 'Jun' },
    { y: 10, x: 'Jul' },
    { y: 20, x: 'Aug' },
    { y: 31, x: 'Sep' },
    { y: 40, x: 'Oct' },
    { y: 30, x: 'Nov' },
    { y: 10, x: 'Dec' }
]

const Template: Story<BarchartProps> = (args) => <Barchart {...args}></Barchart>
export const ByWeekday = Template.bind({})

ByWeekday.args = {
    data: viewsByWeekday,
    barPadding: 0.5
}

export const ByMonth = Template.bind({})

ByMonth.args = {
    data: viewsByMonth,
    barPadding: 0.5
}
