import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isDbConfigured = !!(supabaseUrl && !supabaseUrl.includes('SUA_CHAVE_AQUI') && supabaseKey && !supabaseKey.includes('SUA_CHAVE_AQUI'));

const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isDbConfigured ? supabaseKey : 'placeholder-key'
);

// Configuração do Google Auth com a Service Account
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

// Função para buscar o ID da agenda dinâmica do estúdio no Supabase
async function getDynamicCalendarId(): Promise<string> {
  if (!isDbConfigured) {
    return 'guilhermesuzena10@gmail.com';
  }
  try {
    const { data, error } = await supabase
      .from('studio_config')
      .select('google_calendar_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.google_calendar_id) {
      return data.google_calendar_id;
    }
  } catch (err) {
    console.error("Error fetching dynamic calendarId:", err);
  }
  return 'guilhermesuzena10@gmail.com'; // fallback padrão
}

// Auxiliar para obter a grade de horários atualizada
async function getUpdatedSlots(barberId?: string) {
  let weekdaySlots: any[] = [];
  let dateSpecificSlots: any[] = [];
  if (isDbConfigured) {
    try {
      let queryWd = supabase.from('weekday_slots').select('*');
      if (barberId) queryWd = queryWd.eq('barber_id', barberId);
      const { data: wd } = await queryWd.order('time', { ascending: true });
      if (wd) weekdaySlots = wd;
      
      let queryDs = supabase.from('date_specific_slots').select('*');
      if (barberId) queryDs = queryDs.eq('barber_id', barberId);
      const { data: ds } = await queryDs.order('time', { ascending: true });
      if (ds) dateSpecificSlots = ds;
    } catch (e) {
      console.error("Error fetching updated slots:", e);
    }
  }
  return { weekdaySlots, dateSpecificSlots };
}

function parseDateTimeToSaoPaulo(isoString: string) {
  try {
    const dObj = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(dObj);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    
    return {
      date: `${day}/${month}/${year}`,
      time: `${hour}:${minute}`
    };
  } catch (err) {
    console.error("Error parsing date-time:", err);
    return null;
  }
}

function getServicePrice(service: string): number {
  const cleanSvc = service.toLowerCase().trim();
  
  if (cleanSvc.includes('corte + barba')) return 55;
  if (cleanSvc.includes('degradê') || cleanSvc.includes('degrade')) return 35;
  if (cleanSvc.includes('corte social')) return 25;
  if (cleanSvc.includes('corte na tesoura')) return 20;
  if (cleanSvc.includes('barba')) return 30;
  if (cleanSvc.includes('sobrancelha')) return 15;
  if (cleanSvc.includes('pezinho')) return 20;
  if (cleanSvc.includes('limpeza de pele')) return 15;
  
  return 0;
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Resolve dynamic calendarId from database
  const activeCalendarId = await getDynamicCalendarId();

  try {
    // ----------------------------------------------------
    // GET: Buscar eventos (agendamentos e bloqueios)
    // ----------------------------------------------------
    if (req.method === 'GET' && req.query.action === 'get_slots') {
      if (!isDbConfigured) {
        return res.status(200).json({ slots: [], dateSlots: [], db_disabled: true });
      }
      try {
        const reqBarberId = req.query.barberId as string;
        const filterBarberId = (reqBarberId && reqBarberId !== 'qualquer') ? reqBarberId : undefined;
        const { weekdaySlots, dateSpecificSlots } = await getUpdatedSlots(filterBarberId);
        return res.status(200).json({ slots: weekdaySlots, dateSlots: dateSpecificSlots });
      } catch (err: any) {
        console.error("Error fetching slots:", err);
        return res.status(200).json({ slots: [], dateSlots: [], db_disabled: true });
      }
    }

    if (req.method === 'GET') {
      const now = new Date();
      
      let weekdaySlots: any[] = [];
      let dateSpecificSlots: any[] = [];
      let db_error = !isDbConfigured;

      if (isDbConfigured) {
        try {
          const reqBarberId = req.query.barberId as string;
          const filterBarberId = (reqBarberId && reqBarberId !== 'qualquer') ? reqBarberId : undefined;
          const updated = await getUpdatedSlots(filterBarberId);
          weekdaySlots = updated.weekdaySlots;
          dateSpecificSlots = updated.dateSpecificSlots;
        } catch (err) {
          db_error = true;
          console.warn("Supabase weekday_slots query warning:", err);
        }
      }
      // Período de busca padrão: de 30 dias atrás até 90 dias no futuro
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString();

      if (req.query.realtime === 'true') {
        const reqBarberId = req.query.barberId as string;
        const filterBarberId = (reqBarberId && reqBarberId !== 'qualquer') ? reqBarberId : undefined;

        let queryApp = supabase.from('appointments').select('*').neq('status', 'cancelled');
        if (filterBarberId) {
          queryApp = queryApp.eq('barber_id', filterBarberId);
        }

        const { data: dbEvents, error: dbError } = await queryApp
          .gte('data_hora_inicio', timeMin)
          .lte('data_hora_inicio', timeMax);

        if (dbError) {
          console.error("Supabase query error in realtime check:", dbError);
          return res.status(200).json({ bookings: [], blocks: [], weekdaySlots, dateSpecificSlots, db_disabled: true });
        }

        const bookings: any[] = [];
        const blocks: any[] = [];

        for (const item of dbEvents || []) {
          const parsedStart = parseDateTimeToSaoPaulo(item.data_hora_inicio);
          const parsedEnd = parseDateTimeToSaoPaulo(item.data_hora_fim);

          if (item.status === 'blocked') {
            blocks.push({
              id: item.id,
              date: parsedStart ? parsedStart.date : '',
              allDay: item.duracao_minutos >= 1440,
              start: parsedStart ? parsedStart.time : '',
              end: parsedEnd ? parsedEnd.time : '',
              reason: item.servico_nome || 'Bloqueio',
              barberId: item.barber_id || 'luiz'
            });
          } else {
            bookings.push({
              id: item.id,
              service: item.servico_nome || '',
              price: item.price !== null && item.price !== undefined ? Number(item.price) : getServicePrice(item.servico_nome || ''),
              date: parsedStart ? parsedStart.date : '',
              time: parsedStart ? parsedStart.time : '',
              name: item.cliente_nome || '',
              phone: item.cliente_telefone || '',
              status: item.status,
              barberId: item.barber_id || 'luiz',
              is_plan_usage: item.is_plan_usage,
              is_settled: item.is_settled
            });
          }
        }

        return res.status(200).json({ bookings, blocks, weekdaySlots, dateSpecificSlots, db_disabled: db_error });
      } else {
        // ----------------------------------------------------
        // DATABASE: Consultar registros do Supabase (Dashboard Admin)
        // ----------------------------------------------------
        const reqBarberId = req.query.barberId as string;
        const filterBarberId = (reqBarberId && reqBarberId !== 'qualquer') ? reqBarberId : undefined;
        let queryApp = supabase.from('appointments').select('*').neq('status', 'cancelled');
        if (filterBarberId) {
          queryApp = queryApp.eq('barber_id', filterBarberId);
        }
        const { data: dbEvents, error: dbError } = await queryApp
          .gte('data_hora_inicio', timeMin)
          .lte('data_hora_inicio', timeMax);

        if (dbError) {
          throw dbError;
        }

        const bookings: any[] = [];
        const blocks: any[] = [];

        for (const item of dbEvents || []) {
          const parsedStart = parseDateTimeToSaoPaulo(item.data_hora_inicio);
          const parsedEnd = parseDateTimeToSaoPaulo(item.data_hora_fim);

          if (item.status === 'blocked') {
            blocks.push({
              id: item.id,
              date: parsedStart ? parsedStart.date : '',
              allDay: item.duracao_minutos >= 1440,
              start: parsedStart ? parsedStart.time : '',
              end: parsedEnd ? parsedEnd.time : '',
              reason: item.servico_nome || 'Bloqueio',
              barberId: item.barber_id || 'luiz'
            });
          } else {
            bookings.push({
              id: item.id,
              service: item.servico_nome || '',
              price: item.price !== null && item.price !== undefined ? Number(item.price) : getServicePrice(item.servico_nome || ''),
              date: parsedStart ? parsedStart.date : '',
              time: parsedStart ? parsedStart.time : '',
              name: item.cliente_nome || '',
              phone: item.cliente_telefone || '',
              status: item.status,
              barberId: item.barber_id || 'luiz',
              is_plan_usage: item.is_plan_usage,
              is_settled: item.is_settled
            });
          }
        }

        return res.status(200).json({ bookings, blocks, weekdaySlots, dateSpecificSlots, db_disabled: db_error });
      }
    }

    // ----------------------------------------------------
    // POST: Criar novo evento (agendamento ou bloqueio)
    // ----------------------------------------------------
    if (req.method === 'POST') {
      const { type } = req.body;

      if (type === 'add_slot' || type === 'delete_slot' || type === 'clear_slots' || type === 'copy_slots' ||
          type === 'add_date_slot' || type === 'delete_date_slot' || type === 'clear_date_slots' || type === 'copy_date_slots') {
        if (!isDbConfigured) {
          return res.status(503).json({ error: "Banco de dados desconfigurado. Usando modo offline local." });
        }
      }

      if (type === 'add_slot') {
        const { weekday, time, barberId } = req.body;
        try {
          const { error } = await supabase
            .from('weekday_slots')
            .insert([{ weekday, time, barber_id: barberId }], { onConflict: 'barber_id,weekday,time', ignoreDuplicates: true });
          
          if (error) throw error;
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error adding slot:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'delete_slot') {
        const { weekday, time, barberId } = req.body;
        try {
          const { error } = await supabase
            .from('weekday_slots')
            .delete()
            .eq('weekday', weekday)
            .eq('time', time)
            .eq('barber_id', barberId);
          if (error) throw error;
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error deleting slot:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'clear_slots') {
        const { weekday, barberId } = req.body;
        try {
          const { error } = await supabase
            .from('weekday_slots')
            .delete()
            .eq('weekday', weekday)
            .eq('barber_id', barberId);
          if (error) throw error;
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error clearing slots:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'copy_slots') {
        const { fromWeekday, toWeekdays, barberId } = req.body;
        try {
          const { data: sourceSlots, error: fetchErr } = await supabase
            .from('weekday_slots')
            .select('time')
            .eq('weekday', fromWeekday)
            .eq('barber_id', barberId);
          if (fetchErr) throw fetchErr;
          
          const times = (sourceSlots || []).map(s => s.time);
          
          for (const targetDay of toWeekdays) {
            const { error: delErr } = await supabase
              .from('weekday_slots')
              .delete()
              .eq('weekday', targetDay)
              .eq('barber_id', barberId);
            if (delErr) throw delErr;
            
            if (times.length > 0) {
              const inserts = times.map(time => ({ weekday: targetDay, time, barber_id: barberId }));
              const { error: insErr } = await supabase
                .from('weekday_slots')
                .insert(inserts, { onConflict: 'barber_id,weekday,time', ignoreDuplicates: true });
              if (insErr) throw insErr;
            }
          }
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error copying slots:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'add_date_slot') {
        const { selected_date, time, barberId } = req.body;
        try {
          // Check if any slot exists for this date and barber
          const { data: existing, error: existErr } = await supabase
            .from('date_specific_slots')
            .select('id')
            .eq('selected_date', selected_date)
            .eq('barber_id', barberId)
            .limit(1);

          if (existErr) throw existErr;

          if (!existing || existing.length === 0) {
            // Bulk insert default + the new one if not included
            const defaultSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
            const toInsert = defaultSlots.map(t => ({ selected_date, time: t, barber_id: barberId }));
            if (!defaultSlots.includes(time)) {
              toInsert.push({ selected_date, time, barber_id: barberId });
            }
            const { error: insErr } = await supabase.from('date_specific_slots').insert(toInsert);
            if (insErr) throw insErr;
          } else {
            // Just insert the new one
            const { error: insErr } = await supabase.from('date_specific_slots').insert([{ selected_date, time, barber_id: barberId }]);
            if (insErr && insErr.code !== '23505') throw insErr; // ignore unique violation (23505)
          }

          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error adding date slot:", err);
          return res.status(500).json({ error: err.message || 'Erro interno ao salvar horário' });
        }
      }

      if (type === 'delete_date_slot') {
        const { selected_date, time, barberId } = req.body;
        try {
          const { error } = await supabase
            .from('date_specific_slots')
            .delete()
            .eq('selected_date', selected_date)
            .eq('time', time)
            .eq('barber_id', barberId);
          if (error) throw error;
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error deleting date slot:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'clear_date_slots') {
        const { selected_date, barberId } = req.body;
        try {
          const { error } = await supabase
            .from('date_specific_slots')
            .delete()
            .eq('selected_date', selected_date)
            .eq('barber_id', barberId);
          if (error) throw error;
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error clearing date slots:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      if (type === 'copy_date_slots') {
        const { fromType, fromValue, toDates, barberId } = req.body;
        try {
          let times: string[] = [];
          if (fromType === 'weekday') {
            const { data, error } = await supabase
              .from('weekday_slots')
              .select('time')
              .eq('weekday', Number(fromValue))
              .eq('barber_id', barberId);
            if (error) throw error;
            times = (data || []).map(s => s.time);
          } else {
            const { data, error } = await supabase
              .from('date_specific_slots')
              .select('time')
              .eq('selected_date', fromValue)
              .eq('barber_id', barberId);
            if (error) throw error;
            times = (data || []).map(s => s.time);
          }
          
          for (const targetDate of toDates) {
            const { error: delErr } = await supabase
              .from('date_specific_slots')
              .delete()
              .eq('selected_date', targetDate)
              .eq('barber_id', barberId);
            if (delErr) throw delErr;
            
            if (times.length > 0) {
              const inserts = times.map(time => ({ selected_date: targetDate, time, barber_id: barberId }));
              const { error: insErr } = await supabase
                .from('date_specific_slots')
                .insert(inserts, { onConflict: 'barber_id,selected_date,time', ignoreDuplicates: true });
              if (insErr) throw insErr;
            }
          }
          const updated = await getUpdatedSlots(barberId);
          return res.status(200).json({ success: true, ...updated });
        } catch (err: any) {
          console.error("Error copying date slots:", err);
          return res.status(500).json({ error: err.message });
        }
      }

      const { booking, block, duration } = req.body;

      if (type === 'booking') {
        const id = booking.id;
        const eventId = id.replace(/-/g, '').toLowerCase();

        const [d, m, y] = booking.date.split('/');
        const isoDate = `${y}-${m}-${d}`;
        const startDateTime = `${isoDate}T${booking.time}:00-03:00`;

        const startMs = new Date(startDateTime).getTime();
        const endMs = startMs + (duration || 180) * 60 * 1000;
        const endDateTime = new Date(endMs).toISOString();

        // --- CHECK DOUBLE BOOKING ON SUPABASE ---
        const dayStart = `${isoDate}T00:00:00-03:00`;
        const dayEnd = `${isoDate}T23:59:59-03:00`;

        const { data: existingEvents, error: existingErr } = await supabase
          .from('appointments')
          .select('*')
          .neq('status', 'cancelled')
          .gte('data_hora_inicio', dayStart)
          .lte('data_hora_inicio', dayEnd);

        if (existingErr) throw existingErr;

        const timeToMinutes = (t: string) => {
          const [h, mi] = t.split(':').map(Number);
          return h * 60 + mi;
        };

        const newStart = timeToMinutes(booking.time);
        const newEnd = newStart + (duration || 180);

        for (const existing of existingEvents || []) {
          if (existing.id === id) continue;

          const existingBarber = existing.barber_id || 'luiz';
          if (existingBarber !== booking.barberId) {
            continue;
          }

          const isBlock = existing.status === 'blocked';

          if (isBlock) {
            const allDay = existing.duracao_minutos >= 1440;
            if (allDay) {
              return res.status(409).json({ error: 'slot_occupied', message: 'Este dia está bloqueado para agendamentos.' });
            }
            const blockParsedStart = parseDateTimeToSaoPaulo(existing.data_hora_inicio);
            const blockParsedEnd = parseDateTimeToSaoPaulo(existing.data_hora_fim);
            if (blockParsedStart && blockParsedEnd) {
              const bStart = timeToMinutes(blockParsedStart.time);
              const bEnd = timeToMinutes(blockParsedEnd.time);
              if (Math.max(newStart, bStart) < Math.min(newEnd, bEnd)) {
                return res.status(409).json({ error: 'slot_occupied', message: 'Este horário está em um período bloqueado.' });
              }
            }
          } else {
            const bookingParsedStart = parseDateTimeToSaoPaulo(existing.data_hora_inicio);
            if (bookingParsedStart) {
              const bStart = timeToMinutes(bookingParsedStart.time);
              const bDuration = existing.duracao_minutos;
              const bEnd = bStart + bDuration;

              if (Math.max(newStart, bStart) < Math.min(newEnd, bEnd)) {
                return res.status(409).json({ error: 'slot_occupied', message: 'Este horário já foi agendado por outra pessoa.' });
              }
            }
          }
        }
        // --- END CHECK DOUBLE BOOKING ---

        // --- ABATE AUTOMÁTICO DE PLANOS (BLINDAGEM) ---
        let finalIsPlanUsage = booking.is_plan_usage || false;
        let finalPrice = booking.price || 0;
        let subDataToDeduct = null;

        if (booking.phone) {
          try {
            // Busca se o cliente tem um plano ativo
            const { data: subData, error: subErr } = await supabase
              .from('subscriptions')
              .select('id, used_cuts, total_cuts, plan_type')
              .eq('client_phone', booking.phone.replace(/\D/g, ''))
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!subErr && subData && subData.used_cuts < subData.total_cuts) {
              finalIsPlanUsage = true;
              finalPrice = 0; // Abate do valor
              subDataToDeduct = subData;
            }
          } catch (e) {
            console.error("Erro na verificação automática de planos", e);
          }
        }
        // ----------------------------------------------

        /*
          IMPORTANTE: Se você receber o erro 'new row violates row-level security',
          execute as seguintes queries no SQL Editor do Supabase para liberar as permissões da tabela appointments:

          ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
          CREATE POLICY "Permitir leitura pública" ON appointments FOR SELECT USING (true);
          CREATE POLICY "Permitir inserções públicas" ON appointments FOR INSERT WITH CHECK (true);
          CREATE POLICY "Permitir update público" ON appointments FOR UPDATE USING (true);
          CREATE POLICY "Permitir delete público" ON appointments FOR DELETE USING (true);
        */

        // 1. Inserir no Supabase primeiro
        const { error: insertErr } = await supabase
          .from('appointments')
          .insert({
            id,
            cliente_nome: booking.name,
            cliente_telefone: booking.phone,
            servico_nome: booking.service,
            duracao_minutos: duration || 180,
            data_hora_inicio: startDateTime,
            data_hora_fim: endDateTime,
            status: booking.status || 'accepted',
            google_event_id: eventId,
            barber_id: booking.barberId || 'luiz',
            price: finalPrice,
            is_plan_usage: finalIsPlanUsage
          });

        if (insertErr) {
          console.error("ERRO NO INSERT:", insertErr);
          throw new Error(insertErr.message || "Erro no insert");
        }

        // 1.5. Realizar o desconto do corte na tabela subscriptions
        if (subDataToDeduct) {
          const newUsedCuts = subDataToDeduct.used_cuts + 1;
          let updatedPlanType = subDataToDeduct.plan_type;
          
          try {
            const planData = JSON.parse(subDataToDeduct.plan_type);
            if (planData && planData.services) {
              const services = planData.services;
              const bookedServiceLower = (booking.service || '').toLowerCase();
              
              // Tenta achar qual serviço do plano bate com o agendado
              let matchedKey = '';
              for (const key of Object.keys(services)) {
                if (bookedServiceLower.includes(key.toLowerCase()) || key.toLowerCase().includes(bookedServiceLower)) {
                  matchedKey = key;
                  break;
                }
              }
              
              // Fallback inteligente
              if (!matchedKey) {
                if (bookedServiceLower.includes('social') || bookedServiceLower.includes('degradê') || bookedServiceLower.includes('meia sola') || bookedServiceLower.includes('pigmentação') || bookedServiceLower.includes('luzes')) {
                  if (services['Corte']) matchedKey = 'Corte';
                  else if (services['Meia Sola'] && bookedServiceLower.includes('meia sola')) matchedKey = 'Meia Sola';
                } else if (bookedServiceLower.includes('sobrancelha')) {
                  if (services['Sobrancelha']) matchedKey = 'Sobrancelha';
                } else if (bookedServiceLower.includes('barba')) {
                  if (services['Barba']) matchedKey = 'Barba';
                }
              }
              
              if (matchedKey && services[matchedKey].used < services[matchedKey].total) {
                services[matchedKey].used += 1;
              } else {
                const firstAvailableKey = Object.keys(services).find(k => services[k].used < services[k].total);
                if (firstAvailableKey) {
                  services[firstAvailableKey].used += 1;
                }
              }
              
              updatedPlanType = JSON.stringify(planData);
            }
          } catch (e) {
            // Segue normal caso não seja JSON
          }

          const newStatus = newUsedCuts >= subDataToDeduct.total_cuts ? 'expired' : 'active';
          await supabase
            .from('subscriptions')
            .update({ 
              used_cuts: newUsedCuts, 
              status: newStatus,
              plan_type: updatedPlanType
            })
            .eq('id', subDataToDeduct.id);
        }

        // 2. Criar evento no Google Calendar para espelhamento
        const title = `${booking.service} - ${booking.name}`;
        const barberName = booking.barberId === 'vitinho' ? 'Vitinho' : 'Luiz';
        const planoText = finalIsPlanUsage ? '\n[Pago via Assinatura]' : '';
        const description = `Cliente: ${booking.name}\nContato: ${booking.phone}\nValor: R$ ${finalPrice},00\nBarbeiro: ${barberName}${planoText}`;

        try {
          await calendar.events.insert({
            calendarId: activeCalendarId,
            requestBody: {
              id: eventId,
              summary: title,
              description,
              start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
              end: { dateTime: new Date(endMs).toISOString(), timeZone: 'America/Sao_Paulo' },
              extendedProperties: {
                shared: {
                  id,
                  type: 'booking',
                  service: booking.service,
                  name: booking.name,
                  phone: booking.phone,
                  price: String(finalPrice),
                  status: booking.status,
                  date: booking.date,
                  time: booking.time,
                  barberId: booking.barberId || 'luiz',
                },
              },
            },
          });
        } catch (gErr) {
          console.warn("Failsafe: Falha ao espelhar agendamento no Google Calendar:", gErr);
        }

        return res.status(201).json({ success: true, eventId });
      }

      if (type === 'block') {
        const id = block.id;
        const eventId = id.replace(/-/g, '').toLowerCase();

        const [d, m, y] = block.date.split('/');
        const isoDate = `${y}-${m}-${d}`;

        let startDateTime: string;
        let endDateTime: string;
        let duracao = 1440;

        if (block.allDay) {
          startDateTime = `${isoDate}T00:00:00-03:00`;
          endDateTime = `${isoDate}T23:59:59-03:00`;
        } else {
          startDateTime = `${isoDate}T${block.start}:00-03:00`;
          endDateTime = `${isoDate}T${block.end}:00-03:00`;
          duracao = Math.round((new Date(endDateTime).getTime() - new Date(startDateTime).getTime()) / 60000);
        }

        // 1. Inserir no Supabase
        const { error: insertErr } = await supabase
          .from('appointments')
          .insert({
            id,
            cliente_nome: null,
            cliente_telefone: null,
            servico_nome: block.reason || 'Bloqueio',
            duracao_minutos: duracao,
            data_hora_inicio: startDateTime,
            data_hora_fim: endDateTime,
            status: 'blocked',
            google_event_id: eventId,
            barber_id: block.barberId || 'luiz'
          });

        if (insertErr) {
          console.error("ERRO NO INSERT:", insertErr);
          throw new Error(insertErr.message || "Erro no insert");
        }

        // 2. Criar no Google Calendar
        const title = `Bloqueio - ${block.reason || 'Indisponível'}`;
        let start: any;
        let end: any;

        if (block.allDay) {
          start = { date: isoDate };
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
          dateObj.setDate(dateObj.getDate() + 1);
          const pad = (n: number) => String(n).padStart(2, '0');
          const nextDayStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
          end = { date: nextDayStr };
        } else {
          start = { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' };
          end = { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' };
        }

        try {
          await calendar.events.insert({
            calendarId: activeCalendarId,
            requestBody: {
              id: eventId,
              summary: title,
              description: `Bloqueio de Agenda\nMotivo: ${block.reason}`,
              start,
              end,
              extendedProperties: {
                shared: {
                  id,
                  type: 'block',
                  reason: block.reason,
                  date: block.date,
                  allDay: String(block.allDay),
                  start: block.start || '',
                  end: block.end || '',
                  barberId: block.barberId || 'luiz',
                },
              },
            },
          });
        } catch (gErr) {
          console.warn("Failsafe: Falha ao espelhar bloqueio no Google Calendar:", gErr);
        }

        return res.status(201).json({ success: true, eventId });
      }
    }

    // ----------------------------------------------------
    // PUT: Atualizar evento existente (status/detalhes)
    // ----------------------------------------------------
    if (req.method === 'PUT') {
      const { id, type, booking, block, duration } = req.body;
      const eventId = id.replace(/-/g, '').toLowerCase();

      if (type === 'booking') {
        const [d, m, y] = booking.date.split('/');
        const isoDate = `${y}-${m}-${d}`;
        const startDateTime = `${isoDate}T${booking.time}:00-03:00`;

        const startMs = new Date(startDateTime).getTime();
        const endMs = startMs + (duration || 180) * 60 * 1000;
        const endDateTime = new Date(endMs).toISOString();

        // 1. Atualizar no Supabase
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            cliente_nome: booking.name,
            cliente_telefone: booking.phone,
            servico_nome: booking.service,
            duracao_minutos: duration || 180,
            data_hora_inicio: startDateTime,
            data_hora_fim: endDateTime,
            status: booking.status,
            barber_id: booking.barberId || 'luiz',
            price: booking.price !== undefined ? booking.price : undefined,
            is_plan_usage: booking.is_plan_usage !== undefined ? booking.is_plan_usage : undefined
          })
          .eq('id', id);

        if (updateErr) throw updateErr;

        // 2. Atualizar no Google Calendar
        let suffix = '';
        if (booking.status === 'accepted') suffix = ' [Confirmado]';
        else if (booking.status === 'completed') suffix = ' [Concluído]';

        const title = `${booking.service} - ${booking.name}${suffix}`;
        const barberName = booking.barberId === 'vitinho' ? 'Vitinho' : 'Luiz';
        const description = `Cliente: ${booking.name}\nContato: ${booking.phone}\nValor: R$ ${booking.price},00\nBarbeiro: ${barberName}`;

        try {
          await calendar.events.update({
            calendarId: activeCalendarId,
            eventId,
            requestBody: {
              summary: title,
              description,
              start: { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' },
              end: { dateTime: new Date(endMs).toISOString(), timeZone: 'America/Sao_Paulo' },
              extendedProperties: {
                shared: {
                  id,
                  type: 'booking',
                  service: booking.service,
                  name: booking.name,
                  phone: booking.phone,
                  price: String(booking.price),
                  status: booking.status,
                  date: booking.date,
                  time: booking.time,
                  barberId: booking.barberId || 'luiz',
                },
              },
            },
          });
        } catch (gErr) {
          console.warn("Failsafe: Falha ao atualizar agendamento no Google Calendar:", gErr);
        }

        return res.status(200).json({ success: true });
      }

      if (type === 'block') {
        const [d, m, y] = block.date.split('/');
        const isoDate = `${y}-${m}-${d}`;

        let startDateTime: string;
        let endDateTime: string;
        let duracao = 1440;

        if (block.allDay) {
          startDateTime = `${isoDate}T00:00:00-03:00`;
          endDateTime = `${isoDate}T23:59:59-03:00`;
        } else {
          startDateTime = `${isoDate}T${block.start}:00-03:00`;
          endDateTime = `${isoDate}T${block.end}:00-03:00`;
          duracao = Math.round((new Date(endDateTime).getTime() - new Date(startDateTime).getTime()) / 60000);
        }

        // 1. Atualizar no Supabase
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            servico_nome: block.reason || 'Bloqueio',
            duracao_minutos: duracao,
            data_hora_inicio: startDateTime,
            data_hora_fim: endDateTime,
            barber_id: block.barberId || 'luiz'
          })
          .eq('id', id);

        if (updateErr) throw updateErr;

        // 2. Atualizar no Google Calendar
        const title = `Bloqueio - ${block.reason || 'Indisponível'}`;
        let start: any;
        let end: any;

        if (block.allDay) {
          start = { date: isoDate };
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
          dateObj.setDate(dateObj.getDate() + 1);
          const pad = (n: number) => String(n).padStart(2, '0');
          const nextDayStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
          end = { date: nextDayStr };
        } else {
          start = { dateTime: startDateTime, timeZone: 'America/Sao_Paulo' };
          end = { dateTime: endDateTime, timeZone: 'America/Sao_Paulo' };
        }

        try {
          await calendar.events.update({
            calendarId: activeCalendarId,
            eventId,
            requestBody: {
              summary: title,
              description: `Bloqueio de Agenda\nMotivo: ${block.reason}`,
              start,
              end,
              extendedProperties: {
                shared: {
                  id,
                  type: 'block',
                  reason: block.reason,
                  date: block.date,
                  allDay: String(block.allDay),
                  start: block.start || '',
                  end: block.end || '',
                  barberId: block.barberId || 'luiz',
                },
              },
            },
          });
        } catch (gErr) {
          console.warn("Failsafe: Falha ao atualizar bloqueio no Google Calendar:", gErr);
        }

        return res.status(200).json({ success: true });
      }
    }

    // ----------------------------------------------------
    // DELETE: Excluir evento (agendamento ou bloqueio)
    // ----------------------------------------------------
    if (req.method === 'DELETE') {
      const id = (req.query.id as string) || req.body.id;
      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }
      const eventId = id.replace(/-/g, '').toLowerCase();

      // 1. Excluir do Supabase
      const { error: deleteErr } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      // 2. Excluir do Google Calendar
      try {
        await calendar.events.delete({
          calendarId: activeCalendarId,
          eventId,
        });
      } catch (err: any) {
        console.warn("Failsafe: Falha ao excluir do Google Calendar:", err);
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Failsafe API Error:', error);
    if (req.method === 'GET') {
      return res.status(200).json({ bookings: [], blocks: [], error: error.message || 'Internal Server Error' });
    }
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
