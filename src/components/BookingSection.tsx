import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SERVICES, isDayAllowed, WHATSAPP_NUMBER, generateWhatsAppUrl, formatPhone, getBookingDuration, ScheduleBlock, BARBERS, Booking, ClientSubscription } from '@/lib/types';
import { addBooking, getBookings, getBlocks } from '@/lib/bookingStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, X } from 'lucide-react';

type ServiceType = typeof SERVICES[0];

const BookingSection = () => {
  const [step, setStep] = useState(1);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState('Cabelo');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedOption, setSelectedOption] = useState<{ label: string; price: number; time: number } | null>(null);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [pendingService, setPendingService] = useState<ServiceType | null>(null);
  const [extras, setExtras] = useState<ServiceType[]>([]);
  const [showOrderBump, setShowOrderBump] = useState(false);
  const [bumpSelections, setBumpSelections] = useState<ServiceType[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeSubscription, setActiveSubscription] = useState<ClientSubscription | null>(null);
  const [useSubscription, setUseSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  const totalDuration = useMemo(() => {
    if (!selectedService) return 0;
    const baseTime = selectedOption ? selectedOption.time : selectedService.time;
    return baseTime + extras.reduce((sum, e) => sum + e.time, 0);
  }, [selectedService, selectedOption, extras]);

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [googleBookings, setGoogleBookings] = useState<Booking[]>([]);
  const [googleBlocks, setGoogleBlocks] = useState<ScheduleBlock[]>([]);
  const [weekdaySlots, setWeekdaySlots] = useState<{ weekday: number; time: string; barber_id?: string }[]>([]);
  const [dateSlots, setDateSlots] = useState<{ selected_date: string; time: string; barber_id?: string }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Load schedule events directly from the API on selectedDate change
  useEffect(() => {
    if (step === 4 && phone.length >= 14) {
      setIsCheckingSubscription(true);
      fetch(`/api/finance?action=get_subscription&phone=${encodeURIComponent(phone)}`)
        .then(res => res.json())
        .then(data => {
          if (data.subscription) {
            setActiveSubscription(data.subscription);
            setUseSubscription(true);
          } else {
            setActiveSubscription(null);
            setUseSubscription(false);
          }
        })
        .catch(console.error)
        .finally(() => setIsCheckingSubscription(false));
    } else {
      setActiveSubscription(null);
      setUseSubscription(false);
    }
  }, [phone, step]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    fetch(`/api/calendar?realtime=true&barberId=${selectedBarberId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar os dados da agenda.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.bookings)) {
          setGoogleBookings(data.bookings);
        }
        if (Array.isArray(data.blocks)) {
          setGoogleBlocks(data.blocks);
        }
        if (Array.isArray(data.weekdaySlots)) {
          setWeekdaySlots(data.weekdaySlots);
        }
        if (Array.isArray(data.dateSpecificSlots)) {
          setDateSlots(data.dateSpecificSlots);
        }
      })
      .catch((err) => {
        console.error("Error loading events from Google Calendar API:", err);
      })
      .finally(() => {
        setLoadingTimes(false);
      });
  }, [selectedDate, selectedBarberId]);

  // Helper to calculate available times for a specific barber
  const getAvailableSlotsForBarber = (barberId: string) => {
    if (!selectedDate || !selectedService) return [];

    // Se for Domingo, retorne []
    if (selectedDate.getDay() === 0) return [];

    const dateStr = format(selectedDate, 'dd/MM/yyyy');

    const isoDate = format(selectedDate, 'yyyy-MM-dd');
    const specificSlotsForDate = dateSlots.filter(s => s.selected_date === isoDate && s.barber_id === barberId);
    
    let baseSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
    ];

    if (specificSlotsForDate.length > 0) {
      baseSlots = specificSlotsForDate.map(s => s.time).sort();
    }

    const localBookings = getBookings().filter(
      (b) => b.date === dateStr && b.status !== 'completed' && (b.barberId || 'luiz') === barberId
    );
    const apiBookings = googleBookings.filter(
      (b) => b.date === dateStr && b.status !== 'completed' && (b.barberId || 'luiz') === barberId
    );
    const bookings = [...apiBookings];
    localBookings.forEach(lb => {
      const lbIdNormalized = lb.id.replace(/-/g, '').toLowerCase();
      if (!bookings.some(ab => ab.id === lb.id || ab.id.replace(/-/g, '').toLowerCase() === lbIdNormalized)) {
        bookings.push(lb);
      }
    });

    const localBlocks = getBlocks().filter(
      (block) => block.date === dateStr && (block.barberId || 'luiz') === barberId
    );
    const apiBlocks = googleBlocks.filter(
      (block) => block.date === dateStr && (block.barberId || 'luiz') === barberId
    );
    const blocks = [...apiBlocks];
    localBlocks.forEach(lb => {
      const lbIdNormalized = lb.id.replace(/-/g, '').toLowerCase();
      if (!blocks.some(ab => ab.id === lb.id || ab.id.replace(/-/g, '').toLowerCase() === lbIdNormalized)) {
        blocks.push(lb);
      }
    });

    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return baseSlots.filter((timeStr) => {
      const start = timeToMinutes(timeStr);
      const end = start + totalDuration;

      // Filtra horários do dia de hoje que já passaram em relação à hora atual
      if (isToday && start < currentMinutes) {
        return false;
      }

      // A limitação rígida de 20:00 (1200) foi removida.
      // O horário será exibido desde que esteja nos baseSlots e não conflite com outros agendamentos.

      // Check overlap with schedule blocks of the day
      const hasBlockOverlap = blocks.some((block) => {
        if (block.allDay) return true;
        if (!block.start || !block.end) return false;
        
        const blockStart = timeToMinutes(block.start);
        const blockEnd = timeToMinutes(block.end);
        
        return Math.max(start, blockStart) < Math.min(end, blockEnd);
      });

      if (hasBlockOverlap) {
        return false;
      }

      // Check overlap with any booking of the day
      const hasOverlap = bookings.some((b) => {
        const bStart = timeToMinutes(b.time);
        const bDuration = getBookingDuration(b.service);
        const bEnd = bStart + bDuration;

        return Math.max(start, bStart) < Math.min(end, bEnd);
      });

      return !hasOverlap;
    });
  };

  // Main slots logic combining specific or all barbers
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableTimes([]);
      return;
    }

    if (selectedBarberId !== 'qualquer') {
      setAvailableTimes(getAvailableSlotsForBarber(selectedBarberId));
    } else {
      const luizSlots = getAvailableSlotsForBarber('luiz');
      const vitinhoSlots = getAvailableSlotsForBarber('vitinho');
      // Union of both barbers slots
      const unionSlots = Array.from(new Set([...luizSlots, ...vitinhoSlots]));
      // Sort chronologically
      unionSlots.sort((a, b) => {
        const [ha, ma] = a.split(':').map(Number);
        const [hb, mb] = b.split(':').map(Number);
        return (ha * 60 + ma) - (hb * 60 + mb);
      });
      setAvailableTimes(unionSlots);
    }
  }, [selectedDate, selectedService, extras, totalDuration, googleBookings, googleBlocks, weekdaySlots, dateSlots, selectedBarberId]);

  // Combined service name and price
  const combinedServiceName = useMemo(() => {
    if (!selectedService) return '';
    const baseName = selectedOption 
      ? `${selectedService.name} - ${selectedOption.label}` 
      : selectedService.name;
    const names = [baseName, ...extras.map(e => e.name)];
    return names.join(' + ');
  }, [selectedService, selectedOption, extras]);

  const totalPrice = useMemo(() => {
    if (!selectedService) return 0;
    const basePrice = selectedOption ? selectedOption.price : selectedService.price;
    return basePrice + extras.reduce((sum, e) => sum + e.price, 0);
  }, [selectedService, selectedOption, extras]);

  const handleSelectService = (s: ServiceType) => {
    if (s.options && s.options.length > 0) {
      setPendingService(s);
      setShowOptionModal(true);
    } else {
      setSelectedService(s);
      setSelectedOption(null);
      setExtras([]);
      setBumpSelections([]);
      setShowOrderBump(true);
    }
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime('');
    }
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleConfirm = () => {
    if (!name.trim() || !phone.trim() || !selectedService || !selectedDate || !selectedTime) return;

    // Resolve barber ID if "qualquer" is selected
    let finalBarberId = selectedBarberId;
    if (selectedBarberId === 'qualquer') {
      const luizSlots = getAvailableSlotsForBarber('luiz');
      if (luizSlots.includes(selectedTime)) {
        finalBarberId = 'luiz';
      } else {
        finalBarberId = 'vitinho';
      }
    }

    const dateStr = format(selectedDate, 'dd/MM/yyyy');
    const booking = {
      id: crypto.randomUUID(),
      service: combinedServiceName,
      price: totalPrice,
      date: dateStr,
      time: selectedTime,
      name: name.trim(),
      phone: phone.trim(),
      status: 'accepted' as const,
      barberId: finalBarberId,
      is_plan_usage: useSubscription
    };

    setIsSubmitting(true);

    const finishBooking = () => {
      addBooking(booking);
      const barberObj = BARBERS.find(b => b.id === booking.barberId);
      const barberName = barberObj ? barberObj.name : 'Luiz';
      
      const priceDisplay = useSubscription ? `R$ 0,00 (Plano Mensal)` : `R$ ${booking.price},00`;
      const msg = `💈 BARBEARIA CLASSE A 💈\n\nOlá! ✂️\nMeu nome é ${booking.name}.\nMeu agendamento foi realizado com sucesso:\n\n📋 Serviço: ${booking.service}\n💰 Valor: ${priceDisplay}\n📅 Data: ${booking.date}\n🕐 Horário: ${booking.time}\n👤 Barbeiro: ${barberName}\n📱 Meu WhatsApp: ${booking.phone}\n\nObrigado! 🤝`;
      window.location.href = generateWhatsAppUrl(WHATSAPP_NUMBER, msg);

      setIsSubmitting(false);
      setShowSuccess(true);
      setStep(1);
      setSelectedBarberId('');
      setSelectedService(null);
      setExtras([]);
      setSelectedDate(undefined);
      setSelectedTime('');
      setName('');
      setPhone('');
    };

    const executeBooking = async () => {
      try {
        let finalPrice = booking.price;
        let finalIsPlanUsage = booking.is_plan_usage;
        let subToUpdate: { id: string, used_cuts: number, total_cuts: number, plan_type: string } | null = null;

        if (booking.phone) {
          const cleanPhone = booking.phone.replace(/\D/g, '');
          const { data: subData, error: subErr } = await supabase
            .from('subscriptions')
            .select('id, used_cuts, total_cuts, plan_type')
            .eq('client_phone', cleanPhone)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!subErr && subData && subData.used_cuts < subData.total_cuts) {
            finalPrice = 0;
            finalIsPlanUsage = true;
            subToUpdate = subData as any;
            booking.price = 0;
            booking.is_plan_usage = true;
          }
        }

        const [d, m, y] = booking.date.split('/');
        const isoDate = `${y}-${m}-${d}`;
        const startDateTime = `${isoDate}T${booking.time}:00-03:00`;
        const startMs = new Date(startDateTime).getTime();
        const endDateTime = new Date(startMs + (totalDuration || 180) * 60 * 1000).toISOString();

        const { error: insertErr } = await supabase
          .from('appointments')
          .insert({
            id: booking.id,
            cliente_nome: booking.name,
            cliente_telefone: booking.phone,
            servico_nome: booking.service,
            duracao_minutos: totalDuration || 180,
            data_hora_inicio: startDateTime,
            data_hora_fim: endDateTime,
            status: booking.status,
            barber_id: booking.barberId,
            price: finalPrice,
            is_plan_usage: finalIsPlanUsage
          });

        if (insertErr) {
          throw new Error(insertErr.message || "Erro no banco de dados ao salvar agendamento.");
        }

        if (subToUpdate) {
           const { error: updateSubErr } = await supabase
             .from('subscriptions')
             .update({ used_cuts: subToUpdate.used_cuts + 1 })
             .eq('id', subToUpdate.id);
             
           if (updateSubErr) {
             console.error("Erro ao abater corte do plano:", updateSubErr);
           }
        }

        console.log("Booking saved successfully to Supabase");
        finishBooking();
      } catch (err: any) {
        console.error("ERRO NO INSERT:", err);
        setIsSubmitting(false);
        const errorMsg = err?.message || err?.error || "Erro ao validar plano. Tente novamente.";
        toast.error(errorMsg);
      }
    };

    executeBooking();
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <>
      <section id="agendar" className="pt-24 pb-12 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Agende seu horário</h2>
          <p className="text-muted-foreground mt-2">Escolha o barbeiro, o serviço e o melhor momento para você.</p>
        </div>

        <div className="glass rounded-3xl p-4 md:p-8 card-shadow min-h-[400px]">
          {/* Steps */}
          <div className="flex justify-between mb-10 px-2 md:px-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors text-sm',
                    step >= i ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {i}
                </div>
                <span className="text-xs text-muted-foreground hidden md:block">
                  {['Barbeiro', 'Serviço', 'Data & Horário', 'Dados'][i - 1]}
                </span>
              </div>
            ))}
          </div>

          {step > 1 && (
            <button onClick={goBack} className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </button>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold">Quem vai atender você?</h3>
                  <p className="text-sm text-muted-foreground mt-1">Selecione o seu barbeiro de preferência.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                  {BARBERS.filter(b => b.role === 'barber').map((barber) => (
                    <button
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarberId(barber.id);
                        setStep(2);
                      }}
                      className={cn(
                        "flex flex-col items-center p-6 rounded-2xl border transition-all text-center group",
                        selectedBarberId === barber.id ? "border-primary bg-secondary/80 shadow-lg" : "border-border hover:border-primary/50 bg-secondary/30"
                      )}
                    >
                      <img
                        src={barber.image}
                        alt={barber.name}
                        className="w-24 h-24 md:w-32 md:h-32 object-cover object-[center_15%] rounded-full border border-border group-hover:scale-105 transition-transform duration-300 shadow-sm"
                      />
                      <h4 className="font-bold text-lg mt-4">{barber.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Barbeiro Oficial</p>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedBarberId('qualquer');
                      setStep(2);
                    }}
                    className={cn(
                      "flex flex-col items-center p-6 rounded-2xl border transition-all text-center group bg-secondary/30",
                      selectedBarberId === 'qualquer' ? "border-primary bg-secondary/80 shadow-lg" : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src="https://i.imgur.com/Vs3Oba1.jpeg"
                      alt="Qualquer Um"
                      className="w-24 h-24 md:w-32 md:h-32 object-cover object-[center_15%] rounded-full border border-border group-hover:scale-105 transition-transform duration-300 shadow-sm"
                    />
                    <h4 className="font-bold text-lg mt-4">Qualquer Um</h4>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Primeiro Disponível</p>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {/* Category Tabs */}
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                  {Array.from(new Set(SERVICES.map(s => s.category))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-2 px-2">
                  {SERVICES.filter(s => s.category === activeCategory).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleSelectService(s)}
                      className="flex-shrink-0 w-[200px] md:w-[220px] h-[240px] md:h-[270px] rounded-2xl border border-border hover:border-primary/50 transition-all text-center group overflow-hidden snap-center relative"
                    >
                      <img
                        src={s.image}
                        alt={s.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        width={220}
                        height={270}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                        <h3 className="font-bold text-sm md:text-base text-white group-hover:text-primary transition-colors">{s.name}</h3>
                        <p className="text-xs text-white/70 mt-1">
                          {s.options 
                            ? `${Math.min(...s.options.map(o => o.time))} - ` + `${Math.max(...s.options.map(o => o.time))} min` 
                            : `${s.time} min`}
                        </p>
                        <span className="text-lg font-mono font-bold mt-1 text-primary block">
                          {s.options 
                            ? `R$ ${Math.min(...s.options.map(o => o.price))} - R$ ${Math.max(...s.options.map(o => o.price))}` 
                            : `R$ ${s.price}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                    <div className="flex justify-between items-center text-sm pt-3 border-t border-border">
                      <span className="font-medium text-foreground text-base">Total</span>
                      <span className="text-primary font-bold text-xl">
                        {useSubscription ? 'R$ 0,00' : `R$ ${totalPrice},00`}
                      </span>
                    </div>
                <div className="flex items-center gap-3 mt-3 px-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    ← Arraste para o lado →
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="flex justify-center">
                    <div className="bg-secondary rounded-2xl p-4 border border-border">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelectDate}
                        locale={ptBR}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today || !isDayAllowed(date);
                        }}
                        className="pointer-events-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-3 px-2 uppercase tracking-widest text-center">
                        Segunda a Sábado • Domingo Fechado
                      </p>
                    </div>
                  </div>

                  {activeSubscription && (
                    <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl mt-4">
                      <p className="text-primary font-bold mb-1">
                        🎁 {activeSubscription.plan_name} Encontrado!
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        Você possui {activeSubscription.total_services - activeSubscription.services_used} serviço(s) restante(s) neste mês.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useSubscription}
                          onChange={(e) => setUseSubscription(e.target.checked)}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="text-sm font-medium">Usar meu plano para pagar este agendamento</span>
                      </label>
                    </div>
                  )}

                  <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
                    <h3 className="font-bold text-lg text-center md:text-left">
                      {selectedDate 
                        ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                        : "Selecione uma data para ver os horários"}
                    </h3>
                    {loadingTimes ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Carregando horários disponíveis...
                      </div>
                    ) : selectedDate ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableTimes.map((time) => (
                          <button
                            key={time}
                            onClick={() => handleSelectTime(time)}
                            className={cn(
                              'py-2.5 rounded-xl font-mono font-medium border transition-all text-sm',
                              selectedTime === time
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-secondary border-border hover:border-primary/50'
                            )}
                          >
                            {time}
                          </button>
                        ))}
                        {availableTimes.length === 0 && (
                          <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                            Nenhum horário disponível nesta data.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        Escolha um dia no calendário.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="max-w-md mx-auto">
                <div className="bg-secondary/50 rounded-2xl p-4 mb-6 border border-border text-sm space-y-2">
                  <div className="flex items-center gap-3 pb-3 border-b border-border mb-2">
                    {selectedBarberId === 'qualquer' ? (
                      <img
                        src="https://i.imgur.com/Vs3Oba1.jpeg"
                        alt="Qualquer Um"
                        className="w-10 h-10 rounded-full object-cover object-[center_15%] border border-border"
                      />
                    ) : (
                      <img
                        src={BARBERS.find(b => b.id === selectedBarberId)?.image}
                        alt="Barbeiro"
                        className="w-10 h-10 rounded-full object-cover object-[center_15%] border border-border"
                      />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Profissional selecionado</p>
                      <p className="font-semibold text-foreground">
                        {selectedBarberId === 'qualquer' 
                          ? `Qualquer Barbeiro (Primeiro Disponível)` 
                          : BARBERS.find(b => b.id === selectedBarberId)?.name}
                      </p>
                    </div>
                  </div>
                  <p><span className="text-muted-foreground">Serviço:</span> <span className="font-semibold">{combinedServiceName}</span></p>
                  <p><span className="text-muted-foreground">Data:</span> <span className="font-semibold">{selectedDate && format(selectedDate, 'dd/MM/yyyy')}</span></p>
                  <p><span className="text-muted-foreground">Horário:</span> <span className="font-semibold">{selectedTime}</span></p>
                  <p><span className="text-muted-foreground">Valor:</span> <span className="font-semibold font-mono">R$ {totalPrice},00</span></p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Nome Completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="w-full bg-secondary border border-border rounded-xl p-4 focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(41) 99999-9999"
                      maxLength={15}
                      className="w-full bg-secondary border border-border rounded-xl p-4 focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={!name.trim() || !phone.trim()}
                    className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl glow-shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    Finalizar Agendamento
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="bg-card p-8 rounded-3xl card-shadow w-full max-w-sm border border-border text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <h3 className="text-lg font-bold">Salvando seu Horário...</h3>
              <p className="text-muted-foreground text-sm">
                Estamos registrando seu agendamento na nossa agenda e preparando sua mensagem do WhatsApp.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Bump Modal */}
      <AnimatePresence>
        {showOrderBump && selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card p-6 md:p-8 rounded-3xl card-shadow w-full max-w-md border border-border"
            >
              <h3 className="text-xl font-bold mb-2">Aproveite e adicione também:</h3>
              <p className="text-muted-foreground text-sm mb-6">Complete seu visual com nossos serviços mais pedidos.</p>

              <div className="space-y-3 mb-8">
                {SERVICES.filter(s => 
                  ['Barba', 'Sobrancelha', 'Limpeza Nasal'].includes(s.name) && 
                  s.name !== selectedService.name
                ).map(addon => {
                  const isSelected = bumpSelections.some(b => b.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      onClick={() => {
                        if (isSelected) {
                          setBumpSelections(bumpSelections.filter(b => b.name !== addon.name));
                        } else {
                          setBumpSelections([...bumpSelections, addon]);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border bg-secondary hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center border",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground bg-transparent"
                        )}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
                        </div>
                        <span className="font-semibold">{addon.name}</span>
                      </div>
                      <span className="text-primary font-bold text-sm text-right">
                        +R$ {addon.price},00 <br className="md:hidden" /><span className="text-muted-foreground text-xs font-normal"> / +{addon.time} min</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setExtras(bumpSelections);
                    setStep(3);
                    setShowOrderBump(false);
                  }}
                  className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  Continuar
                </button>
                <button
                  onClick={() => {
                    setExtras([]);
                    setBumpSelections([]);
                    setStep(3);
                    setShowOrderBump(false);
                  }}
                  className="w-full py-3 text-muted-foreground font-medium rounded-xl hover:bg-secondary/50 transition-all text-sm"
                >
                  Não, obrigado. (Avançar)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card p-8 rounded-3xl card-shadow w-full max-w-sm border border-border text-center relative"
            >
              <button
                onClick={() => setShowSuccess(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Agendamento Realizado!</h3>
              <p className="text-muted-foreground text-sm">
                Seu agendamento foi enviado com sucesso. Aguarde a confirmação da Barbearia pelo WhatsApp.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BookingSection;
