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
        .from('subscriptions')
        .select('*')
        .eq('client_phone', phone)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 é no rows found
      
      // Checa se os serviços esgotaram
      if (data && data.used_cuts >= data.total_cuts) {
        // Atualizar para expired
        await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', data.id);
        return res.status(200).json({ subscription: null });
      }

      return res.status(200).json({ subscription: data || null });
    }

    if (req.method === 'POST' && action === 'create_subscription') {
      const { client_name, client_phone, plan_type, total_cuts, price, barber_id } = req.body;
      
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          client_name,
          client_phone,
          plan_type,
          total_cuts,
          used_cuts: 0,
          price,
          barber_id,
          status: 'active'
        })
        .select('*')
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, subscription: data });
    }

    if (req.method === 'GET' && action === 'finance_report') {
      const { period, startDate: reqStartDate, endDate: reqEndDate } = req.query; // today, week, month, or custom YYYY-MM-DD
      
      let startDateIso = '';
      let endDateIso = '';

      if (reqStartDate && reqEndDate) {
        const [sYear, sMonth, sDay] = (reqStartDate as string).split('-').map(Number);
        const [eYear, eMonth, eDay] = (reqEndDate as string).split('-').map(Number);

        const sD = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const eD = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

        startDateIso = sD.toISOString();
        endDateIso = eD.toISOString();
      } else {
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (period === 'week') {
          startDate.setDate(startDate.getDate() - startDate.getDay()); // Inicio da semana (Domingo)
        } else if (period === 'month') {
          startDate.setDate(1); // Inicio do mes
        }

        startDateIso = startDate.toISOString();
        endDateIso = new Date().toISOString(); // now
      }

      // Busca appointments
      const { data: appointments, error: appErr } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['completed']) // Apenas concluidos
        .gte('data_hora_inicio', startDateIso)
        .lte('data_hora_inicio', endDateIso);

      if (appErr) throw appErr;

      // Busca subscriptions
      const { data: subscriptions, error: subErr } = await supabase
        .from('subscriptions')
        .select('*')
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso);

      if (subErr) throw subErr;

      return res.status(200).json({ appointments, subscriptions });
    }

    if (req.method === 'GET' && action === 'get_commissions') {
      const { data, error } = await supabase.from('barber_commissions').select('*');
      if (error) throw error;
      return res.status(200).json({ commissions: data });
    }

    if (req.method === 'POST' && action === 'update_commission') {
      const { barber_id, barber_name, commission_percentage } = req.body;
      const { error } = await supabase
        .from('barber_commissions')
        .upsert({ barber_id, barber_name, commission_percentage }, { onConflict: 'barber_id' });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET' && action === 'get_all_subscriptions') {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json({ subscriptions: data });
    }

    if (req.method === 'POST' && action === 'deduct_plan') {
      const { subscription_id } = req.body;
      const { data: subData, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscription_id)
        .single();
      
      if (fetchErr) throw fetchErr;
      if (!subData) return res.status(404).json({ error: 'Subscription not found' });
      
      const newUsedCuts = subData.used_cuts + 1;
      const newStatus = newUsedCuts >= subData.total_cuts ? 'expired' : subData.status;

      const { error: updateErr } = await supabase
        .from('subscriptions')
        .update({ used_cuts: newUsedCuts, status: newStatus })
        .eq('id', subscription_id);

      if (updateErr) throw updateErr;
      return res.status(200).json({ success: true, status: newStatus });
    }

    if (req.method === 'POST' && action === 'cancel_plan') {
      const { subscription_id } = req.body;
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', subscription_id);
      
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: 'Action not found' });
  } catch (err: any) {
    console.error('Finance API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
