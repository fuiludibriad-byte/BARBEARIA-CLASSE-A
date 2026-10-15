import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, MessageCircle, Phone, User, Loader2, Edit2, Trash2, X, Check, Sparkles, Send, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  name: string;
  phone: string;
  source: 'appointment' | 'subscription' | 'both';
  lastSeen: string;
}

const DEFAULT_BROADCAST_MSG = "Fala {nome}, tudo bem? Aqui é da Barbearia Classe A! Como está o seu visual para essa semana? Bora garantir seu horário com a gente?";

const QUICK_TEMPLATES = [
  {
    label: '✂️ Lembrete de Corte',
    text: 'Fala {nome}, beleza? Passando pra lembrar que já está na hora de renovar o corte e alinhar o visual! Bora agendar seu horário hoje?'
  },
  {
    label: '🔥 Promoção da Semana',
    text: 'Fala {nome}, tudo bem? Estamos com horários especiais abertos essa semana na Barbearia Classe A! Quer dar aquele talento no visual?'
  },
  {
    label: '⭐ Planos Mensais',
    text: 'E aí {nome}, tudo certo? Sabia que temos planos mensais a partir de R$ 100 com cortes garantidos no mês pra você economizar? Posso te mandar os planos?'
  },
  {
    label: '👋 Olá Padrão',
    text: 'Olá {nome}, tudo bem? Aqui é da Barbearia Classe A! Passando pra desejar uma ótima semana. Precisando alinhar o corte, só chamar!'
  }
];

export default function ClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mensagem customizada de disparo
  const [broadcastMessage, setBroadcastMessage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('classea_broadcast_template') || DEFAULT_BROADCAST_MSG;
    }
    return DEFAULT_BROADCAST_MSG;
  });

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(true);
  const [contactedPhones, setContactedPhones] = useState<Set<string>>(new Set());

  // Edit modal
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
          const key = phone || name;
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

  const handleMessageChange = (newMsg: string) => {
    setBroadcastMessage(newMsg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('classea_broadcast_template', newMsg);
    }
  };

  const insertNameTag = () => {
    if (!broadcastMessage.includes('{nome}')) {
      handleMessageChange(`Olá {nome}, ${broadcastMessage}`);
    } else {
      toast.info('A tag {nome} já está presente na mensagem!');
    }
  };

  const openWhatsApp = (phone: string, fullName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Este cliente não possui telefone válido.');
      return;
    }
    const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Pega o primeiro nome (ex: "João da Silva" -> "João")
    const firstName = fullName.trim().split(' ')[0] || fullName.trim();
    
    let textToSend = (broadcastMessage || DEFAULT_BROADCAST_MSG).trim();
    if (textToSend.includes('{nome}')) {
      textToSend = textToSend.replace(/\{nome\}/g, firstName);
    } else if (textToSend) {
      // Se não tiver {nome}, envia o texto como está
    } else {
      textToSend = `Olá ${firstName}, tudo bem? Aqui é da Barbearia Classe A!`;
    }
    
    const message = encodeURIComponent(textToSend);
    window.open(`https://wa.me/${number}?text=${message}`, '_blank');

    // Marca como disparado nesta sessão
    setContactedPhones(prev => new Set(prev).add(cleanPhone));
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
        toast.success('Cliente atualizado com sucesso!');
      }
      setEditingClient(null);
    } catch (err) {
      console.error('Erro ao salvar cliente', err);
      toast.error('Erro ao salvar as edições.');
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
       toast.success('Cliente excluído com sucesso.');
    } catch(err) {
       console.error(err);
       toast.error('Erro ao excluir cliente.');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 space-y-5 relative max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Base de Clientes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de todos os clientes cadastrados. Digite a mensagem abaixo e dispare com 1 clique!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold border border-primary/20 whitespace-nowrap text-center">
            {clients.length} Clientes
          </div>
          {contactedPhones.size > 0 && (
            <button
              onClick={() => setContactedPhones(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-3 py-2 bg-secondary rounded-xl transition-colors"
              title="Limpar marcações de enviados"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Zerar {contactedPhones.size} disparados
            </button>
          )}
        </div>
      </div>

      {/* Caixa de Mensagem / Chat de Disparo Rápido */}
      <div className="bg-gradient-to-r from-card to-card/70 border border-primary/20 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                Mensagem Padrão de Disparo no WhatsApp
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider">
                  Edite e clique no Whats
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Toda mensagem que você escrever aqui sairá pronta quando clicar no WhatsApp do cliente.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsBroadcastOpen(!isBroadcastOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            {isBroadcastOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isBroadcastOpen && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {/* Modelos Rápidos */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Modelos rápidos:
              </span>
              {QUICK_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMessageChange(tmpl.text)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-secondary/80 hover:bg-primary/20 hover:text-primary text-muted-foreground border border-border/50 transition-all hover:scale-105 active:scale-95"
                >
                  {tmpl.label}
                </button>
              ))}
              <button
                onClick={insertNameTag}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                title="Insere a variável {nome}"
              >
                + Inserir {"{nome}"}
              </button>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={broadcastMessage}
                onChange={(e) => handleMessageChange(e.target.value)}
                rows={3}
                placeholder="Escreva a mensagem que deseja disparar para os clientes..."
                className="w-full bg-background/80 border border-border rounded-xl p-3.5 text-sm text-foreground focus:border-primary outline-none transition-colors resize-none placeholder:text-muted-foreground/40 leading-relaxed font-sans"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground font-mono">
                Dica: {"{nome}"} vira o primeiro nome do cliente
              </span>
            </div>

            {/* Preview ao vivo */}
            <div className="bg-secondary/40 border border-border/40 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2">
              <span className="text-muted-foreground font-semibold flex-shrink-0">Prévia do envio:</span>
              <span className="text-foreground italic truncate">
                "{broadcastMessage.replace(/\{nome\}/g, 'João')}"
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Busca */}
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
          {filteredClients.map((client, idx) => {
            const cleanPhone = (client.phone || '').replace(/\D/g, '');
            const isContacted = contactedPhones.has(cleanPhone);

            return (
              <div 
                key={idx} 
                className={`flex flex-col bg-card border rounded-xl p-4 transition-all group ${
                  isContacted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-foreground text-sm flex items-center gap-2 truncate">
                      {client.name}
                      {client.source === 'subscription' && (
                        <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Assinante</span>
                      )}
                      {client.source === 'both' && (
                        <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">Avulso & Plano</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3" /> {client.phone || 'Sem telefone'}
                    </span>
                  </div>
                  
                  {/* Botão de Disparo WhatsApp */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openWhatsApp(client.phone, client.name)}
                      disabled={!client.phone}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-30 ${
                        isContacted 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/20'
                      }`}
                      title={isContacted ? 'Mensagem já disparada (clique para reenviar)' : 'Disparar mensagem no WhatsApp'}
                    >
                      {isContacted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Enviado</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Botões de Ação Secundários */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50 text-[10px]">
                  <span className="text-muted-foreground/60">
                    {isContacted ? '✓ Contatado nesta sessão' : 'Aguardando envio'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingClient({ originalName: client.name, originalPhone: client.phone, name: client.name, phone: client.phone })}
                      className="flex items-center gap-1 uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="flex items-center gap-1 uppercase font-bold tracking-wider text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">Nome</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={e => setEditingClient(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">Telefone</label>
                <input
                  type="text"
                  value={editingClient.phone}
                  onChange={e => setEditingClient(prev => ({ ...prev!, phone: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                  placeholder="(48) 99999-9999"
                />
              </div>
              <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-3 rounded-xl flex gap-3 text-xs">
                <span>⚠️</span>
                <p>Isso atualizará o nome/número deste cliente em todos os agendamentos e assinaturas do estúdio.</p>
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
