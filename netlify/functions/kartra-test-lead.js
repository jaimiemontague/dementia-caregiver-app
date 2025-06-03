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

    // Lead data
    formData.append('lead[email]', email);
    formData.append('lead[first_name]', 'Test');
    formData.append('lead[last_name]', 'User');

    // Chain create and search commands
    formData.append('actions[0][cmd]', 'create_lead');
    formData.append('actions[1][cmd]', 'search_lead');

    const response = await axios.post('https://app.kartra.com/api', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return { statusCode: 200, headers, body: JSON.stringify(response.data) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}; 