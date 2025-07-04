import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME,
  DATABASE_USERNAME,
  DATABASE_PASSWORD,
  BASE_URL,
  USER_PASSWORD
} = process.env;

if (!BASE_URL || !USER_PASSWORD || !DATABASE_HOST || !DATABASE_PORT || !DATABASE_NAME || !DATABASE_USERNAME || !DATABASE_PASSWORD) {
  console.error("❌ All database and API environment variables must be defined in your .env file.");
  process.exit(1);
}

const NUM_USERS_TO_PREPARE = 100; // Adjust this number for k6 test needs

async function main() {
  let connection;
  const preparedUsers = [];

  try {
    connection = await mysql.createConnection({
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      user: DATABASE_USERNAME,
      password: DATABASE_PASSWORD,
      database: DATABASE_NAME,
    });
    console.log('✅ Database connection established.');

    for (let i = 0; i < NUM_USERS_TO_PREPARE; i++) {
      const email = `user_loadtest_${Date.now()}_${i}@example.com`;
      console.log(`\n--- Preparing user ${i + 1}/${NUM_USERS_TO_PREPARE}: ${email} ---`);

      // 1. Register User (using Node.js fetch)
      console.log('Attempting user registration...');
      const registerRes = await fetch(`${BASE_URL}/api/v1/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: USER_PASSWORD })
      });

      if (!registerRes.ok) {
        console.error('❌ Registration failed:', await registerRes.text());
        continue;
      }
      console.log('✅ Registration successful.');


      // 3. Poll DB for OTP
      let otp = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 30;
      const RETRY_DELAY = 500;

      console.log(`Starting OTP polling loop for email: ${email}`);
      while (attempts < MAX_ATTEMPTS && !otp) {
        try {
          const [rows] = await connection.query(
            'SELECT otp, otp_date, email, status FROM user WHERE email = ? ORDER BY otp_date DESC LIMIT 1',
            [email]
          );

          if (rows.length > 0 && rows[0].otp) {
            otp = rows[0].otp;
            console.log(`✅ OTP retrieved on attempt ${attempts + 1}: ${otp}`);
            break;
          }
        } catch (err) {
          console.error('❌ Error executing DB query:', err);
        }

        if (!otp) {
          console.log(`⏳ Attempt ${attempts + 1}: OTP not yet available. Retrying in ${RETRY_DELAY}ms.`);
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
        attempts++;
      }

      if (!otp) {
        console.error(`❌ OTP not found for ${email} after all attempts! Skipping user.`);
        continue;
      }
      console.log(`✅ Final OTP retrieved: ${otp}`);

      // 4. Verify OTP (using Node.js fetch)
      console.log('Attempting OTP verification...');
      const otpVerifyPayload = { email, otp };
      const otpVerifyRes = await fetch(`${BASE_URL}/api/v1/user/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpVerifyPayload)
      });

      if (!otpVerifyRes.ok) {
        console.error(`❌ OTP verification failed for ${email}: ${otpVerifyRes.status} - ${await otpVerifyRes.text()}`);
        continue;
      }
      console.log('✅ OTP verification successful.');
      await new Promise((r) => setTimeout(r, 1000));

      // 5. Login User to get JWT Token (using Node.js fetch)
      console.log('Attempting user login to get JWT token...');
      const loginPayload = {
        username: email,
        password: USER_PASSWORD,
        fbmtoken: 'test_fbmtoken_placeholder' // FIX: Provide a non-empty placeholder string for fbmtoken
      };
      const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });

      if (!loginRes.ok) {
        console.error(`❌ Login failed for ${email}: ${loginRes.status} - ${await loginRes.text()}`);
        continue;
      }

      let token = null;
      try {
        const loginBody = await loginRes.json();
        token = loginBody.data.token;
      } catch (e) {
        console.error(`❌ Failed to extract token from login response for ${email}:`, e);
        continue;
      }

      if (!token) {
        console.error(`❌ Login successful for ${email}, but token is null/undefined.`);
        continue;
      }
      console.log('✅ Login successful, token obtained.');

      preparedUsers.push({ email, password: USER_PASSWORD, token });
      console.log(`✅ User ${email} prepared successfully.`);
    }

    const filePath = path.join(__dirname, 'prepared_users.json');
    fs.writeFileSync(filePath, JSON.stringify(preparedUsers, null, 2));
    console.log(`\n🎉 Successfully prepared ${preparedUsers.length} users and saved to ${filePath}`);

  } catch (err) {
    console.error('❌ Fatal error in prepareUsers.js:', err);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed.');
    }
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error in main execution:', err);
  process.exit(1);
});
