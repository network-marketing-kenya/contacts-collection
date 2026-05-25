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

  try {
    if (method === 'GET') {
      const dbUsers = await sql`SELECT phone, name, status, created_at FROM users ORDER BY created_at DESC`;
      return res.status(200).json(dbUsers);
    }

    if (method === 'POST') {
      if (action === 'toggle') {
        const { phone } = req.body || {};
        if (!phone) {
          return res.status(400).json({ error: 'Phone is required' });
        }

        const user = await sql`SELECT status FROM users WHERE phone = ${phone}`;
        if (user.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const nextStatus = user[0].status === 'active' ? 'suspended' : 'active';
        await sql`UPDATE users SET status = ${nextStatus} WHERE phone = ${phone}`;
        return res.status(200).json({ message: `User status changed to ${nextStatus}`, status: nextStatus });
      }

      if (action === 'create') {
        const { name, phone, password } = req.body || {};
        if (!name || !phone || !password) {
          return res.status(400).json({ error: 'All fields are required' });
        }

        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);

        const existing = await sql`SELECT phone FROM users WHERE phone = ${cleaned}`;
        if (existing.length > 0) {
          return res.status(409).json({ error: 'A user with this number already exists.' });
        }

        await sql`
          INSERT INTO users (phone, name, password, status)
          VALUES (${cleaned}, ${name.trim()}, ${password}, 'active')
        `;
        return res.status(201).json({ message: 'User created successfully' });
      }
    }

    return res.status(400).json({ error: 'Invalid method or action' });
  } catch (error) {
    console.error('Users handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
