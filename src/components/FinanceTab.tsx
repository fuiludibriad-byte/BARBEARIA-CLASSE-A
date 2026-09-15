import { useState, useEffect } from 'react';
import { BARBERS, Subscription, Booking, BarberCommission } from '@/lib/types';
import { DollarSign, UserCheck, Scissors, Loader2, Save, CheckCircle2 } from 'lucide-react';
import React from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ appointments: Booking[]; subscriptions: Subscription[] }>({ appointments: [], subscriptions: [] });
  const [commissionsDb, setCommissionsDb] = useState<BarberCommission[]>([]);
  const [editedCommissions, setEditedCommissions] = useState<Record<string, number>>({});
  const [savingCommission, setSavingCommission] = useState<string | null>(null);
  const [payingBarberId, setPayingBarberId] = useState<string | null>(null);
  const [confirmingPayId, setConfirmingPayId] = useState<string | null>(null);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      let sDateStr = '';
      let eDateStr = '';

      if (isCustomDate && customStart && customEnd) {
        sDateStr = customStart;
        eDateStr = customEnd;
      } else {
        const now = new Date();
        if (period === 'today') {
          sDateStr = format(now, 'yyyy-MM-dd');
          eDateStr = format(now, 'yyyy-MM-dd');
        } else if (period === 'week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          sDateStr = format(startOfWeek, 'yyyy-MM-dd');
          eDateStr = format(endOfWeek, 'yyyy-MM-dd');
        } else if (period === 'month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          sDateStr = format(startOfMonth, 'yyyy-MM-dd');
          eDateStr = format(endOfMonth, 'yyyy-MM-dd');
        }
      }

      const url = `/api/finance?action=finance_report&startDate=${sDateStr}&endDate=${eDateStr}`;

      const [reportRaw, commRaw] = await Promise.all([
        fetch(url),
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
    if (isCustomDate) {
      if (customStart && customEnd) {
        fetchFinance();
      }
    } else {
      fetchFinance();
    }
  }, [period, isCustomDate, customStart, customEnd]);

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

    if (!window.confirm("ATENÇÃO: Você já transferiu o dinheiro para o barbeiro? Ao confirmar, o repasse acumulado será zerado.")) {
      return;
    }

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
    let totalCommissions = 0;

    type BarberStat = {
      grossAvulso: number;
      grossPlanos: number;
      commissionAvulso: number;
      commissionPlanos: number;
      net: number; // pending total commission
      rate: number;
    };

    let barberStats: Record<string, BarberStat> = {};

    // Inicializa barbeiros
    BARBERS.forEach(b => {
      barberStats[b.id] = { grossAvulso: 0, grossPlanos: 0, commissionAvulso: 0, commissionPlanos: 0, net: 0, rate: 0 };
    });

    const getBarberCommissionRate = (barberId: string) => {
      const editedRate = editedCommissions[barberId];
      if (editedRate !== undefined) return editedRate / 100;
      const dbRate = commissionsDb.find(c => c.barber_id === barberId)?.commission_percentage;
      return dbRate !== undefined ? dbRate / 100 : 0.5; // fallback to 50%
    };

    const sanitizePrice = (item: any) => {
      const rawValue = item.price || item.valor || 0;
      const cleanValue = Number(String(rawValue).replace(',', '.'));
      return isNaN(cleanValue) ? 0 : cleanValue;
    };

    // Soma agendamentos
    (data.appointments || []).forEach(app => {
      if (app.is_plan_usage) return;
      if (app.status !== 'completed' && app.status !== 'concluido') return;
      
      const price = sanitizePrice(app);
      grossTotal += price;
      
      const barberId = app.barberId || (app as any).barber_id;
      const barber = BARBERS.find(b => b.id === barberId);
      if (barber && price > 0) {
        const rate = getBarberCommissionRate(barber.id);
        const commission = price * rate;
        totalCommissions += commission;
        
        barberStats[barber.id].grossAvulso += price;
        barberStats[barber.id].rate = rate;
        
        if (!(app as any).is_settled) {
          barberStats[barber.id].commissionAvulso += commission;
          barberStats[barber.id].net += commission;
        }
      }
    });

    // Soma assinaturas
    (data.subscriptions || []).forEach(sub => {
      const price = sanitizePrice(sub);
      grossTotal += price;

      const barber = BARBERS.find(b => b.id === sub.barber_id);
      if (barber && price > 0) {
        const rate = getBarberCommissionRate(barber.id);
        const commission = price * rate;
        totalCommissions += commission;
        
        barberStats[barber.id].grossPlanos += price;
        barberStats[barber.id].rate = rate;
        
        if (!(sub as any).is_settled) {
          barberStats[barber.id].commissionPlanos += commission;
          barberStats[barber.id].net += commission;
        }
      }
    });

    return { grossTotal, barberStats, shopRetention: grossTotal - totalCommissions };
  };

  const { grossTotal, barberStats, shopRetention } = calculateFinance();

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
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-secondary p-1 rounded-xl">
            <button 
              onClick={() => {
                setIsCustomDate(false);
                setPeriod('today');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${(!isCustomDate && period === 'today') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >Hoje</button>
            <button 
              onClick={() => {
                setIsCustomDate(false);
                setPeriod('week');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${(!isCustomDate && period === 'week') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >Semana</button>
            <button 
              onClick={() => {
                setIsCustomDate(false);
                setPeriod('month');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${(!isCustomDate && period === 'month') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >Mês</button>
            <button 
              onClick={() => setIsCustomDate(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${(isCustomDate) ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >Personalizado</button>
          </div>

          {isCustomDate && (
            <div className="flex items-center gap-2 bg-secondary p-2 rounded-xl border border-border">
              <input 
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none border-none [color-scheme:dark]"
              />
              <span className="text-muted-foreground text-xs">até</span>
              <input 
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none border-none [color-scheme:dark]"
              />
            </div>
          )}
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
              {BARBERS.filter(b => b.role !== 'owner').map(b => {
                const stats = barberStats[b.id] || { grossAvulso: 0, grossPlanos: 0, commissionAvulso: 0, commissionPlanos: 0, net: 0, rate: 0.5 };
                const totalGross = stats.grossAvulso + stats.grossPlanos;
                const shopRetained = totalGross - (totalGross * stats.rate);
                
                return (
                  <div key={b.id} className="flex flex-col border border-border bg-black/20 rounded-xl p-4 gap-4">
                    
                    {/* Cabeçalho do Barbeiro */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={b.image} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <span className="text-sm font-bold block">{b.name}</span>
                          <span className="text-xs text-muted-foreground">Faturamento Gerado: R$ {totalGross.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editedCommissions[b.id] !== undefined ? editedCommissions[b.id] : ((commissionsDb.find(c => c.barber_id === b.id)?.commission_percentage || 50))}
                          onChange={(e) => setEditedCommissions(prev => ({ ...prev, [b.id]: Number(e.target.value) }))}
                          className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-foreground text-center focus:border-primary outline-none"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <button
                          onClick={() => handleSaveCommission(b.id, b.name)}
                          disabled={savingCommission === b.id}
                          className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          title="Salvar porcentagem"
                        >
                          {savingCommission === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Divisão de Valores */}
                    <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-lg border border-border/50">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vendas da Semana</p>
                        <p className="text-xs text-foreground">Avulsos: <span className="font-semibold text-primary">R$ {stats.grossAvulso.toFixed(2)}</span></p>
                        <p className="text-xs text-foreground">Planos: <span className="font-semibold text-primary">R$ {stats.grossPlanos.toFixed(2)}</span></p>
                      </div>
                      <div className="border-l border-border/50 pl-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Divisão Final</p>
                        <p className="text-xs text-foreground">Estúdio ({(100 - (stats.rate * 100)).toFixed(0)}%): <span className="font-semibold">R$ {shopRetained.toFixed(2)}</span></p>
                        <p className="text-xs text-foreground">Repasse ({(stats.rate * 100).toFixed(0)}%): <span className="font-semibold text-primary">R$ {(totalGross * stats.rate).toFixed(2)}</span></p>
                      </div>
                    </div>

                    {/* Repasse Pendente & Pagamento */}
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Pendente a Pagar</p>
                        <p className="text-sm font-bold text-primary">R$ {stats.net.toFixed(2)}</p>
                      </div>
                      
                      {stats.net > 0 ? (
                        confirmingPayId === b.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setConfirmingPayId(null)}
                              className="px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                setConfirmingPayId(null);
                                handlePayRepasse(b.id);
                              }}
                              disabled={payingBarberId === b.id}
                              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_-3px_#22c55e]"
                            >
                              {payingBarberId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Pagamento"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingPayId(b.id)}
                            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_-3px_#D4AF37]"
                          >
                            <DollarSign className="w-4 h-4" />
                            Fechar Caixa do Barbeiro
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> Tudo pago
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
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
