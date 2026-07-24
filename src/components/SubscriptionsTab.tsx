import { useState } from 'react';
import { BARBERS, PLAN_OPTIONS } from '@/lib/types';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';

export default function SubscriptionsTab() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PLAN_OPTIONS[0].id);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customServices, setCustomServices] = useState<number>(1);
  const [soldBy, setSoldBy] = useState<string>(BARBERS[0].id);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedPlan = PLAN_OPTIONS.find(p => p.id === selectedPlanId);
  const isCustom = selectedPlanId === 'plan-custom';

  const handleSell = () => {
    if (!nome.trim() || !telefone.trim() || !selectedPlan) return;

    const payload = {
      cliente_nome: nome.trim(),
      cliente_telefone: telefone.replace(/\D/g, ''), // apenas numeros
      plan_name: selectedPlan.name,
      total_services: isCustom ? customServices : selectedPlan.totalServices,
      price: isCustom ? customPrice : selectedPlan.price,
      sold_by: soldBy
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
          setTimeout(() => setShowSuccess(false), 3000);
        }
      })
      .catch(console.error)
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Venda de Assinaturas
        </h2>
        <p className="text-muted-foreground">Cadastre planos mensais para os clientes</p>
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
  );
}
