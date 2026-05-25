import { sql } from './db.js';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { phone } = req.query;
  if (!phone) {
    return res.status(200).json({ name: 'Tonny', phone: '254775499650' });
  }

  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  try {
    // Lookup user in DB
    const dbUser = await sql`SELECT name, phone FROM users WHERE phone = ${cleaned} OR phone = ${'254' + cleaned}`;
    if (dbUser.length > 0) {
      return res.status(200).json({ name: dbUser[0].name, phone: dbUser[0].phone });
    }
    
    // Fallback
    return res.status(200).json({ name: 'Tonny', phone: cleaned });
  } catch (error) {
    console.error('Referrer endpoint error:', error);
    return res.status(200).json({ name: 'Tonny', phone: phone });
  }
}
