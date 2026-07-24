import { useState, useEffect } from 'react';
import { BARBERS, PLAN_OPTIONS, Subscription } from '@/lib/types';
import { Gift, CheckCircle, Loader2, Search, Trash2, Minus, CalendarX2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SubscriptionsTab() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PLAN_OPTIONS[0].id);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customServices, setCustomServices] = useState<number>(1);
  const [soldBy, setSoldBy] = useState<string>(BARBERS[0].id);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'expired' | 'canceled' | 'all'>('active');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const selectedPlan = PLAN_OPTIONS.find(p => p.id === selectedPlanId);
  const isCustom = selectedPlanId === 'plan-custom';

  const fetchSubscriptions = () => {
    setLoadingSubs(true);
    fetch('/api/finance?action=get_all_subscriptions')
      .then(res => res.json())
      .then(data => {
        setSubscriptions(data.subscriptions || []);
      })
      .catch(err => {
        console.error('Error fetching subscriptions:', err);
        setSubscriptions([]);
      })
      .finally(() => setLoadingSubs(false));
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSell = () => {
    if (!nome.trim() || !telefone.trim() || !selectedPlan) return;

    const payload = {
      client_name: nome.trim(),
      client_phone: telefone.replace(/\D/g, ''), // apenas numeros
      plan_type: isCustom ? 'custom' : (selectedPlan.name.toLowerCase().includes('quinzenal') ? 'quinzenal' : 'mensal'),
      total_cuts: isCustom ? customServices : selectedPlan.totalServices,
      price: isCustom ? customPrice : selectedPlan.price,
      barber_id: soldBy
    };

    setIsSubmitting(true);
    fetch('/api/finance?action=create_subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShowSuccess(true);
          setNome('');
          setTelefone('');
          fetchSubscriptions();
          setTimeout(() => setShowSuccess(false), 3000);
        }
      })
      .catch(console.error)
      .finally(() => setIsSubmitting(false));
  };

  const handleDeduct = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/finance?action=deduct_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: id })
      });
      const data = await res.json();
      if (data.success) {
        if (data.status === 'expired') {
          alert('Último corte utilizado! Plano finalizado com sucesso.');
        }
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar e apagar este plano?')) return;
    setProcessingId(id);
    try {
      const res = await fetch('/api/finance?action=cancel_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription_id: id })
      });
      if (res.ok) {
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSubscriptions = (subscriptions || []).filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.client_name.toLowerCase().includes(q) || s.client_phone.includes(q);
    }
    return true;
  });

  const getBarberName = (id: string) => BARBERS.find(b => b.id === id)?.name || id;

  return (
    <div className="p-4 space-y-8 max-w-4xl mx-auto">
      {/* SEÇÃO DE VENDA */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Venda de Assinaturas
          </h2>
          <p className="text-muted-foreground">Cadastre novos planos mensais para os clientes</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-2xl space-y-4">
          {showSuccess && (
            <div className="bg-primary/20 text-primary p-4 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle className="w-5 h-5" /> Plano vendido e registrado com sucesso!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Nome do Cliente</label>
              <input 
                type="text" 
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl p-4 outline-none text-foreground"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Telefone (WhatsApp)</label>
              <input 
                type="tel" 
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl p-4 outline-none text-foreground"
                placeholder="(41) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Selecione o Plano</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAN_OPTIONS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedPlanId === plan.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/50'}`}
                >
                  <div className="font-bold text-sm text-foreground">{plan.name}</div>
                  {!isCustom && <div className="text-xs text-muted-foreground mt-1">R$ {plan.price.toFixed(2)}</div>}
                </button>
              ))}
            </div>
          </div>

          {isCustom && (
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs text-muted-foreground mb-2">Qtd de Serviços</label>
                <input type="number" value={customServices} onChange={e => setCustomServices(Number(e.target.value))} className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground" />
               </div>
               <div>
                <label className="block text-xs text-muted-foreground mb-2">Preço (R$)</label>
                <input type="number" value={customPrice} onChange={e => setCustomPrice(Number(e.target.value))} className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground" />
               </div>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Vendido Por (Barbeiro)</label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {BARBERS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSoldBy(b.id)}
                  className={`flex-shrink-0 flex items-center gap-2 p-2 pr-4 rounded-full border transition-all ${soldBy === b.id ? 'border-primary bg-primary/10' : 'border-border bg-secondary hover:border-primary/50'}`}
                >
                  <img src={b.image} alt={b.name} className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-sm font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSell}
            disabled={isSubmitting || !nome || !telefone}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Venda do Plano'}
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-border my-8" />

      {/* SEÇÃO DE GESTÃO */}
      <div>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Assinaturas e Planos
            </h2>
            <p className="text-muted-foreground">Gerencie os planos ativos e dê baixa nos cortes</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-xl outline-none text-sm w-full sm:w-48"
              />
            </div>
            <div className="flex bg-secondary p-1 rounded-xl">
              <button 
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'active' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >Ativos</button>
              <button 
                onClick={() => setFilterStatus('expired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'expired' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >Finalizados</button>
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'all' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >Todos</button>
            </div>
          </div>
        </div>

        {loadingSubs ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="text-center p-12 border border-border border-dashed rounded-2xl bg-secondary/20 text-muted-foreground">
            <CalendarX2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma assinatura encontrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubscriptions.map(sub => {
              const isActive = sub.status === 'active';
              const isExpired = sub.status === 'expired';
              const isCanceled = sub.status === 'canceled';
              const progress = ((sub.used_cuts || 0) / (sub.total_cuts || 1)) * 100;

              return (
                <div key={sub.id} className={`p-5 rounded-2xl border transition-all ${isActive ? 'bg-card border-primary/20' : 'bg-secondary/50 border-border opacity-70'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{sub.client_name}</h3>
                      <a 
                        href={`https://wa.me/${sub.client_phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                      >
                        {sub.client_phone}
                      </a>
                    </div>
                    {isActive && <span className="bg-primary/20 text-primary px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Ativo</span>}
                    {isExpired && <span className="bg-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Esgotado</span>}
                    {isCanceled && <span className="bg-destructive/20 text-destructive px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Cancelado</span>}
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="text-sm"><span className="text-muted-foreground">Plano:</span> <span className="font-medium capitalize">{sub.plan_type}</span></p>
                    <p className="text-sm"><span className="text-muted-foreground">Vendido por:</span> <span className="font-medium">{getBarberName(sub.barber_id)}</span></p>
                    <p className="text-sm"><span className="text-muted-foreground">Início:</span> <span className="font-medium">{format(new Date(sub.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span></p>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-muted-foreground">Cortes Utilizados</span>
                      <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>{sub.used_cuts || 0} / {sub.total_cuts || 1}</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isActive ? 'bg-primary' : isExpired ? 'bg-amber-500' : 'bg-destructive'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <button 
                      onClick={() => handleDeduct(sub.id)}
                      disabled={!isActive || processingId === sub.id}
                      className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === sub.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Minus className="w-4 h-4" /> Dar Baixa (1 Corte)</>}
                    </button>
                    <button 
                      onClick={() => handleCancel(sub.id)}
                      disabled={!isActive || processingId === sub.id}
                      className="px-4 bg-destructive/10 text-destructive font-bold py-2.5 rounded-xl text-sm hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancelar Plano"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
