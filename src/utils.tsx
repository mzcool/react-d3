import * as d3 from 'd3'

export function getOrCreate(
    c: d3.Selection<d3.BaseType, any, any, any>,
    className: string,
    element: string
) {
    let s = c.select('.' + className)
    // console.info(s['_groups'][0][0])
    if (s.empty()) {
        c.append(element).attr('class', className)
        s = c.select(element + '.' + className)
    }
    return s
}
