/* eslint-env browser, es6 */
/* globals $ */

window.onload = () => {
  if (!$('input[name="twoFA"]').prop('checked')) $('#FABox').hide();
  //Fixes the toggle styling not showing up properly
  setTimeout(() => $('.toggle-handle.btn').addClass('bg-light'), 0);
  try {
    $('#twoFA').on('change', showFABox);
  } catch (err) {
    console.warn('There\'s no #twoFA!', err);
  }
  try {
    $('#twoFaMethod').on('change', showFAField);
  } catch (err) {
    console.warn('There\'s no #twoFaMethod!', err);
  }
};

/**
 * @description Show the Factor Authentication Box when the checkbox is enabled.
 */
const showFABox = () => {
    let $fab = $('#FABox');
    $('input[name="twoFA"]').prop('checked') ? $fab.show() : $fab.hide();
  },
  /**
   * @description Show the phone field when the 2FA method is set to 'sms'.
   */
  showFAField = () => {
    let $pb = $('#phonebox');
    $('#twoFaMethod').val() === 'sms' ? $pb.show() : $pb.hide();
  };