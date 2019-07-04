// --- Directions
// Implement bubbleSort, selectionSort, and mergeSort

function bubbleSort(arr) {
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const lesser = arr[j + 1];
        arr[j + 1] = arr[j];
        arr[j] = lesser;
      }
    }
  }
  return arr;
}

function selectionSort(arr) {
  for (let i = 0; i < arr.length; i++) {
    let indexOfMin = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[indexOfMin]) indexOfMin = j;
    }
    if (indexOfMin !== i) {
      const lesser = arr[indexOfMin];
      arr[indexOfMin] = arr[i];
      arr[i] = lesser;
    }
  }
  return arr;
}

function mergeSort(arr) {
  if (arr.length === 1) return arr;

  const center = Math.floor(arr.length / 2);
  const left = arr.slice(0, center);
  const right = arr.slice(center);
  return merge(mergeSort(left), mergeSort(right));
}

function merge(left, right) {
  const results = [];
  while (left.length && right.length) {
    if (left[0] < right[0]) {
      results.push(left.shift());
    } else results.push(right.shift());
  }
  return [...results, ...left, ...right];
}

function quickSort(arr) {
  const len = arr.length;
  const pivotIndex = Math.floor(lent / 2);
  const pivot = arr.splice(pivotIndex, 1)[0];
  const left = [];
  const right = [];
  for (let i = 0; i < len; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else right.push(arr[i]);
  }
  return quickSort(left).concat([pivot], quickSort(right));
}

function quickSortRecursion(arr) {
  if (!arr || arr.length < 2) return arr;
  const pivot = arr.pop();
  let left = arr.filter(item => item < pivot);
  let right = arr.filter(item => item > pivot);
  return quickSortRecursion(left).concat([pivot], quickSortRecursion(right));
}
module.exports = { bubbleSort, selectionSort, mergeSort, merge };
