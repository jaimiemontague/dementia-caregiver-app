const axios = require('axios');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body);
    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
    }

    const KARTRA_API_KEY = process.env.KARTRA_API_KEY;
    const KARTRA_API_PASSWORD = process.env.KARTRA_API_PASSWORD;
    const KARTRA_APP_ID = process.env.KARTRA_APP_ID;

    const formData = new URLSearchParams();
    formData.append('api_key', KARTRA_API_KEY);
    formData.append('api_password', KARTRA_API_PASSWORD);
    formData.append('app_id', KARTRA_APP_ID);

    // Use get_lead to retrieve full lead details including transactions/memberships
    formData.append('get_lead[email]', email);

    const response = await axios.post('https://app.kartra.com/api', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('Full lead details:', JSON.stringify(response.data, null, 2));

    return { statusCode: 200, headers, body: JSON.stringify(response.data) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}; 