import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, MessageCircle, Phone, User, Loader2, Edit2, Trash2, X, Check } from 'lucide-react';

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
  
  const [editingClient, setEditingClient] = useState<{
    originalName: string;
    originalPhone: string;
    name: string;
    phone: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: subs } = await supabase.from('subscriptions').select('client_name, client_phone, created_at');
      const { data: apps } = await supabase.from('appointments').select('cliente_nome, cliente_telefone, created_at');
      
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
          const name = (a.cliente_nome || '').trim();
          const phone = (a.cliente_telefone || '').trim();
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

  useEffect(() => {
    fetchClients();
  }, []);

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Aqui é da Barbearia Classe A!`);
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    setIsSaving(true);
    try {
      if (editingClient.name !== editingClient.originalName || editingClient.phone !== editingClient.originalPhone) {
        let subQuery = supabase.from('subscriptions').update({ 
          client_name: editingClient.name, 
          client_phone: editingClient.phone 
        }).eq('client_name', editingClient.originalName);
        if (editingClient.originalPhone) subQuery = subQuery.eq('client_phone', editingClient.originalPhone);
        else subQuery = subQuery.or('client_phone.eq.,client_phone.is.null');
        await subQuery;
        
        let appQuery = supabase.from('appointments').update({ 
          cliente_nome: editingClient.name, 
          cliente_telefone: editingClient.phone 
        }).eq('cliente_nome', editingClient.originalName);
        if (editingClient.originalPhone) appQuery = appQuery.eq('cliente_telefone', editingClient.originalPhone);
        else appQuery = appQuery.or('cliente_telefone.eq.,cliente_telefone.is.null');
        await appQuery;
        
        await fetchClients();
      }
      setEditingClient(null);
    } catch (err) {
      console.error('Erro ao salvar cliente', err);
      alert('Erro ao salvar as edições.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`TEM CERTEZA QUE DESEJA EXCLUIR "${client.name}"?\n\nIsso apagará permanentemente todo o histórico de agendamentos e assinaturas ativas deste cliente do banco de dados.`)) return;
    try {
       let subQuery = supabase.from('subscriptions').delete().eq('client_name', client.name);
       if (client.phone) subQuery = subQuery.eq('client_phone', client.phone);
       else subQuery = subQuery.or('client_phone.eq.,client_phone.is.null');
       await subQuery;
       
       let appQuery = supabase.from('appointments').delete().eq('cliente_nome', client.name);
       if (client.phone) appQuery = appQuery.eq('cliente_telefone', client.phone);
       else appQuery = appQuery.or('cliente_telefone.eq.,cliente_telefone.is.null');
       await appQuery;

       setClients(prev => prev.filter(c => c !== client));
    } catch(err) {
       console.error(err);
       alert('Erro ao excluir cliente.');
    }
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
            <div key={idx} className="flex flex-col bg-card border border-border p-4 rounded-xl hover:border-primary/50 transition-colors group">
              <div className="flex items-center justify-between">
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
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openWhatsApp(client.phone, client.name)}
                    disabled={!client.phone}
                    className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-green-500/10"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Botões de Ação Secundários (Aparecem no Hover em Desktop ou sempre em Mobile mas discretos) */}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border/50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingClient({ originalName: client.name, originalPhone: client.phone, name: client.name, phone: client.phone })}
                  className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(client)}
                  className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhum cliente encontrado na busca.
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Editar Cliente
              </h3>
              <button 
                onClick={() => setEditingClient(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Nome</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={e => setEditingClient(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Telefone</label>
                <input
                  type="text"
                  value={editingClient.phone}
                  onChange={e => setEditingClient(prev => ({ ...prev!, phone: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                  placeholder="(48) 99999-9999"
                />
              </div>
              <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-xl flex gap-3 text-xs">
                <span>⚠️</span>
                <p>Isso atualizará o nome/número deste cliente em todos os agendamentos e assinaturas do sistema.</p>
              </div>
            </div>
            <div className="p-4 border-t border-border flex gap-3 bg-secondary/30">
              <button
                onClick={() => setEditingClient(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editingClient.name.trim()}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
