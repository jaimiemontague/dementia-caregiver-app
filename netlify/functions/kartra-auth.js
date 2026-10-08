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

    // Check if any required environment variables are missing
    if (!KARTRA_API_KEY || !KARTRA_API_PASSWORD || !KARTRA_APP_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication service is not configured' })
      };
    }

    // Make request to Kartra API to get full lead details
    const formData = new URLSearchParams();
    formData.append('api_key', KARTRA_API_KEY);
    formData.append('api_password', KARTRA_API_PASSWORD);
    formData.append('app_id', KARTRA_APP_ID);
    formData.append('get_lead[email]', email);

    const response = await axios.post('https://app.kartra.com/api', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      maxRedirects: 0,
      maxBodyLength: 16 * 1024,
      maxContentLength: 1024 * 1024,
      timeout: 10000
    });

    // Check if the API call was successful and if lead exists
    if (response.data && response.data.status === 'Success' && response.data.lead_details) {
      const leadDetails = response.data.lead_details;
      
      // Check for active memberships
      const memberships = Array.isArray(leadDetails.memberships) ? leadDetails.memberships : [];
      const activeMemberships = memberships.filter(membership =>
        membership.active === "1"
      );
      
      // Determine if user has active subscription (only check memberships)
      const hasActiveSubscription = activeMemberships.length > 0;
      
      if (hasActiveSubscription) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            isVerified: true,
            hasActiveSubscription: true,
            leadId: leadDetails.id,
            email: leadDetails.email,
            message: 'Access granted - active membership found'
          })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            isVerified: true,
            hasActiveSubscription: false,
            leadId: leadDetails.id,
            email: leadDetails.email,
            message: 'Lead found but no active membership'
          })
        };
      }
    } else {
      // Lead not found
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isVerified: false,
          hasActiveSubscription: false,
          message: 'Email not found in system'
        })
      };
    }

  } catch (error) {
    console.error('Kartra verification request failed:', error.message);

    // Handle different types of errors
    if (error.response) {
      // Kartra API returned an error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isVerified: false,
          hasActiveSubscription: false,
          error: 'Verification failed'
        })
      };
    }

    // General error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
