/**
 * @description Difference between two dates.
 * @param {string} datepart  (<b>y</b>ear, <b>m</b>onth, <b>w</b>eek, <b>d</b>ay, <b>h<b>our, mi<b>n</b>utes, <b>s</b>econds)
 * @param {Date} fromDate Earliest date
 * @param {Date} toDate Latest date
 * @returns {number} Difference
 */
const dateDiff = (datepart, fromDate, toDate) => {
  let diff = toDate - fromDate;
  let divideBy = {
    y: 31536e6,
    m: 2628e6,
    w: 6048e5,
    d: 864e5,
    h: 36e5,
    n: 6e4,
    s: 1e3
  };

  return diff / divideBy[datepart] /*  | 0 */ ;
};

module.exports = { dateDiff };