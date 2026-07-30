import { useState, useEffect } from 'react';
import { BARBERS, Subscription, Booking, BarberCommission } from '@/lib/types';
import { DollarSign, UserCheck, Scissors, Loader2, Save } from 'lucide-react';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error in FinanceTab", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-destructive/10 text-destructive rounded-2xl m-4 border border-destructive/20">
          <h2 className="text-xl font-bold mb-2">Ops! Erro ao carregar o Financeiro.</h2>
          <p className="text-sm opacity-80">Por favor, recarregue a página ou avise o suporte.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function FinanceTabContent() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ appointments: Booking[]; subscriptions: Subscription[] }>({ appointments: [], subscriptions: [] });
  const [commissionsDb, setCommissionsDb] = useState<BarberCommission[]>([]);
  const [editedCommissions, setEditedCommissions] = useState<Record<string, number>>({});
  const [savingCommission, setSavingCommission] = useState<string | null>(null);
  const [payingBarberId, setPayingBarberId] = useState<string | null>(null);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const [reportRaw, commRaw] = await Promise.all([
        fetch(`/api/finance?action=finance_report&period=${period}`),
        fetch('/api/finance?action=get_commissions')
      ]);

      if (!reportRaw.ok || !commRaw.ok) {
        throw new Error('Falha na comunicação com a API');
      }

      const reportRes = await reportRaw.json();
      const commRes = await commRaw.json();

      setData({
        appointments: Array.isArray(reportRes?.appointments) ? reportRes.appointments : [],
        subscriptions: Array.isArray(reportRes?.subscriptions) ? reportRes.subscriptions : []
      });
      setCommissionsDb(Array.isArray(commRes?.commissions) ? commRes.commissions : []);
      
      const initialEdits: Record<string, number> = {};
      (commRes.commissions || []).forEach((c: BarberCommission) => {
        initialEdits[c.barber_id] = c.commission_percentage;
      });
      setEditedCommissions(initialEdits);
    } catch (err) {
      console.error('Erro Supabase Financeiro/Planos:', err);
      setData({ appointments: [], subscriptions: [] });
      setCommissionsDb([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [period]);

  const handleSaveCommission = async (barberId: string, barberName: string) => {
    const val = editedCommissions[barberId];
    if (val === undefined) return;
    
    setSavingCommission(barberId);
    try {
      await fetch('/api/finance?action=update_commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barber_id: barberId, barber_name: barberName, commission_percentage: val })
      });
      // Re-fetch para atualizar local
      fetchFinance();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCommission(null);
    }
  };

  const handlePayRepasse = async (barberId: string) => {
    if (payingBarberId) return;
    setPayingBarberId(barberId);
    try {
      // 1. Atualiza appointments
      const { error: appErr } = await supabase
        .from('appointments')
        .update({ is_settled: true })
        .eq('barber_id', barberId)
        .neq('is_settled', true);

      if (appErr) throw appErr;

      // 2. Atualiza subscriptions
      const { error: subErr } = await supabase
        .from('subscriptions')
        .update({ is_settled: true })
        .eq('barber_id', barberId)
        .neq('is_settled', true);

      if (subErr) throw subErr;

      toast.success("Pagamento registrado e repasse zerado!");
      fetchFinance();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar pagamento: " + (err?.message || "Erro de conexão"));
    } finally {
      setPayingBarberId(null);
    }
  };

  const calculateFinance = () => {
    let grossTotal = 0;
    let netBarbers: Record<string, number> = {};
    let totalCommissions = 0;

    // Inicializa barbeiros
    BARBERS.forEach(b => netBarbers[b.id] = 0);

    const getBarberCommissionRate = (barberId: string) => {
      const editedRate = editedCommissions[barberId];
      if (editedRate !== undefined) return editedRate / 100;
      const dbRate = commissionsDb.find(c => c.barber_id === barberId)?.commission_percentage;
      return dbRate !== undefined ? dbRate / 100 : 0.5; // fallback to 50%
    };

    // Soma agendamentos (apenas serviços avulsos, pois se for plano, a grana já entrou na venda do plano)
    (data.appointments || []).forEach(app => {
      if (app.is_plan_usage) return; // Se foi pago com plano, o valor entrou na venda do plano, não agora
      
      const price = Number(app.price) || 0;
      grossTotal += price;
      
      const barberId = app.barberId || (app as any).barber_id;
      const barber = BARBERS.find(b => b.id === barberId);
      if (barber && price > 0) {
        const rate = getBarberCommissionRate(barber.id);
        const commission = price * rate;
        totalCommissions += commission; // Lucro estúdio desconta todas as comissões geradas no período
        
        // Barbeiro só recebe o repasse pendente se não tiver sido acertado ainda (is_settled !== true)
        if (!(app as any).is_settled) {
          netBarbers[barber.id] += commission;
        }
      }
    });

    // Soma assinaturas vendidas
    (data.subscriptions || []).forEach(sub => {
      const price = Number(sub.price) || 0;
      grossTotal += price;

      const barber = BARBERS.find(b => b.id === sub.barber_id);
      if (barber && price > 0) {
        const rate = getBarberCommissionRate(barber.id);
        const commission = price * rate;
        totalCommissions += commission; // Lucro estúdio desconta todas as comissões geradas no período
        
        // Barbeiro só recebe o repasse pendente se não tiver sido acertado ainda (is_settled !== true)
        if (!(sub as any).is_settled) {
          netBarbers[barber.id] += commission;
        }
      }
    });

    return { grossTotal, netBarbers, shopRetention: grossTotal - totalCommissions };
  };

  const { grossTotal, netBarbers, shopRetention } = calculateFinance();

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Caixa e Comissões
          </h2>
          <p className="text-muted-foreground">Visão geral do faturamento e repasses</p>
        </div>
        
        <div className="flex bg-secondary p-1 rounded-xl">
          <button 
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'today' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >Hoje</button>
          <button 
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'week' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >Semana</button>
          <button 
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === 'month' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >Mês</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-muted-foreground">Faturamento Bruto</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">R$ {grossTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Total de serviços e planos vendidos</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-muted-foreground">Lucro Estúdio</h3>
            </div>
            <p className="text-3xl font-bold text-primary">R$ {shopRetention.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Retenção líquida após repasses</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl lg:col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-muted-foreground">Repasses e Ajuste de %</h3>
              </div>
            </div>
            <div className="space-y-4">
              {BARBERS.map(b => (
                <div key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border pb-3 last:border-0 last:pb-0 gap-3">
                  <div className="flex items-center gap-3">
                    <img src={b.image} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <span className="text-sm font-bold block">{b.name}</span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">Repasse Acumulado: R$ {(netBarbers[b.id] || 0).toFixed(2)}</span>
                        {(netBarbers[b.id] || 0) > 0 && (
                          <button
                            onClick={() => handlePayRepasse(b.id)}
                            disabled={payingBarberId === b.id}
                            className="text-[10px] bg-primary/20 hover:bg-primary/30 text-primary font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {payingBarberId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "💰 Pagar Repasse"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg">
                    <input 
                      type="number"
                      value={editedCommissions[b.id] ?? 50}
                      onChange={(e) => setEditedCommissions({...editedCommissions, [b.id]: Number(e.target.value)})}
                      className="w-16 bg-background border border-border text-center rounded-md p-1 text-sm outline-none"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <button 
                      onClick={() => handleSaveCommission(b.id, b.name)}
                      disabled={savingCommission === b.id}
                      className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Salvar % de Comissão"
                    >
                      {savingCommission === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinanceTab() {
  return (
    <ErrorBoundary>
      <FinanceTabContent />
    </ErrorBoundary>
  );
}
