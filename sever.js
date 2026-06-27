const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// DARAJA CREDENTIALS
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const BUSINESS_SHORT_CODE = process.env.MPESA_SHORTCODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

// Get OAuth token
async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// STK Push endpoint
app.post('/api/stk-push', async (req, res) => {
  try {
    const { phone, amount, accountRef, description } = req.body;
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(BUSINESS_SHORT_CODE + PASSKEY + timestamp).toString('base64');

    const payload = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountRef,
      TransactionDesc: description
    };

    const stkRes = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(stkRes.data);
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ errorMessage: err.response?.data?.errorMessage || 'STK failed' });
  }
});

// Callback from Safaricom
app.post('/api/callback', async (req, res) => {
  const callback = req.body.Body.stkCallback;
  const metadata = callback.CallbackMetadata?.Item || [];

  const payment = {
    mpesa_receipt: metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null,
    phone: metadata.find(i => i.Name === 'PhoneNumber')?.Value || null,
    amount: metadata.find(i => i.Name === 'Amount')?.Value || 0,
    transaction_date: metadata.find(i => i.Name === 'TransactionDate')?.Value || null,
    account_ref: callback.AccountReference,
    result_code: callback.ResultCode,
    result_desc: callback.ResultDesc,
    status: callback.ResultCode === 0 ? 'success' : 'failed',
    type: callback.AccountReference?.includes('Escrow') ? 'escrow' :
          callback.AccountReference?.includes('Verified') ? 'verified' : 'boost'
  };

  const { error } = await supabase.from('payments').insert([payment]);
  if (error) console.log('Supabase error:', error);
  else console.log('Payment saved:', payment.mpesa_receipt);

  res.json({ ResultCode: 0, ResultDesc: "Success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Daraja backend running on ${PORT}`));
