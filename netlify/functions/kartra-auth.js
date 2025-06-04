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

    // Debug: Check if environment variables are set
    console.log('Environment variables check:');
    console.log('API Key exists:', !!KARTRA_API_KEY);
    console.log('API Key first 4 chars:', KARTRA_API_KEY ? KARTRA_API_KEY.substring(0, 4) + '...' : 'NONE');
    console.log('Password exists:', !!KARTRA_API_PASSWORD);
    console.log('Password first 4 chars:', KARTRA_API_PASSWORD ? KARTRA_API_PASSWORD.substring(0, 4) + '...' : 'NONE');
    console.log('App ID exists:', !!KARTRA_APP_ID);
    console.log('App ID value:', KARTRA_APP_ID || 'NONE');

    // Check if any required environment variables are missing
    if (!KARTRA_API_KEY || !KARTRA_API_PASSWORD || !KARTRA_APP_ID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing environment variables',
          debug: {
            hasApiKey: !!KARTRA_API_KEY,
            hasPassword: !!KARTRA_API_PASSWORD,
            hasAppId: !!KARTRA_APP_ID
          }
        })
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
      }
    });

    // For debugging - let's see what Kartra actually returns
    console.log('Kartra API Response:', JSON.stringify(response.data, null, 2));

    // Check if the API call was successful and if lead exists
    if (response.data && response.data.status === 'Success' && response.data.lead_details) {
      const leadDetails = response.data.lead_details;
      
      // Check for active memberships
      const activeMemberships = leadDetails.memberships.filter(membership => 
        membership.active === "1"
      );
      
      // Check for active transactions (subscriptions, purchases)
      const activeTransactions = leadDetails.transactions.filter(transaction => 
        transaction.transaction_type === "Sale" || 
        transaction.transaction_type === "Rebill"
      );
      
      // Determine if user has active subscription
      const hasActiveSubscription = activeMemberships.length > 0 || activeTransactions.length > 0;
      
      if (hasActiveSubscription) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            isVerified: true,
            hasActiveSubscription: true,
            leadId: leadDetails.id,
            email: leadDetails.email,
            membershipDetails: {
              memberships: activeMemberships,
              transactions: activeTransactions
            },
            message: 'Access granted - active subscription found'
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
            message: 'Lead found but no active subscription'
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
          message: 'Email not found in system',
          kartraResponse: response.data
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
          hasActiveSubscription: false,
          error: 'Verification failed',
          details: error.response.data,
          debug: 'Kartra API error response'
        })
      };
    }

    // General error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        debug: 'Network or other error'
      })
    };
  }
}; 