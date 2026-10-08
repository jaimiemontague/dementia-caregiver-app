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
    console.log('Received webhook from Kartra');

    // Parse the webhook data from Kartra
    const webhookData = JSON.parse(event.body);

    // Check if this is a subscription cancellation
    if (webhookData.action === 'cancel_subscription') {
      const leadEmail = webhookData.lead.email;
      console.log('Subscription cancellation received');

      // Here you would typically:
      // 1. Mark the user as inactive in your database
      // 2. Send a notification to your app to log them out
      // 3. Send them an email about the cancellation
      
      // For now, we'll just log it
      console.log('Subscription cancellation processed successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'success',
          message: 'Subscription cancellation processed',
          email: leadEmail
        })
      };
    } else {
      console.log(`Received webhook for action: ${webhookData.action}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'ignored',
          message: `Action ${webhookData.action} not handled`
        })
      };
    }

  } catch {
    console.error('Kartra webhook processing failed');

    return {
      statusCode: 200, // Return 200 to acknowledge receipt even on error
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Failed to process webhook'
      })
    };
  }
};
