import http from 'k6/http';
import { sleep } from 'k6';
import { check } from 'k6';
import { logInfo, logError } from './utils/logger.js';
import { createPrayer } from './scripts/user/createPrayer.js';
import { createTestimony } from './scripts/user/createTestimony.js';
import { addComment } from './scripts/user/addComment.js';
import { login } from './scripts/auth/login.js';
import { SharedArray } from 'k6/data';
import { Trend } from 'k6/metrics'; 

const fullUserJourneyDuration = new Trend('full_user_journey_duration'); 

// Load pre-created users from the JSON file
const usersData = new SharedArray('PreparedUsers', function () {
  const filePath = `./prepared_users.json`;
  const rawData = JSON.parse(open(filePath));
  return rawData;
});

const BASE_URL = __ENV.BASE_URL;

if (!BASE_URL) {
  throw new Error('❌ BASE_URL is not defined. Ensure it is passed via --env flag.');
}

export const options = {
  stages: [
    { duration: '1m', target: 1 },
    { duration: '5m', target: 1},
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    'http_req_failed{scenario:default}': ['rate<0.01'],
    'full_user_journey_duration': ['p(95)<10000'], // Example threshold: 95% of full journeys under 10 seconds
  },
  summaryFile: 'k6_results.json',
};


export default function () {
  const startTime = Date.now(); 

  try {
    const userIndex = (__VU - 1 + __ITER) % usersData.length;
    const user = usersData[userIndex];

    if (!user) {
      logError(`No user data found for VU ${__VU}, iteration ${__ITER}. Check prepared_users.json and NUM_USERS_TO_PREPARE.`);
      return;
    }

    const { email, password } = user;

    logInfo(`Starting test iteration for email: ${email}`);

    logInfo(`[DEBUG k6] Using EMAIL: "${email}"`);

    const token = login(email, password);

    if (!token) {
      logError('Login failed, skipping post-login actions.');
      return;
    }
    logInfo(`[DEBUG k6] Login successful, token received (first 10 chars): "${token.substring(0, 10)}..."`);


    // Run Post-Login Actions
    logInfo('Running post-login actions...');
    const prayerUuid = createPrayer(token);
    if (!prayerUuid) {
      logError('Skipping testimony and comment creation due to failed prayer creation.');
      return;
    }
    logInfo(`Prayer created with UUID: ${prayerUuid}`);

    const testimonyUuid = createTestimony(token, prayerUuid);
    if (!testimonyUuid) {
      logError('Skipping comment creation due to failed testimony creation.');
      return;
    }
    logInfo(`Testimony created with UUID: ${testimonyUuid}`);

    addComment(token, prayerUuid, testimonyUuid);
    logInfo('Post-login actions completed.');

  } catch (e) {
    if (e instanceof Error) {
      logError(`An unexpected error occurred during the test flow: ${e.message}`, {
        name: e.name,
        stack: e.stack,
      });
    } else if (e && typeof e === 'object' && 'status' in e && 'body' in e) {
      logError(`An unexpected HTTP error occurred:`, { status: e.status, body: e.body });
    } else {
      logError('An unexpected error occurred during the test flow (non-Error object)', JSON.stringify(e));
    }
    return;
  } finally { 
    const endTime = Date.now();
    fullUserJourneyDuration.add(endTime - startTime); 
  }
}
