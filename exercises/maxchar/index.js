// --- Directions
// Given a string, return the character that is most
// commonly used in the string.
// --- Examples
// maxChar("abcccccccd") === "c"
// maxChar("apple 1231111") === "1"

function maxChar(str) {
  //  const map = {};
  let max = 0,
    result = '';
  const map = str.split('').reduce((acc, cur) => {
    acc[cur] ? acc[cur]++ : (acc[cur] = 1);
    return acc;
  }, {});
  //   for (let char of str) {
  //     map[char] ? map[char]++ : (map[char] = 1);
  //   }

  for (let key in map) {
    if (map[key] > max) {
      max = map[key];
      result = key;
    }
  }
  return result;
}

module.exports = maxChar;
