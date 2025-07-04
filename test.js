const http = require('k6/http');
const { sleep } = require('k6');
const { check } = require('k6');
const { SharedArray } = require('k6/data');
const { Trend } = require('k6/metrics');

const { logInfo, logError } = require('./utils/logger.js');
const { createPrayer } = require('./scripts/user/createPrayer.js');
const { createTestimony } = require('./scripts/user/createTestimony.js');
const { addComment } = require('./scripts/user/addComment.js');
const { login } = require('./scripts/auth/login.js');

const fullUserJourneyDuration = new Trend('full_user_journey_duration');

const usersData = new SharedArray('PreparedUsers', function () {
    const filePath = `./prepared_users.json`;
    const rawData = JSON.parse(open(filePath));
    return rawData;
});

const BASE_URL = __ENV.BASE_URL;

if (!BASE_URL) {
    throw new Error('❌ BASE_URL is not defined. Ensure it is passed via --env flag.');
}

exports.options = {
    stages: [
        { duration: '1m', target: 1 },
        { duration: '5m', target: 1 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        'http_req_failed{scenario:default}': ['rate<0.01'],
        'full_user_journey_duration': ['p(95)<10000'],
    },
    summaryFile: 'k6_results.json',
};

exports.default = function () {
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

        const token = login(email, password);
        if (!token) {
            logError('Login failed, skipping post-login actions.');
            return;
        }

        logInfo(`Login successful for: ${email}`);

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
};
