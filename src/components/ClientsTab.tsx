import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, MessageCircle, Phone, User, Loader2 } from 'lucide-react';

interface Client {
  name: string;
  phone: string;
  source: 'appointment' | 'subscription' | 'both';
  lastSeen: string;
}

export default function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const { data: subs } = await supabase.from('subscriptions').select('client_name, client_phone, created_at');
        const { data: apps } = await supabase.from('appointments').select('name, phone, created_at');
        
        const clientMap = new Map<string, Client>();
        
        // Process subscriptions
        if (subs) {
          subs.forEach(s => {
            const name = (s.client_name || '').trim();
            const phone = (s.client_phone || '').trim();
            if (!name) return;
            const key = phone || name; // Use phone as unique key if possible, else name
            if (!clientMap.has(key)) {
              clientMap.set(key, { name, phone, source: 'subscription', lastSeen: s.created_at });
            } else {
              const existing = clientMap.get(key)!;
              if (new Date(s.created_at) > new Date(existing.lastSeen)) {
                existing.lastSeen = s.created_at;
              }
              existing.source = 'both';
            }
          });
        }
        
        // Process appointments
        if (apps) {
          apps.forEach(a => {
            const name = (a.name || '').trim();
            const phone = (a.phone || '').trim();
            if (!name) return;
            const key = phone || name;
            if (!clientMap.has(key)) {
              clientMap.set(key, { name, phone, source: 'appointment', lastSeen: a.created_at });
            } else {
              const existing = clientMap.get(key)!;
              if (new Date(a.created_at) > new Date(existing.lastSeen)) {
                existing.lastSeen = a.created_at;
              }
              if (existing.source === 'subscription') existing.source = 'both';
            }
          });
        }
        
        const sorted = Array.from(clientMap.values()).sort((a, b) => {
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        });
        
        setClients(sorted);
      } catch (err) {
        console.error('Erro ao buscar clientes', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClients();
  }, []);

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Aqui é da Barbearia Classe A!`);
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Base de Clientes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de todos os clientes que já agendaram ou assinaram planos
          </p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold border border-primary/20 whitespace-nowrap text-center">
          {clients.length} Clientes Cadastrados
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar cliente por nome ou número..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-3 pl-12 pr-4 text-sm text-foreground focus:border-primary outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredClients.map((client, idx) => (
            <div key={idx} className="flex items-center justify-between bg-card border border-border p-4 rounded-xl hover:border-primary/50 transition-colors">
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                  {client.name}
                  {client.source === 'subscription' && (
                    <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">Assinante</span>
                  )}
                  {client.source === 'both' && (
                    <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">Avulso & Plano</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {client.phone || 'Sem telefone'}
                </span>
              </div>
              
              <button
                onClick={() => openWhatsApp(client.phone, client.name)}
                disabled={!client.phone}
                className="p-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-green-500/10"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhum cliente encontrado na busca.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
