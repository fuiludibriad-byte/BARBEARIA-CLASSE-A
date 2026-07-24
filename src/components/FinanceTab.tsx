import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BARBERS, ClientSubscription, Booking } from '@/lib/types';
import { DollarSign, UserCheck, Scissors, Search, Loader2 } from 'lucide-react';

export default function FinanceTab() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ appointments: Booking[]; subscriptions: ClientSubscription[] }>({ appointments: [], subscriptions: [] });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance?action=finance_report&period=${period}`)
      .then(res => res.json())
      .then(resData => {
        setData({
          appointments: resData.appointments || [],
          subscriptions: resData.subscriptions || []
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const calculateFinance = () => {
    let grossTotal = 0;
    let netBarbers: Record<string, number> = {};
    let totalCommissions = 0;

    // Inicializa barbeiros
    BARBERS.forEach(b => netBarbers[b.id] = 0);

    // Soma agendamentos
    data.appointments.forEach(app => {
      // @ts-ignore
      const price = parseFloat(app.price) || 0;
      grossTotal += price;
      
      const barber = BARBERS.find(b => b.id === app.barberId);
      if (barber && price > 0) {
        const commission = price * barber.serviceCommissionRate;
        netBarbers[barber.id] += commission;
        totalCommissions += commission;
      }
    });

    // Soma assinaturas vendidas
    data.subscriptions.forEach(sub => {
      // @ts-ignore
      const price = parseFloat(sub.price) || 0;
      grossTotal += price;

      const barber = BARBERS.find(b => b.id === sub.sold_by);
      if (barber && price > 0) {
        const commission = price * barber.planCommissionRate;
        netBarbers[barber.id] += commission;
        totalCommissions += commission;
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-muted-foreground">Repasses por Barbeiro</h3>
            </div>
            <div className="space-y-3">
              {BARBERS.map(b => (
                <div key={b.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <img src={b.image} alt={b.name} className="w-6 h-6 rounded-full object-cover" />
                    <span className="text-sm font-medium">{b.name}</span>
                  </div>
                  <span className="font-bold">R$ {(netBarbers[b.id] || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
