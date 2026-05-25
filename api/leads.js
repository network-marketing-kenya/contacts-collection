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
      const { refUserPhone } = req.query;
      let dbLeads;
      if (refUserPhone) {
        dbLeads = await sql`
          SELECT id, name, country_name as "countryName", country_code as "countryCode", 
                 dial_code as "dialCode", raw_number as "rawNumber", full_number as "fullNumber", 
                 ref_user_phone as "refUserPhone", created_at as "timestamp"
          FROM leads 
          WHERE ref_user_phone = ${refUserPhone}
          ORDER BY created_at DESC
        `;
      } else {
        dbLeads = await sql`
          SELECT id, name, country_name as "countryName", country_code as "countryCode", 
                 dial_code as "dialCode", raw_number as "rawNumber", full_number as "fullNumber", 
                 ref_user_phone as "refUserPhone", created_at as "timestamp"
          FROM leads 
          ORDER BY created_at DESC
        `;
      }
      
      const formattedLeads = dbLeads.map(l => ({
        ...l,
        timestamp: new Date(l.timestamp).toLocaleString()
      }));

      return res.status(200).json(formattedLeads);
    }

    if (method === 'POST') {
      if (action === 'create') {
        const { 
          name, countryName, countryCode, dialCode, 
          rawNumber, fullNumber, refUserPhone 
        } = req.body || {};

        if (!name || !fullNumber) {
          return res.status(400).json({ error: 'Name and phone number are required' });
        }

        const result = await sql`
          INSERT INTO leads (
            name, country_name, country_code, dial_code, 
            raw_number, full_number, ref_user_phone
          )
          VALUES (
            ${name}, ${countryName}, ${countryCode}, ${dialCode}, 
            ${rawNumber}, ${fullNumber}, ${refUserPhone || '254775499650'}
          )
          RETURNING id, created_at
        `;

        return res.status(201).json({ 
          message: 'Lead created successfully', 
          id: result[0].id,
          timestamp: new Date(result[0].created_at).toLocaleString()
        });
      }
    }

    if (method === 'DELETE') {
      if (action === 'clear') {
        await sql`TRUNCATE TABLE leads`;
        return res.status(200).json({ message: 'All leads cleared successfully' });
      }
    }

    return res.status(400).json({ error: 'Invalid method or action' });
  } catch (error) {
    console.error('Leads handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
