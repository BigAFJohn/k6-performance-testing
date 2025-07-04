import http from 'k6/http';
import { check } from 'k6';
import { logInfo, logError } from '../../utils/logger.js';
import { randomPrayerDescription } from '../../utils/faker.js'; 

function generateUniquePrayerTitle() {
  return `Prayer Request ${Date.now()}`;
}

export function createPrayer(token) {
  const payload = JSON.stringify({
    title: generateUniquePrayerTitle(), 
    description: randomPrayerDescription(),
  });

  const res = http.post(`${__ENV.BASE_URL}/api/v1/prayer`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  logInfo(`[DEBUG Prayer] Response Status: ${res.status}`);

  const success = check(res, {
    'Prayer creation status is 200': (r) => r.status === 200,
    'Prayer response includes UUID in data': (r) => {
      try {
        const jsonBody = r.json();
        return jsonBody && jsonBody.data && jsonBody.data.uuid !== undefined;
      } catch (e) {
        logError('Failed to parse prayer response JSON or data.uuid not found in check', e);
        return false;
      }
    },
  });

  if (!success) {
    logError('Prayer creation failed', res);
    return null;
  } else {
    logInfo('Prayer created successfully');
    try {
      const jsonBody = res.json();
      if (jsonBody && jsonBody.data && jsonBody.data.uuid) {
        return jsonBody.data.uuid;
      } else {
        logError('Failed to extract UUID from successful prayer response: data.uuid is missing', res.body);
        return null;
      }
    } catch (e) {
      logError('Failed to parse JSON when extracting UUID from prayer response', e);
      return null;
    }
  }
}
