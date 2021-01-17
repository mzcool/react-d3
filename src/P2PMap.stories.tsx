import React from 'react'

import { Story, Meta } from '@storybook/react/types-6-0'

interface P2PMapProps {}

const P2PMap: React.FC<P2PMapProps> = () => {
    return <div>P2P Map</div>
}

export default {
    title: 'Visualization/P2PMap',
    component: P2PMap
} as Meta

const Template: Story<P2PMapProps> = (args) => <P2PMap {...args}></P2PMap>
export const Default = Template.bind({})
