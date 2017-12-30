/* eslint-env browser, es6 */
/* global $ */
//Updates the year in the footer
window.onpageshow = () => $('#copyear').text((new Date()).getFullYear());