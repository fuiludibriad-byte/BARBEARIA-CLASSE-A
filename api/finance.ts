import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isDbConfigured = !!(supabaseUrl && !supabaseUrl.includes('SUA_CHAVE_AQUI') && supabaseKey && !supabaseKey.includes('SUA_CHAVE_AQUI'));

const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isDbConfigured ? supabaseKey : 'placeholder-key'
);

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isDbConfigured) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { action } = req.query;

  try {
    if (req.method === 'GET' && action === 'get_subscription') {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: 'Phone is required' });

      // Busca assinatura ativa
      const { data, error } = await supabase
        .from('client_subscriptions')
        .select('*')
        .eq('cliente_telefone', phone)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 é no rows found
      
      // Checa se os serviços esgotaram
      if (data && data.services_used >= data.total_services) {
        // Atualizar para exhausted
        await supabase.from('client_subscriptions').update({ status: 'exhausted' }).eq('id', data.id);
        return res.status(200).json({ subscription: null });
      }

      return res.status(200).json({ subscription: data || null });
    }

    if (req.method === 'POST' && action === 'create_subscription') {
      const { cliente_nome, cliente_telefone, plan_name, total_services, price, sold_by } = req.body;
      
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + 30); // 30 dias de validade

      const { data, error } = await supabase
        .from('client_subscriptions')
        .insert({
          cliente_nome,
          cliente_telefone,
          plan_name,
          total_services,
          price,
          sold_by,
          expires_at: expires_at.toISOString(),
          status: 'active'
        })
        .select('*')
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, subscription: data });
    }

    if (req.method === 'GET' && action === 'finance_report') {
      const { period } = req.query; // today, week, month
      
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      if (period === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Inicio da semana (Domingo)
      } else if (period === 'month') {
        startDate.setDate(1); // Inicio do mes
      }

      const startDateIso = startDate.toISOString();
      const endDateIso = new Date().toISOString(); // now

      // Busca appointments
      const { data: appointments, error: appErr } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['accepted', 'completed']) // Apenas confirmados/concluidos
        .gte('data_hora_inicio', startDateIso)
        .lte('data_hora_inicio', endDateIso);

      if (appErr) throw appErr;

      // Busca subscriptions
      const { data: subscriptions, error: subErr } = await supabase
        .from('client_subscriptions')
        .select('*')
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso);

      if (subErr) throw subErr;

      return res.status(200).json({ appointments, subscriptions });
    }

    return res.status(404).json({ error: 'Action not found' });
  } catch (err: any) {
    console.error('Finance API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
