const axios = require('axios');

exports.handler = async function(event, context) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Get Kartra API credentials from environment variables
    const KARTRA_API_KEY = process.env.KARTRA_API_KEY;
    const KARTRA_API_PASSWORD = process.env.KARTRA_API_PASSWORD;
    const KARTRA_APP_ID = process.env.KARTRA_APP_ID;

    // Make request to Kartra API to search for lead by email
    const response = await axios.post('https://app.kartra.com/api', {
      api_key: KARTRA_API_KEY,
      api_password: KARTRA_API_PASSWORD,
      app_id: KARTRA_APP_ID,
      cmd: 'search_lead',
      email: email
    });

    // Check if the API call was successful and if lead exists
    if (response.data && response.data.status === 'Success') {
      // Lead exists and has active subscription
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isVerified: true,
          memberData: response.data
        })
      };
    } else {
      // Lead not found or not active
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isVerified: false,
          message: 'Email not found or subscription not active'
        })
      };
    }

  } catch (error) {
    console.error('Error:', error);

    // Handle different types of errors
    if (error.response) {
      // Kartra API returned an error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isVerified: false,
          error: 'Verification failed',
          details: error.response.data
        })
      };
    }

    // General error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
}; 