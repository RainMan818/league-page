import ColorScale from "color-scales";

export const colorsRYG = ["#e67c73", "#ffd666", "#57bb8a"];
export const colorsGYR = ["#57bb8a", "#ffd666", "#e67c73"];
//   const colorsGYR = ["#0b8148", "#fccf55", "#f75c4d"]; // brighter

export function getColorScale(params) {
    const { objects, key, originalMin, originalMax } = params;
    let max = originalMax;
    let min = originalMin;
    objects.forEach((obj) => {
        const value = obj[key];
        max = Math.max(value, max);
        min = Math.min(value, min);
    })

    return new ColorScale(min, max, colorsRYG);
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