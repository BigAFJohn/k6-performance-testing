const http = require('k6/http');
const { check } = require('k6');
const { logInfo, logError } = require('../../utils/logger.js');
const { randomTestimony } = require('../../utils/faker.js');

function createTestimony(token, prayerUuid) {
  if (!prayerUuid) {
    logError('Testimony creation skipped: prayerUuid is missing.', { prayerUuid: prayerUuid });
    return null;
  }

  const payload = JSON.stringify({
    prayer_uuid: prayerUuid,
    testimony: randomTestimony(),
  });

  const res = http.post(`${__ENV.BASE_URL}/api/v1/testimony`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  logInfo(`[DEBUG Testimony] Response Status: ${res.status}`);

  const success = check(res, {
    'Testimony submission status is 200': (r) => r.status === 200,
    'Testimony response includes UUID in data': (r) => {
      try {
        const jsonBody = r.json();
        return jsonBody && jsonBody.data && jsonBody.data.uuid !== undefined;
      } catch (e) {
        logError('Failed to parse testimony response JSON or data.uuid not found in check', e);
        return false;
      }
    },
  });

  if (!success) {
    logError('Testimony submission failed', res);
    return null;
  } else {
    logInfo('Testimony submitted successfully');
    try {
      const jsonBody = res.json();
      if (jsonBody && jsonBody.data && jsonBody.data.uuid) {
        return jsonBody.data.uuid;
      } else {
        logError('Failed to extract UUID from successful testimony response: data.uuid is missing', res.body);
        return null;
      }
    } catch (e) {
      logError('Failed to parse JSON when extracting UUID from testimony response', e);
      return null;
    }
  }
}

module.exports = { createTestimony };
