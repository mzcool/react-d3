import React from 'react'

import { Story, Meta } from '@storybook/react/types-6-0'
import './tooltip.css'

const Tooltip: React.FC<any> = () => {
    return (
        <div style={{ fontFamily: 'sans-serif' }}>
            <div className='tooltip-container'>
                <div className='tooltip-header'>Tooltip</div>
                <div className='tooltip-content'>The content here</div>
            </div>
        </div>
    )
}

export default {
    title: 'Visualization/Tooltip',
    component: Tooltip
} as Meta

const Template: Story<any> = (args) => <Tooltip {...args}></Tooltip>
export const Default = Template.bind({})
