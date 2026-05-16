export class SortEngine {
    static compare(a, b, key, ascending) {
        let valA = a[key];
        let valB = b[key];
        
        if (key === 'mtime') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
    }

    // BUBBLE SORT O(n²)
    static bubbleSort(arr, key, ascending = true) {
        const result = [...arr];
        const n = result.length;

        for (let i = 0; i < n - 1; i++) {
            for (let j = 0; j < n - i - 1; j++) {
                if (this.compare(result[j], result[j + 1], key, ascending) > 0) {
                    // Troca manual
                    const temp = result[j];
                    result[j] = result[j + 1];
                    result[j + 1] = temp;
                }
            }
        }
        return result;
    }

    // MERGE SORT O(n log n)
    static mergeSort(arr, key, ascending = true) {
        if (arr.length <= 1) return arr;

        const mid = Math.floor(arr.length / 2);
        const left = arr.slice(0, mid);
        const right = arr.slice(mid);

        return this.merge(
            this.mergeSort(left, key, ascending),
            this.mergeSort(right, key, ascending),
            key,
            ascending
        );
    }

    static merge(left, right, key, ascending) {
        let resultArray = [], leftIndex = 0, rightIndex = 0;

        while (leftIndex < left.length && rightIndex < right.length) {
            if (this.compare(left[leftIndex], right[rightIndex], key, ascending) <= 0) {
                resultArray.push(left[leftIndex]);
                leftIndex++;
            } else {
                resultArray.push(right[rightIndex]);
                rightIndex++;
            }
        }

        return resultArray
            .concat(left.slice(leftIndex))
            .concat(right.slice(rightIndex));
    }
}