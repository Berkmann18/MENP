const router = require('express').Router(),
  flash = require('express-flash');

router.use(flash());

/**
 * @description 'Terms & Conditions' page.
 */
router.get('/', (req, res) => {
  res.render('page', {
    data: `<h1>Terms and conditions</h1>
    <p>
        In order to use the services provided by this web application ('MENP'), you agree to the following:
        <ol>
            <li>You will not commit any forms of illegal cyber-activities such as: bullying, scamming, phishing, stealing, ...</li>
            <li>You will keep private what needs to be kept within the boundary of this web application</li>
            <li>You accept to have a minimum of information known about you</li>
            <li>You acknowledge the necessity to use an up-to-date web-browser regardless of the platform(s) you use</li>
            <li>You will keep credits where their are due while respecting the copyrights surrounding this web application</li>
            <li>You accept that if you break any rules in this T&C you will have to accept consequences such as: being banned, taken to court, ...</li>
        </ol>
    </p>
    <a href="/register">Go back to the registration page</a>&nbsp; &nbsp;
    <a href="/">Go back to the home page</a>`
  })
});


module.exports = router;