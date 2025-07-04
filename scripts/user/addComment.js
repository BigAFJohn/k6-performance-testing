const http = require('k6/http');
const { check } = require('k6');
const { logInfo, logError } = require('../../utils/logger.js');
const { randomComment } = require('../../utils/faker.js');

function addComment(token, prayerUuid, testimonyUuid) {
  if (!prayerUuid) {
    logError('Comment post skipped: prayerUuid is missing.', { prayerUuid: prayerUuid });
    return;
  }
  if (!testimonyUuid) {
    logError('Comment post skipped: testimonyUuid is missing.', { testimonyUuid: testimonyUuid });
    return;
  }

  const payload = JSON.stringify({
    description: randomComment(),
    prayer_uuid: prayerUuid,
    testimony_uuid: testimonyUuid
  });

  const res = http.post(`${__ENV.BASE_URL}/api/v1/comment`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  logInfo(`[DEBUG Comment] Response Status: ${res.status}`);

  const success = check(res, {
    'Comment post status is 200': (r) => r.status === 200,
    'Comment response includes UUID in data': (r) => {
      try {
        const jsonBody = r.json();
        return jsonBody && jsonBody.data && jsonBody.data.uuid !== undefined;
      } catch (e) {
        logError('Failed to parse comment response JSON or data.uuid not found in check', e);
        return false;
      }
    },
  });

  if (!success) {
    logError('Comment post failed', res);
  } else {
    logInfo('Comment posted successfully');
  }
}

module.exports = { addComment };
