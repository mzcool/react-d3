class PaddingConfig {
    left: number = 10
    right: number = 10
    top: number = 10
    bottom: number = 10
}

class ChartConfig {
    paddings = new PaddingConfig()
    height = 185
    width = 300

    public xExtend = () => {
        return [this.paddings.left, this.width - this.paddings.right]
    }
    public yExtend = () => {
        return [
            this.paddings.top,
            this.height - this.paddings.bottom - this.paddings.top
        ]
    }

    public setSize(width: number, height: number): ChartConfig {
        this.height = height
        this.width = width
        return this
    }
}

export { PaddingConfig, ChartConfig }
