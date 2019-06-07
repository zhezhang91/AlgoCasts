// --- Directions
// Check to see if two provided strings are anagrams of eachother.
// One string is an anagram of another if it uses the same characters
// in the same quantity. Only consider characters, not spaces
// or punctuation.  Consider capital letters to be the same as lower case
// --- Examples
//   anagrams('rail safety', 'fairy tales') --> True
//   anagrams('RAIL! SAFETY!', 'fairy tales') --> True
//   anagrams('Hi there', 'Bye there') --> False

function anagrams(stringA, stringB) {
  const ACharMap = buildCharMap(stringA);
  const BCharMap = buildCharMap(stringB);
  if (Object.keys(ACharMap).length !== Object.keys(BCharMap).length)
    return false;
  Object.keys(ACharMap).forEach(key => {
    if (!BCharMap[key] || ACharMap[key] !== BCharMap[key]) return false;
  });
  return true;
}

function buildCharMap(str) {
  const charMap = {};
  for (let char of str.replace(/[^\w]/, '').toLowerCase()) {
    charMap[char] = charMap[char] + 1 || 1;
  }
  return charMap;
}

// function anagrams(stringA, stringB) {
//   return cleanString(stringA) === cleanString(stringB);
// }

// function cleanString(str) {
//   return str
//     .replace(/[^\w]/, '')
//     .toLowerCase()
//     .split('')
//     .sort()
//     .join('');
// }
module.exports = anagrams;
