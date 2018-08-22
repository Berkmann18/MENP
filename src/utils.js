const { User } = require('./model');

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

/**
 * @description Make a table with informations of users.
 * @param {User[]} users List of users
 * @param {string} [dir='users'] Directory of the route
 * @param {string[]} cols Columns from the collection
 * @param {string[]} [visualCols=cols] Columns as shown in the table
 * @param {string} [term=''] Search term
 * @returns {string} HTML code of the table
 */
const userTable = (users, { dir = 'users', cols, visualCols = cols, term = '' } = {}) => {
  let usrlist = `<form action="/${dir}/search" method="get">
    <div class="input-group stylish-input-group">
      <input type="text" class="form-control" placeholder="Search" name="term" value="${term}">
      <span class="input-group-addon">
        <button type="submit">
          <span class="fas fa-search"></span>
        </button>  
      </span>
    </div>
  </form><table class="table"><caption>Users</caption><tr>`,
    nb = 0;

  for (let col of visualCols) usrlist += `<th>${col}</th>`;
  usrlist += '</tr>';
  for (let user of users) {
    usrlist += '<tr>';
    for (let col of cols) {
      if (col === 'username') usrlist += `<td><a href="/users/@${user[col]}">${user[col]}</a></td>`
      else if (col === 'type') usrlist += `<td><span class="${user[col]}">${user[col]}</span<</td>`;
      else if (col === 'registerDate') {
        let diff = dateDiff('w', user[col], Date.now());
        usrlist += (diff < 1.5) ? `<td><span class="newmember">${user[col]}</span</td>` : `<td>${user[col]}</td>`;
      } else usrlist += `<td>${user[col]}</td>`;
    }
    usrlist += '</tr>';
    ++nb;
  }
  usrlist += `</table><p><em>${nb}</em> users (as of ${new Date()})</p>`;
  return usrlist;
}

/**
 * @description Moderator page.
 * @param {Request} req HTTP(S) request
 * @param {object} res Result
 * @param {string[]} cols Columns for the user table
 * @param {boolean} [admin=false] Admin version
 * @param {object} [filter={}] Filter object
 * @param {string} [term=''] Term to input in the input field
 */
const modminPage = (req, res, cols, { admin = false, filter = {}, term = '' } = {}) => {
  User.find(filter, (err, users) => {
    if (err) _err('Error:', err);
    if (!users) return noUsers(req, res);

    let page = admin ? 'admin' : 'mod';
    let opts = {
      admin,
      data: userTable(users, {
        cols,
        dir: page,
        term
      }),
      user: req.user,
      page
    };
    res.render('modmin', opts);
  });
};

/**
 * @description Gives the resulting URL from a request.
 * @param {Request} req HTTP(S) request
 * @returns {string} URL.
 */
const url = (req) => `${req.protocol}://${req.headers.host}`;

module.exports = { dateDiff, userTable, modminPage, url };