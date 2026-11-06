import React, { useState, useEffect } from 'react';
import { Barber, getStoredBarbers, syncBarbersFromApi, addCustomBarber, removeCustomBarber, NO_PHOTO_AVATAR } from '@/lib/types';
import { Scissors, Plus, Trash2, Key, Shield, Check, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_AVATARS = [
  NO_PHOTO_AVATAR,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
];

export default function BarbersTab() {
  const [barbers, setBarbers] = useState<Barber[]>(() => getStoredBarbers());
  const [showAddModal, setShowAddModal] = useState(false);
  const [barberToRemove, setBarberToRemove] = useState<Barber | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Sincroniza equipe do backend ao abrir
  useEffect(() => {
    syncBarbersFromApi().then(updated => {
      if (updated && updated.length > 0) {
        setBarbers(updated);
      }
    });
  }, []);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('0000');
  const [image, setImage] = useState(NO_PHOTO_AVATAR);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddBarber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do barbeiro');
      return;
    }

    setIsSubmitting(true);
    try {
      addCustomBarber({
        name: name.trim(),
        password: password.trim() || '0000',
        image: image.trim() || DEFAULT_AVATARS[0]
      });

      setBarbers(getStoredBarbers());
      toast.success(`Barbeiro ${name.trim()} adicionado com sucesso!`);
      setName('');
      setPassword('0000');
      setImage(DEFAULT_AVATARS[0]);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar barbeiro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = () => {
    if (!barberToRemove) return;
    if (barberToRemove.role === 'owner') {
      toast.error('O perfil do proprietário (Dono) não pode ser removido.');
      setBarberToRemove(null);
      return;
    }

    try {
      removeCustomBarber(barberToRemove.id);
      setBarbers(getStoredBarbers());
      toast.success(`Barbeiro ${barberToRemove.name} removido da equipe com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover barbeiro');
    } finally {
      setBarberToRemove(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-primary/10">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" />
            Equipe de Barbeiros
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os barbeiros que atendem no estúdio, crie novos acessos ou remova profissionais.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Adicionar Barbeiro
        </button>
      </div>

      {/* Grid de Barbeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((b) => {
          const isOwner = b.role === 'owner';
          const isPassVisible = !!showPasswords[b.id];

          return (
            <div
              key={b.id}
              className="bg-card/70 backdrop-blur-sm border border-primary/10 rounded-2xl p-5 flex flex-col justify-between hover:border-primary/30 transition-all shadow-sm"
            >
              <div>
                {/* Top bar do card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="relative">
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-16 h-16 rounded-2xl object-cover object-[center_15%] border-2 border-primary/20 shadow-md"
                    />
                    {isOwner ? (
                      <span className="absolute -bottom-2 -right-2 bg-amber-500/20 text-amber-400 p-1 rounded-full border border-amber-500/30" title="Proprietário">
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="absolute -bottom-2 -right-2 bg-primary/20 text-primary p-1 rounded-full border border-primary/30" title="Barbeiro">
                        <Scissors className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    {isOwner ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        Dono / Admin
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
                        Barbeiro
                      </span>
                    )}
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-1 mb-4">
                  <h3 className="text-lg font-bold text-foreground">{b.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">ID de acesso: {b.id}</p>
                </div>

                {/* Senha de Acesso */}
                <div className="bg-background/60 border border-border/60 rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Key className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">Senha:</span>
                    <span className="text-sm font-mono font-bold text-foreground tracking-wider">
                      {isPassVisible ? b.password || 'Sem senha' : '••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(b.id)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title={isPassVisible ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {isPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ações */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Comissão: {Math.round(b.serviceCommissionRate * 100)}%
                </span>

                {!isOwner ? (
                  <button
                    onClick={() => setBarberToRemove(b)}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 font-bold px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                    title="Remover barbeiro"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 italic">Perfil Fixo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Confirmação de Remoção de Barbeiro */}
      {barberToRemove && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-destructive/30 shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-foreground">Remover Funcionário?</h3>
              <p className="text-xs text-muted-foreground mt-2">
                Tem certeza que deseja remover <strong className="text-foreground">{barberToRemove.name}</strong> da equipe?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 bg-secondary/50 rounded-2xl border border-border">
              <img
                src={barberToRemove.image}
                alt={barberToRemove.name}
                className="w-12 h-12 rounded-xl object-cover object-[center_15%]"
              />
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">{barberToRemove.name}</p>
                <p className="text-xs text-muted-foreground font-mono">ID: {barberToRemove.id}</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              O profissional não conseguirá mais entrar no painel e seu nome deixará de aparecer para novos agendamentos no site.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBarberToRemove(null)}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors border border-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-destructive/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Novo Barbeiro */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-primary/20 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Scissors className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Novo Barbeiro</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBarber} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Nome do Barbeiro *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Kauã Pimentel"
                  required
                  autoFocus
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Senha de Acesso ao Painel *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ex: 0000"
                  required
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:border-primary outline-none font-mono transition-colors"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Essa é a senha que ele usará para entrar no painel dele.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  Foto de Perfil (Escolha uma sugestão ou cole o link)
                </label>
                
                {/* Prévia e Galeria de Avatares Rápidos */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={image}
                    alt="Prévia"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-primary"
                  />
                  <div className="flex gap-2">
                    {DEFAULT_AVATARS.map((av, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setImage(av)}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${
                          image === av ? 'border-primary scale-105 shadow-md shadow-primary/30' : 'border-border opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={av} alt="Opção" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="url"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-primary outline-none transition-colors"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
