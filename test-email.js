// Quick test to verify Resend API works
const apiKey = 're_Tc8G694F_K4TSfSazxUJKMxH1n3WcgB2J';

console.log('🧪 Testing Resend API...');
console.log('API Key:', apiKey.substring(0, 10) + '...');

async function testEmail() {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HITXLAB Test <onboarding@resend.dev>',
        to: 'hixlabadmin@gmail.com',
        subject: '🧪 Email Test from HITXLAB Moderation',
        html: `
          <h1>Email Test Successful!</h1>
          <p>If you're reading this, Resend API is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('Result:', result);
    } else {
      console.error('❌ Email failed:');
      console.error('Status:', response.status);
      console.error('Error:', result);
    }
  } catch (error) {
    console.error('❌ Request failed:');
    console.error('Error:', error.message);
  }
}

testEmail();
