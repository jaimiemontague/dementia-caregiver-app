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
    const KARTRA_API_URL = 'https://app.kartra.com/api/v1';

    // Make request to Kartra API to verify membership
    const response = await axios.post(`${KARTRA_API_URL}/members/verify`, {
      email: email
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${KARTRA_API_KEY}:${KARTRA_API_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    // Return the verification result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isVerified: true,
        memberData: response.data
      })
    };

  } catch (error) {
    console.error('Error:', error);

    // Handle different types of errors
    if (error.response) {
      // Kartra API returned an error
      return {
        statusCode: error.response.status,
        headers,
        body: JSON.stringify({
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