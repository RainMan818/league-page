import ColorScale from "color-scales";

const green = "#57bb8a"; // #0b8148 (brighter colors)
const red = "#e67c73"; // #fccf55
const yellow = "#ffd666"; // #f75c4d

export const colorsRYG = [red, yellow, green];
export const colorsGYR = [green, yellow, red];

export function getColorScale(params) {
    const { objects, key, originalMin, originalMax, flipColors = true } = params;
    let max = originalMax;
    let min = originalMin;
    objects.forEach((obj) => {
        const value = obj[key];
        max = Math.max(value, max);
        min = Math.min(value, min);
    })

    return new ColorScale(min, max, flipColors ? colorsRYG : colorsGYR);
}

export function getRanking(params) {
    const { objects, key } = params

    const values = objects.map((obj) => {
        return obj[key];
    })

    return rankArrayDescending(values)
}

function rankArrayDescending(arr) {
    // 1. Create a set of unique values and sort them in descending order.
    const uniqueSortedValues = [...new Set(arr)].sort((a, b) => b - a);

    // 2. Create a Map where keys are the unique values and values are their ranks (1-based).
    const rankMap = new Map(uniqueSortedValues.map((value, index) => [value, index + 1]));

    // 3. Map the original array to a new array using the ranks from the Map.
    const ranks = arr.map(value => rankMap.get(value));

    return ranks;
}