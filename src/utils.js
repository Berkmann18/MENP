const clr = require('colors');
const { User } = require('./model');
const { noUsers } = require('../routes/generic');
const clrScheme = { in: 'white',
  out: 'cyan',
  inf: 'green',
  err: 'red',
  warn: 'yellow',
  debug: 'grey'
};

/**
 * @description Print an error.
 * @param {...*} data Data to print
 */
const error = (...data) => console.error(clr.err(data.join(' ')));

/**
 * @description Print an information.
 * @param {...*} data Data to print
 */
const info = (...data) => {
  try {
    console.info(clr.inf(data.join(' ')));
  } catch (err) {
    console.log(clr.inf(data.join(' ')));
  }
};

/**
 * @description Print a  warning.
 * @param {...*} data Data to print
 */
const warn = (...data) => {
  try {
    console.warn(clr.warn(data.join(' ')));
  } catch (err) {
    console.log(clr.warn(data.join(' ')));
  }
};

/**
 * @description Print a debug message.
 * @param {...*} data Data to print
 */
const dbg = (...data) => {
  try {
    console.debug(clr.debug(data.join(' ')));
  } catch (err) {
    console.log(clr.debug(data.join(' ')));
  }
};

/**
 * @description Print an output.
 * @param {...*} data Data to print
 */
const out = (...data) => console.log(clr.out(data.join(' ')));

/**
 * @description Print an input.
 * @param {...*} data Data to print
 */
const inp = (...data) => console.log(clr.in(data.join(' ')));

/**
 * @description Set a colour scheme for the CLI.
 * @protected
 */
const setColours = () => clr.setTheme(clrScheme);

/**
 * @description Get a message corresponding to an HTTP code.
 * @param {(error|{status:number, message:string=})} err Error
 * @return {string} Message
 * @protected
 */
const codeToMsg = (err) => {
  let map = {
    400: '<h1>Ooh dear!! You asked the wrong thing mate!</h1><img src="/img/400.png" alt="400">',
    401: '<h1>HALT!! You\'re not authorised to be here!!</h1><img src="/img/403.png" alt="401-403">',
    404: '<h1>Whoops!!</h1>The page you requested ran away so can\'t found<br><img src="/img/404.gif" alt="404">',
    410: '<h1>My condolences :(!</h1>The page you wanted, sadly left us!<br><img src="/img/410.jpg" alt="410">',
    500: '<h1>Something went wrong in the server... Apologies :s</h1><img src="/img/500.png" alt="500">',
    501: '<h1>Wow! This wasn\'t implemented, what a shame!</h1><img src="/img/501.jpg" alt="501">',
    503: '<h1>The service in charge went for a nap, please require it later!</h1><img src="/img/503.jpg" alt="503">',
    550: '<h1>What are you doing? You\'re not allowed here!</h1><img src="/img/550.jpg" alt="550">'
  };
  map[403] = map[401];
  return (map[err.status]) ? map[err.status] : err.message;
};

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
    if (err) error('Error:', err);
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

module.exports = { error, info, warn, dbg, out, inp, codeToMsg, setColours, dateDiff, userTable, modminPage, url };