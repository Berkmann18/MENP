const router = require('express').Router(),
  flash = require('express-flash');

router.use(flash());

/**
 * @description 'About us' page containing a few bits from the README.md file
 */
router.get('/', (req, res) => {
  res.render('index', {
    data: `<h1>About us</h1>
This is a sample MENP (MongoDB, Express, Node, Pug) web app (which uses Bootstrap and jQuery) made by Maximilian Berkmann.
<p><img src="img/mongodb.png" alt="M" class="tools" title="MongoDB" aria-label="MongoDB">
<img src="img/expressjs.png" alt="E" class="tools" title="Express" aria-label="Express">
<img src="img/nodejs-512.png" alt="N" class="tools" title="NodeJS" aria-label="NodeJS">
<img src="img/pugjs.png" alt="P" class="tools" title="Pug" aria-label="Pug"> +
<img src="img/bootstrap4.png" alt="B" class="tools" title="Bootstrap" aria-label="Bootstrap">
<img src="img/jquery-icon-17841.png" alt="jQ" class="tools" title="jQuery" aria-label="jQuery">
<img src="img/cheerio.png" alt="c" class="tools" title="Cheerio" aria-label="Cheerio">
<img src="img/nodemailer_sendgrid.png" alt="Nm+Sg" class="tools-wide" title="NodeMailer + Sendgrid" aria-label="NodeMailer + Sendgrid">
<img src="img/passport.png" alt="p" class="tools" title="Passport" aria-label="Passport">
<img src="img/helmet.png" alt="h" class="tools" title="Helmet" aria-label="Helmet">
<img src="img/nexmo.png" alt="n" class="tools" title="Nexmo" aria-label="Nexmo">
</p>
<p>
Basically: <ul>
    <li>MongoDB for the database</li>
    <li>NodeJS and Express for the server</li>
    <li>Pug for the view rendering and templating</li>
    <li>Boostrap for the UI</li>
    <li>jQuery and Cheerio for a sped up DOM access on both client and server sides</li>
    <li>NodeMailer + SendGrid for the emails</li>
    <li>Nexmo for the SMSs</li>
    <li>Passport for the authentication</li>
    <li>Helmet for the security</li>
</ul>
</p>`,
    user: req.user,
    page: 'about'
  });
});

module.exports = router;