// --- Directions
// Write a function that accepts a positive number N.
// The function should console log a pyramid shape
// with N levels using the # character.  Make sure the
// pyramid has spaces on both the left *and* right hand sides
// --- Examples
//   pyramid(1)
//       '#'
//   pyramid(2)
//       ' # '
//       '###'
//   pyramid(3)
//       '  #  '
//       ' ### '
//       '#####'

function pyramid(n, row = 0, level = '') {
  //   const midIndex = Math.floor((2 * n - 1) / 2);
  //   for (let row = 0; row < n; row++) {
  //     let level = '';
  //     for (let column = 0; column < 2 * n - 1; column++) {
  //       if (midIndex - row <= column && midIndex + row >= column) {
  //         level += '#';
  //       } else level += ' ';
  //     }
  //     console.log(level);
  //   }
  const midIndex = Math.floor((2 * n - 1) / 2);
  if (n === row) return;
  if (level.length === 2 * n - 1) {
    console.log(level);
    return pyramid(n, row + 1);
  }
  if (level.length <= midIndex + row && level.length >= midIndex - row) {
    level += '#';
  } else level += ' ';
  pyramid(n, row, level);
}

module.exports = pyramid;
