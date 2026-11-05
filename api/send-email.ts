import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { to, name, beatTitle, producer, producerEmail, licenseName, price } = req.body;

    // 1. Send email to BUYER
    const buyerEmail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Octave <noreply@hitxlab.com.ng>',
        to,
        subject: `Your beat license is ready — ${beatTitle}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:560px;margin:40px auto;background:#13131e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="margin:0 0 20px;font-size:24px;color:#d4a017;">🎉 Your Purchase is Ready!</h1>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.7);">Hey ${name},</p>
    <p style="margin:0 0 30px;color:rgba(255,255,255,0.7);">Your purchase of "${beatTitle}" by ${producer} was successful!</p>
    
    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:30px;">
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">License:</p>
      <p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#d4a017;">${licenseName}</p>
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">Amount Paid:</p>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#d4a017;">₦${price.toLocaleString()}</p>
    </div>
    
    <a href="https://hitxlab.com.ng/dashboard/library" style="display:inline-block;background:#d4a017;color:#000;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;margin-bottom:20px;">
      Download Your Files →
    </a>
    
    <p style="margin:30px 0 0;font-size:12px;color:rgba(255,255,255,0.4);text-align:center;">
      © ${new Date().getFullYear()} Octave · hitxlab.com.ng
    </p>
  </div>
</body>
</html>`,
      }),
    });

    // 2. Send email to PRODUCER
    let producerEmailResult = null;
    if (producerEmail) {
      producerEmailResult = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Octave <noreply@hitxlab.com.ng>',
          to: producerEmail,
          subject: `🎉 You Made a Sale! ${beatTitle}`,
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b0b12;font-family:Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:560px;margin:40px auto;background:#13131e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
    <h1 style="margin:0 0 20px;font-size:24px;color:#d4a017;">💰 You Made a Sale!</h1>
    <p style="margin:0 0 20px;color:rgba(255,255,255,0.7);">Hey ${producer},</p>
    <p style="margin:0 0 30px;color:rgba(255,255,255,0.7);">Great news! Someone just purchased your beat "${beatTitle}"!</p>
    
    <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:30px;">
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">Beat:</p>
      <p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#fff;">${beatTitle}</p>
      
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">Buyer:</p>
      <p style="margin:0 0 20px;font-size:16px;font-weight:bold;color:#fff;">${name}</p>
      
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">License:</p>
      <p style="margin:0 0 20px;font-size:16px;color:#d4a017;">${licenseName}</p>
      
      <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:13px;">Sale Amount:</p>
      <p style="margin:0;font-size:28px;font-weight:bold;color:#d4a017;">₦${price.toLocaleString()}</p>
    </div>
    
    <a href="https://hitxlab.com.ng/producer/dashboard?tab=orders" style="display:inline-block;background:#d4a017;color:#000;font-weight:bold;padding:14px 32px;border-radius:10px;text-decoration:none;margin-bottom:20px;">
      View Order Details →
    </a>
    
    <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">
      Keep creating amazing beats! 🎵
    </p>
    
    <p style="margin:30px 0 0;font-size:12px;color:rgba(255,255,255,0.4);text-align:center;">
      © ${new Date().getFullYear()} Octave · hitxlab.com.ng
    </p>
  </div>
</body>
</html>`,
        }),
      });
    }

    const buyerData = await buyerEmail.json();

    if (!buyerEmail.ok) {
      console.error('Buyer email error:', buyerData);
      return res.status(buyerEmail.status).json({ error: buyerData });
    }

    return res.status(200).json({ 
      success: true, 
      buyer: buyerData,
      producer: producerEmailResult ? await producerEmailResult.json() : 'No producer email provided'
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
