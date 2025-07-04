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

console.log("✅ Environment variables loaded successfully.");

const NUM_USERS_TO_PREPARE = 1; // Adjust this number as needed

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

      try {
        // Register user
        const registerRes = await fetch(`${BASE_URL}/api/v1/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: USER_PASSWORD })
        });
        if (!registerRes.ok) throw new Error(`Registration failed: ${await registerRes.text()}`);
        console.log('✅ Registration successful.');

        // Poll for OTP
        let otp = null, attempts = 0;
        while (attempts < 30 && !otp) {
          const [rows] = await connection.query(
            'SELECT otp FROM user WHERE email = ? ORDER BY otp_date DESC LIMIT 1',
            [email]
          );
          if (rows.length > 0 && rows[0].otp) {
            otp = rows[0].otp;
            console.log(`✅ OTP retrieved: ${otp}`);
          } else {
            console.log(`⏳ Waiting for OTP (${attempts + 1}/30)`);
            await new Promise(r => setTimeout(r, 500));
          }
          attempts++;
        }
        if (!otp) throw new Error(`OTP not found for ${email}`);

        // Verify OTP
        const otpVerifyRes = await fetch(`${BASE_URL}/api/v1/user/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });
        if (!otpVerifyRes.ok) throw new Error(`OTP verification failed: ${await otpVerifyRes.text()}`);
        console.log('✅ OTP verification successful.');

        // Login to get JWT token
        const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: email,
            password: USER_PASSWORD,
            fbmtoken: `fbm_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          })
        });
        if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
        const loginBody = await loginRes.json();
        const token = loginBody?.data?.token;
        if (!token) throw new Error(`Token not found in login response.`);

        preparedUsers.push({ email, password: USER_PASSWORD, token });
        console.log(`✅ User ${email} prepared successfully.`);
      } catch (e) {
        console.error(`❌ Error preparing user ${email}:`, e.message);
      }
    }

    if (preparedUsers.length === 0) {
      console.error("❌ No users were prepared successfully. Exiting with failure.");
      process.exit(1);
    }

    const filePath = path.join(__dirname, 'prepared_users.json');
    fs.writeFileSync(filePath, JSON.stringify(preparedUsers, null, 2));
    console.log(`🎉 Successfully prepared ${preparedUsers.length} users and saved to ${filePath}`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed.');
    }
  }
}

main().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
