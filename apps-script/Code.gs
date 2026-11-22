function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('API_SECRET');
  const spreadsheetId = properties.getProperty('SHEET_ID') || '1UIP3E1Yd4L77vEjNyKWYA2eR_bcdVLyYuqxEOU3YfC0';
  const sheetGid = Number(properties.getProperty('SHEET_GID') || 1740799887);
  const capacity = Number(properties.getProperty('CAPACITY') || 120);

  let request;
  try {
    request = JSON.parse(event.postData.contents);
  } catch (error) {
    return json({ ok: false, message: 'Invalid request.' });
  }

  if (!request || typeof request !== 'object' || !secret || request.secret !== secret || !spreadsheetId || !Number.isInteger(sheetGid) || !Number.isInteger(capacity) || capacity < 1) {
    return json({ ok: false, message: 'Registration service is not configured.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheets().find((tab) => tab.getSheetId() === sheetGid);
    if (!sheet) throw new Error('Configured sheet tab was not found.');
    ensureHeader(sheet);
    const lastRow = sheet.getLastRow();
    const registrationCount = Math.max(0, lastRow - 1);

    if (request.action === 'availability') {
      return json({ ok: true, capacity: capacity, registered: registrationCount, remaining: Math.max(0, capacity - registrationCount) });
    }

    if (request.action !== 'register' || !validRegistration(request.registration)) {
      return json({ ok: false, message: 'Invalid registration details.' });
    }

    const registration = request.registration;
    if (lastRow > 1) {
      const names = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
      const phones = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues().flat();
      const identityNumbers = sheet.getRange(2, 7, lastRow - 1, 1).getDisplayValues().flat();
      const identityTypes = sheet.getRange(2, 8, lastRow - 1, 1).getDisplayValues().flat();
      const normalizedName = normalizeName(registration.fullName);
      for (let index = 0; index < registrationCount; index++) {
        if ((identityNumbers[index] === registration.identityNumber && identityTypes[index] === registration.identityType && normalizeName(names[index]) === normalizedName)
          || (normalizeName(names[index]) === normalizedName && phones[index] === registration.phone)) {
          return json({ ok: false, code: 'duplicate' });
        }
      }
    }

    if (registrationCount >= capacity) {
      return json({ ok: false, code: 'full', capacity: capacity });
    }

    const row = [new Date().toISOString(), registration.fullName, registration.phone, registration.vocalPart, registration.churchMinistry, true, registration.identityNumber, registration.identityType];
    const target = sheet.getRange(lastRow + 1, 1, 1, row.length);
    target.setNumberFormat('@');
    target.setValues([row]);

    const registered = registrationCount + 1;
    return json({ ok: true, capacity: capacity, registered: registered, remaining: Math.max(0, capacity - registered) });
  } catch (error) {
    return json({ ok: false, message: 'Registration is temporarily unavailable.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Created At', 'Full Name', 'WhatsApp Number', 'Vocal Part', 'Church / Ministry', 'Committed', 'Identity Document Number', 'Identity Document Type']);
  } else {
    const identityHeader = sheet.getRange(1, 7).getValue();
    if (identityHeader === 'Registrant Identity Fingerprint' || identityHeader === 'National ID Fingerprint') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 7, lastRow - 1, 1).clearContent();
      }
      sheet.getRange(1, 7).setValue('Identity Document Number');
    } else if (sheet.getLastColumn() < 7 || !identityHeader) {
      sheet.getRange(1, 7).setValue('Identity Document Number');
    }
    if (sheet.getLastColumn() < 8 || !sheet.getRange(1, 8).getValue()) {
      sheet.getRange(1, 8).setValue('Identity Document Type');
    }
  }
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function validRegistration(registration) {
  if (!registration || typeof registration !== 'object') return false;
  return typeof registration.fullName === 'string' && registration.fullName.length > 0 && registration.fullName.length <= 160
    && typeof registration.phone === 'string' && /^\+[1-9][0-9]{7,14}$/.test(registration.phone)
    && ['national_id', 'guardian_national_id', 'passport'].includes(registration.identityType)
    && typeof registration.identityNumber === 'string'
    && (registration.identityType === 'passport' ? /^[A-Z0-9]{5,20}$/.test(registration.identityNumber) : /^[0-9]{7,10}$/.test(registration.identityNumber))
    && ['Soprano', 'Alto', 'Tenor', 'Bass', 'Unsure'].includes(registration.vocalPart)
    && typeof registration.churchMinistry === 'string' && registration.churchMinistry.length <= 200
    && registration.committed === true;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}