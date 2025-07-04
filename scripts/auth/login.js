import http from 'k6/http';
import { check } from 'k6'; 
import { logInfo, logError } from '../../utils/logger.js';


// This function is designed to be called by a k6 VU 
export function login(email, password) {
  const BASE_URL = __ENV.BASE_URL; 

  if (!email || !password) {
    logError('Login function called with missing email or password.');
    return null;
  }

  logInfo('Attempting user login...');
  const loginPayload = {
    username: email,
    password: password,
    fbmtoken: 'k6_fbmtoken_placeholder' 
  };

  let loginRes;
  try {
    loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify(loginPayload), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    logError(`An unexpected error occurred during the login process: ${e.message}`, e);
    return null;
  }

  const loginCheck = check(loginRes, {
    'login status is 200': (res) => res.status === 200,
    'login response has token in data': (res) => {
      try {
        const jsonBody = res.json();
        return jsonBody && jsonBody.data && jsonBody.data.token !== undefined;
      } catch (e) {
        logError('Failed to parse login response JSON or data.token not found in login check', e);
        return false;
      }
    },
  });

  if (!loginCheck) {
    logError('Login failed', { status: loginRes.status, body: loginRes.body });
    return null;
  }

  let token = null;
  try {
    token = loginRes.json().data.token;
  } catch (e) {
    logError('Failed to extract token from login response JSON (data.token path)', e);
    return null;
  }

  if (!token) {
    logError('Login successful but token is null or undefined after extraction.', { body: loginRes.body });
    return null;
  }

  logInfo('Login successful, token received.');
  return token;
}
