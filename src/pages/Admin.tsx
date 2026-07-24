import { useState, useEffect } from 'react';
import AdminPanel from '@/components/AdminPanel';
import { Sparkles } from 'lucide-react';
import { BARBERS, Barber } from '@/lib/types';

const REMEMBER_KEY = 'classea_admin_remembered';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(false);



  const handleLogin = () => {
    const barber = BARBERS.find(b => b.id === selectedBarberId);
    if (barber && password === barber.password) {
      setIsAuthenticated(true);
      setPassword('');
      setError(false);
      
      const authUser = { id: barber.id, name: barber.name, role: barber.role };
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, 'true');
        localStorage.setItem('classea_authenticated_barber', JSON.stringify(authUser));
      } else {
        sessionStorage.setItem('classea_authenticated_barber', JSON.stringify(authUser));
      }
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem('classea_authenticated_barber');
    sessionStorage.removeItem('classea_authenticated_barber');
    setIsAuthenticated(false);
    setSelectedBarberId('');
  };

  useEffect(() => {
    if (localStorage.getItem(REMEMBER_KEY) === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  if (isAuthenticated) {
    return <AdminPanel onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo/Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-[0_0_30px_-5px_hsl(45_97%_54%/0.3)]">
            <Sparkles className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">BARBEARIA CLASSE A</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel Administrativo</p>
        </div>

        {/* Login Card */}
        <div className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border border-primary/10 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_50px_-15px_rgba(0,0,0,0.5)]">
          {!selectedBarberId ? (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground text-center">Selecione seu perfil para acessar:</p>
              <div className="grid grid-cols-3 gap-3">
                {BARBERS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBarberId(b.id)}
                    className="flex flex-col items-center p-3 rounded-xl border border-primary/5 hover:border-primary/20 bg-background/30 hover:bg-background/60 transition-all text-center group"
                  >
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-12 h-12 rounded-full object-cover object-[center_15%] border border-border group-hover:scale-105 transition-transform"
                    />
                    <span className="text-xs font-bold mt-2 truncate max-w-full text-foreground">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-primary/5">
                <img
                  src={BARBERS.find(b => b.id === selectedBarberId)?.image}
                  alt="Perfil"
                  className="w-10 h-10 rounded-full object-cover object-[center_15%] border border-border"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Perfil selecionado</p>
                  <p className="text-sm font-bold text-foreground">{BARBERS.find(b => b.id === selectedBarberId)?.name}</p>
                </div>
                <button
                  onClick={() => { setSelectedBarberId(''); setPassword(''); }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Alterar
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2 block">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full bg-background/50 border ${error ? 'border-destructive' : 'border-primary/10 focus:border-primary/40'} p-4 rounded-xl outline-none transition-all text-foreground placeholder:text-muted-foreground/40`}
                />
                {error && (
                  <p className="text-destructive text-xs mt-2 animate-pulse">Senha incorreta</p>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border border-primary/20 bg-background/50 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                    {remember && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Lembrar neste dispositivo</span>
              </label>

              <button
                onClick={handleLogin}
                className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl transition-all hover:shadow-[0_0_25px_-5px_hsl(45_97%_54%/0.5)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
