/******************************************************************************
 * This tutorial is based on the work of Martin Hawksey twitter.com/mhawksey  *
 * But has been simplified and cleaned up to make it more beginner friendly   *
 * All credit still goes to Martin and any issues/complaints/questions to me. *
 ******************************************************************************/

var TO_ADDRESS = "example@email.net";
var COINHIVE_SECRET = "yoursecret";
var HASHES = 2048;

// spit out all the keys/values from the form in HTML for email
function formatMailBody(obj, order) {
  var result = "";
  // loop over all keys in the ordered form data
  for (var idx in order) {
    var key = order[idx];
    result += "<h4 style='text-transform: capitalize; margin-bottom: 0'>" + key + "</h4><div>" + obj[key] + "</div>";
    // for every key, concatenate an `<h4 />`/`<div />` pairing of the key name and its value,
    // and append it to the `result` string created at the start.
  }
  return result; // once the looping is done, `result` will be one long string to put in the email body
}

function valid(mailData) {
  return validateHoneypot(mailData) && validateHashes(mailData) && validateProofOfWork(mailData);
}

function validateHoneypot(mailData) {
  return mailData.honeypot == "";
}

function validateHashes(mailData) {
  return mailData.hashes == HASHES;
}

function validateProofOfWork(mailData) {
  var url = 'https://api.coinhive.com/token/verify';
  var token = mailData["coinhive-captcha-token"].toString().replace(/[\[\]']/g,'');
  var formData = {
    'secret': COINHIVE_SECRET,
    'token': token,
    'hashes': HASHES,
  };
  var options = {
    'method' : 'post',
    'payload' : formData
  };
  var result = UrlFetchApp.fetch(url, options);
  var success = /"success".*:.*true/;
  return success.test(result.getContentText());
}


function doPost(e) {

  try {
    Logger.log(e); // the Google Script version of console.log see: Class Logger


    // shorter name for form data
    var mailData = e.parameters;
    // determine recepient of the email
    // if you have your email uncommented above, it uses that `TO_ADDRESS`
    // otherwise, it defaults to the email provided by the form's data attribute
    var sendEmailTo = (typeof TO_ADDRESS !== "undefined") ? TO_ADDRESS : mailData.formGoogleSendEmail;
    if (!valid(mailData)) {
      Logger.log(validateHoneypot(mailData));
      Logger.log(validateHashes(mailData));
      MailApp.sendEmail({
        to: String(sendEmailTo),
        subject: "Failed validation",
        htmlBody: Logger.getLog()
      });
      return ContentService
            .createTextOutput(JSON.stringify({"result":"error", "error": "Invalid Form"}))
            .setMimeType(ContentService.MimeType.JSON);
    }

    record_data(e);

    // names and order of form elements
    var dataOrder = JSON.parse(e.parameters.formDataNameOrder);

    MailApp.sendEmail({
      to: String(sendEmailTo),
      subject: "New Message from your Website: " + String(mailData.subject),
      replyTo: String(mailData.email),
      htmlBody: formatMailBody(mailData, dataOrder)
    });

    return ContentService    // return json success results
          .createTextOutput(
            JSON.stringify({"result":"success",
                            "data": JSON.stringify(e.parameters) }))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(error) { // if error return this
    Logger.log(error);
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": error}))
          .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * record_data inserts the data received from the html form submission
 * e is the data received from the POST
 */
function record_data(e) {
  Logger.log(JSON.stringify(e)); // log the POST data in case we need to debug it
  try {
    var doc     = SpreadsheetApp.getActiveSpreadsheet();
    var sheet   = doc.getSheetByName(e.parameters.formGoogleSheetName); // select the 'responses' sheet by default
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow()+1; // get next row
    var row     = [ new Date() ]; // first element in the row should always be a timestamp
    // loop through the header columns
    for (var i = 1; i < headers.length; i++) { // start at 1 to avoid Timestamp column
      if(headers[i].length > 0) {
        row.push(e.parameter[headers[i]]); // add data to row
      }
    }
    // more efficient to set values as [][] array than individually
    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
  }
  catch(error) {
    Logger.log(e);
  }
  finally {
    return;
  }

}
