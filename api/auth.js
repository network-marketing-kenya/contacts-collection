import { sql } from './db.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;
  const { action } = req.query;

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, password } = req.body || {};

    if (action === 'login') {
      if (!phone || !password) {
        return res.status(400).json({ error: 'Phone and password are required' });
      }

      let cleanedPhone = phone.trim().replace(/\D/g, '');
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.substring(1);
      }

      // Check Super Admin
      if (cleanedPhone === '254775499650' && password === 'admin123') {
        return res.status(200).json({ name: 'Super Admin', phone: '254775499650', role: 'admin' });
      }

      // Lookup in DB
      const dbUsers = await sql`SELECT * FROM users WHERE phone = ${cleanedPhone}`;
      if (dbUsers.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      }

      const user = dbUsers[0];
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your downline dashboard has been suspended. Contact Super Admin Tonny.' });
      }

      return res.status(200).json({ name: user.name, phone: user.phone, status: user.status, role: 'user' });
    }

    if (action === 'register') {
      if (!name || !phone || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      let cleanedPhone = phone.trim().replace(/\D/g, '');
      if (cleanedPhone.startsWith('0')) {
        cleanedPhone = cleanedPhone.substring(1);
      }

      // Check if user already exists
      const existing = await sql`SELECT phone FROM users WHERE phone = ${cleanedPhone}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this phone number already exists.' });
      }

      // Insert new user
      await sql`
        INSERT INTO users (phone, name, password, status)
        VALUES (${cleanedPhone}, ${name.trim()}, ${password}, 'active')
      `;

      return res.status(201).json({ message: 'User registered successfully' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Auth handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
