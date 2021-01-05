class PaddingConfig {
    left: number = 10
    right: number = 10
    top: number = 10
    bottom: number = 10
}

class ChartConfig {
    paddings = new PaddingConfig()
    svgHeight = 185
    svgWidth = 300

    public xExtend = () => {
        return [this.paddings.left, this.svgWidth - this.paddings.right]
    }
    public yExtend = () => {
        return [this.paddings.top, this.svgHeight - this.paddings.bottom]
    }
    public width = () => {
        return this.svgWidth - this.paddings.right - this.paddings.left
    }
    public height = () => {
        return this.svgHeight - this.paddings.top - this.paddings.bottom
    }
}

export { PaddingConfig, ChartConfig }
