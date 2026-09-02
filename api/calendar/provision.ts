import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Configuração do Google Auth com a Service Account Mestra
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// Configuração do Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email_pessoal, nome_do_estudio, email_luiz, email_vitinho } = req.body;

    if (!email_pessoal || !nome_do_estudio || !email_luiz || !email_vitinho) {
      return res.status(400).json({ error: 'Todos os e-mails são obrigatórios.' });
    }

    console.log(`Provisionando agendas duplas para: "${nome_do_estudio}"`);

    // 1. Criar agenda do Luiz
    const calLuiz = await calendar.calendars.insert({
      requestBody: { summary: `${nome_do_estudio} - Luiz`, timeZone: 'America/Sao_Paulo' },
    });
    const idLuiz = calLuiz.data.id;

    // 2. Criar agenda do Vitinho
    const calVit = await calendar.calendars.insert({
      requestBody: { summary: `${nome_do_estudio} - Vitinho`, timeZone: 'America/Sao_Paulo' },
    });
    const idVit = calVit.data.id;

    // 3. Permissões Luiz
    await calendar.acl.insert({ calendarId: idLuiz, requestBody: { role: 'owner', scope: { type: 'user', value: email_pessoal } } });
    await calendar.acl.insert({ calendarId: idLuiz, requestBody: { role: 'writer', scope: { type: 'user', value: email_luiz } } });

    // 4. Permissões Vitinho
    await calendar.acl.insert({ calendarId: idVit, requestBody: { role: 'owner', scope: { type: 'user', value: email_pessoal } } });
    await calendar.acl.insert({ calendarId: idVit, requestBody: { role: 'writer', scope: { type: 'user', value: email_vitinho } } });

    // 5. Salvar no Supabase
    await supabase.from('studio_config').insert([
      { nome_do_estudio, email_pessoal, google_calendar_id: idLuiz, barber_id: 'luiz' },
      { nome_do_estudio, email_pessoal, google_calendar_id: idVit, barber_id: 'vitinho' }
    ]);
    
    console.log(`Agendas isoladas criadas com sucesso.`);
    return res.status(201).json({
      success: true,
      message: 'Agendas criadas e compartilhadas com sucesso!',
      google_calendar_id: idLuiz, // Or an array if needed, but the frontend doesn't use this response field
    });
  } catch (error: any) {
    console.error('Provisioning Error:', error);
    return res.status(500).json({
      error: 'Erro no provisionamento da agenda',
      message: error.message || 'Internal Server Error',
    });
  }
}
