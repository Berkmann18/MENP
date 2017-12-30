/* eslint-env es6, browser */

/**
 * @description Check if an object has a property
 * @param {object} obj Object
 * @param {string} prop Property
 * @returns {boolean} Containment check result
 * @function
 */
let has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop); //Better than this[prop] != undefined

/**
 * @description Clamp values to keep them within a range [<code>a</code>; <code>b</code>].
 * @param {number} x Number
 * @param {number} a Lowest bound
 * @param {number} b Highest bound
 * @returns {number} Clamped number
 * @function
 */
let clamp = (x, a, b) => (x < a) ? a : ((x > b) ? b : x);


/**
 * @description Reverse a string
 * @param {string} str String to reverse
 * @param {string} [splitter=''] Splitting/joining string
 * @return {string} Reversed string
 * @function
 */
let reverse = (str, splitter = '') => str.split(splitter).reverse().join(splitter);

/**
 * @description Password checker (might be worth using password-checker).<br />
 * Source: Exence
 * @param {String} password Password to check
 * @param {boolean} [realScore=false] Flag indicating that the user only wants a real un-clamped score
 * @returns {(number|String[])} Score of the password
 * @function
 */
let checkPassword = (password, realScore) => {
  let score = 0, uppercase = 0, lowercase = 0, num = 0, symbol = 0, midChar = 0, uniqueChar = 0, repChar = 0, repInc = 0, consecUppercase = 0, consecLowercase = 0, consecNum=0, seqAlpha=0, seqNum=0, seqSymbol=0, reqChar = 0;
  let multMidChar = 2, multiConsecUppercase = 2, multConsecLowercase = 2, multiConsecNum = 2, multiSeqAlpha = 3, multiSeqNum = 3, multiSeqSymbol = 3, multLength = 4, multNum = 4, nMultSymbol = 6;
  let tmpUppercase = '', tmpLowercase = '', tmpNum = '', minPwLen = 8;
  let alpha = 'abcdefghijklmnopqrstuvwxyz', numbers = '01234567890', symbols = ')!@#$%^&*()';
  score = parseInt(password.length * multLength);
  let pwArr = password.replace(/\s+/g, '').split(/\s*/);

  /* Loop through password to check for Symbol, Numeric, Lowercase and Uppercase pattern matches */
  for (let i = 0; i < pwArr.length; i++) {
    if (pwArr[i].match(/[A-Z]/g)) {
      if (tmpUppercase !== '' && (tmpUppercase + 1) === i) consecUppercase++;
      tmpUppercase = i;
      uppercase++;
    } else if (pwArr[i].match(/[a-z]/g)) {
      if (tmpLowercase !== '' && (tmpLowercase + 1) === i) consecLowercase++;
      tmpLowercase = i;
      lowercase++;
    } else if (pwArr[i].match(/[0-9]/g)) {
      if (i > 0 && i < (pwArr.length - 1)) midChar++;
      if (tmpNum !== '' && (tmpNum + 1) === i) consecNum++;
      tmpNum = i;
      num++;
    } else if (pwArr[i].match(/[^a-zA-Z0-9_]/g)) {
      if (i > 0 && i < (pwArr.length - 1)) midChar++;
      symbol++;
    }
    //Repetition check
    let bCharExists = false;
    for (let j = 0; j < pwArr.length; j++) {
      if (pwArr[i] === pwArr[j] && i != j) { //Repetition present
        bCharExists = true;
        /*
                 Calculate increment deduction based on proximity to identical characters
                 Deduction is incremented each time a new match is discovered
                 Deduction amount is based on total password length divided by the
                 difference of distance between currently selected match
                 */
        repInc += Math.abs(pwArr.length / (j - i));
      }
    }
    if (bCharExists) {
      repChar++;
      uniqueChar = pwArr.length - repChar;
      repInc = uniqueChar ? Math.ceil(repInc / uniqueChar) : Math.ceil(repInc);
    }
  }

  //Check for sequential alpha string patterns (forward and reverse)
  for (let s = 0; s < 23; s++) {
    let sFwd = alpha.substring(s,parseInt(s + 3));
    let sRev = reverse(sFwd);
    if (has(password.toLowerCase(), sFwd) || has(password.toLowerCase(), sRev)) seqAlpha++;
  }

  //Check for sequential numeric string patterns (forward and reverse)
  for (let s = 0; s < 8; s++) {
    let sFwd = numbers.substring(s, parseInt(s + 3));
    let sRev = reverse(sFwd);
    if (has(password.toLowerCase(), sFwd) || has(password.toLowerCase(), sRev)) seqNum++;
  }

  //Check for sequential symbol string patterns (forward and reverse)
  for (let s = 0; s < 8; s++) {
    let sFwd = symbols.substring(s, parseInt(s + 3));
    let sRev = reverse(sFwd);
    if (has(password.toLowerCase(), sFwd) || has(password.toLowerCase(), sRev)) seqSymbol++;
  }

  //Modify overall score value based on usage vs requirements
  //General point assignment
  if (uppercase > 0 && uppercase < password.length) score = parseInt(score + ((password.length - uppercase) * 2));
  if (lowercase > 0 && lowercase < password.length) score = parseInt(score + ((password.length - lowercase) * 2));
  if (num > 0 && num < password.length) score = parseInt(score + (num * multNum));
  if (symbol > 0) score = parseInt(score + (symbol * nMultSymbol));
  if (midChar > 0) score = parseInt(score + (midChar * multMidChar));

  //Point deductions for poor practices
  if ((lowercase > 0 || uppercase > 0) && symbol === 0 && num === 0) score = parseInt(score - password.length); //Only Letters
  if (lowercase === 0 && uppercase === 0 && symbol === 0 && num > 0) score = parseInt(score - password.length); //Only Numbers
  if (repChar > 0) score = parseInt(score - repInc); //Same character exists more than once
  if (consecUppercase > 0) score = parseInt(score - (consecUppercase * multiConsecUppercase)); //Consecutive Uppercase Letters exist
  if (consecLowercase > 0) score = parseInt(score - (consecLowercase * multConsecLowercase)); //Consecutive Lowercase Letters exist
  if (consecNum > 0) score = parseInt(score - (consecNum * multiConsecNum)); //Consecutive Numbers exist
  if (seqAlpha > 0) score = parseInt(score - (seqAlpha * multiSeqAlpha)); //Sequential alpha strings exist (3 characters or more)
  if (seqNum > 0) score = parseInt(score - (seqNum * multiSeqNum)); //Sequential numeric strings exist (3 characters or more)
  if (seqSymbol > 0) score = parseInt(score - (seqSymbol * multiSeqSymbol)); //Sequential symbol strings exist (3 characters or more)

  //Determine if mandatory requirements have been met and set image indicators accordingly
  let arrChars = [password.length, uppercase, lowercase, num, symbol];
  let arrCharsIds = ['nLength', 'nAlphaUC', 'nAlphaLC', 'nNumber', 'nSymbol'];
  for (let c of arrChars) {
    let minVal = c === 'nLength' ? parseInt(minPwLen - 1) : 0;
    if (c === parseInt(minVal + 1) || c > parseInt(minVal + 1)) reqChar++;

  }

  let minReqChars = password.length >= minPwLen ? 3 : 4;
  if (reqChar > minReqChars) score = parseInt(score + (reqChar * 2)); //One or more required characters exist

  //Determine complexity based on overall score
  if (!realScore) score = clamp(score, 0, 100);
  let complexity;

  if (score < 0) complexity = '<span style="color: #F00">Really weak</span>';
  else if (score >= 0 && score < 20) complexity = '<span style="color: #BF0000">Very weak</span>';
  else if (score >= 20 && score < 40) complexity = '<span style="color: #7F0000">Weak</span>';
  else if (score >= 40 && score < 60) complexity = 'Good';
  else if (score >= 60 && score < 80) complexity = '<span style="color: #007F00">Strong</span>';
  else if (score >= 80 && score <= 100) complexity = '<span style="color: #00BF00">Very strong</span>';
  else if (score > 100) complexity = '<span style="color: #0F0">Really strong</span>';
  else complexity = '<span style="color: red">Too short</span>';
  return realScore ? score : [`${score}%`, complexity];
};

/**
 * @description Generate a code for password recovery users.
 * @param {number} id ID of the user
 * @return {string} Code
 */
let genCode = (id) => id + ex.get(ex.getDate(true), 0, 2).join('') + ex.get(String((new Date()).getTime()), 2, -2).join('');

// module.exports = {
//     checkPassword
// };

let oldBtn = 'home';
let menuBtnChg = (btn) => {
  $(`#${oldBtn}`).removeClass('active');
  $(`#${btn}`).addClass('active');
  console.log(`Moved .active from ${oldBtn} to ${btn}`);
  oldBtn = btn;
};