export interface ServiceOption {
  label: string;
  price: number;
  time: number;
}

export interface Service {
  name: string;
  time: number;
  price: number;
  image: string;
  category: string;
  options?: ServiceOption[];
}

export interface ScheduleBlock {
  id: string;
  date: string;
  allDay: boolean;
  start?: string;
  end?: string;
  reason: string;
  barberId?: string;
}

export interface Booking {
  id: string;
  service: string;
  price: number;
  date: string;
  time: string;
  name: string;
  phone: string;
  status: 'pending' | 'accepted' | 'completed';
  barberId?: string;
  is_plan_usage?: boolean;
}

export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    try {
      return window.crypto.randomUUID();
    } catch (e) {
      console.warn("randomUUID failed, falling back to math.random", e);
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface Barber {
  id: string;
  name: string;
  role: 'barber' | 'owner';
  image: string;
  password?: string;
  serviceCommissionRate: number;
  planCommissionRate: number;
}

export const NO_PHOTO_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23121214'/%3E%3Ccircle cx='100' cy='76' r='36' fill='%2327272a'/%3E%3Cpath d='M38 174c0-34 26-52 62-52s62 18 62 52' fill='%2327272a'/%3E%3Ccircle cx='100' cy='100' r='96' fill='none' stroke='%23d4af37' stroke-opacity='0.3' stroke-width='3'/%3E%3C/svg%3E";

export const INITIAL_BARBERS: Barber[] = [
  {
    id: 'luiz',
    name: 'Luiz',
    role: 'barber',
    image: 'https://i.imgur.com/7HOA0Ew.png',
    password: '8888',
    serviceCommissionRate: 0.5,
    planCommissionRate: 0.1
  },
  {
    id: 'vitinho',
    name: 'Vitinho',
    role: 'barber',
    image: 'https://i.imgur.com/LuzBTyK.jpeg',
    password: '8888',
    serviceCommissionRate: 0.5,
    planCommissionRate: 0.1
  },
  {
    id: 'kaua',
    name: 'Kauã Pimentel',
    role: 'barber',
    image: NO_PHOTO_AVATAR,
    password: '0000',
    serviceCommissionRate: 0.5,
    planCommissionRate: 0.1
  },
  {
    id: 'dono',
    name: 'Jean (Dono)',
    role: 'owner',
    image: 'https://i.imgur.com/npARx9Q.jpeg',
    password: '1999',
    serviceCommissionRate: 1.0,
    planCommissionRate: 1.0
  }
];

const BARBERS_STORAGE_KEY = 'classea_barbers_list';

export function getStoredBarbers(): Barber[] {
  if (typeof window === 'undefined') return INITIAL_BARBERS;
  try {
    const raw = localStorage.getItem(BARBERS_STORAGE_KEY);
    if (!raw) return INITIAL_BARBERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let changed = false;
      // Garante que o Kauã esteja presente
      if (!parsed.some(b => b.id === 'kaua')) {
        const kaua = INITIAL_BARBERS.find(b => b.id === 'kaua')!;
        const donoIdx = parsed.findIndex(b => b.role === 'owner');
        if (donoIdx >= 0) {
          parsed.splice(donoIdx, 0, kaua);
        } else {
          parsed.push(kaua);
        }
        changed = true;
      }

      // Se o Kauã estiver com a foto antiga do unsplash, remove a foto
      const kauaItem = parsed.find(b => b.id === 'kaua');
      if (kauaItem && kauaItem.image && kauaItem.image.includes('unsplash')) {
        kauaItem.image = NO_PHOTO_AVATAR;
        changed = true;
      }

      if (changed) {
        localStorage.setItem(BARBERS_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler barbeiros salvos:', e);
  }
  return INITIAL_BARBERS;
}

export function saveStoredBarbers(barbers: Barber[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BARBERS_STORAGE_KEY, JSON.stringify(barbers));
  } catch (e) {
    console.error('Erro ao salvar barbeiros:', e);
  }
}

export function addCustomBarber(newBarber: { name: string; password?: string; image?: string }): Barber {
  const current = getStoredBarbers();
  const slug = newBarber.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const id = slug || `barber_${Date.now()}`;
  
  const created: Barber = {
    id,
    name: newBarber.name.trim(),
    role: 'barber',
    image: newBarber.image?.trim() || NO_PHOTO_AVATAR,
    password: newBarber.password?.trim() || '0000',
    serviceCommissionRate: 0.5,
    planCommissionRate: 0.1
  };

  const donoIdx = current.findIndex(b => b.role === 'owner');
  if (donoIdx >= 0) {
    current.splice(donoIdx, 0, created);
  } else {
    current.push(created);
  }

  saveStoredBarbers(current);
  return created;
}

export function removeCustomBarber(id: string): void {
  const current = getStoredBarbers();
  const filtered = current.filter(b => b.id !== id || b.role === 'owner');
  saveStoredBarbers(filtered);
}

export function getBarberName(id?: string): string {
  if (!id) return 'Não atribuído';
  const found = getStoredBarbers().find(b => b.id === id);
  return found ? found.name : id;
}

export const BARBERS: Barber[] = new Proxy([] as Barber[], {
  get(target, prop, receiver) {
    const current = getStoredBarbers();
    if (prop === 'length') return current.length;
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return current[Number(prop)];
    }
    const val = (current as any)[prop];
    if (typeof val === 'function') {
      return val.bind(current);
    }
    return Reflect.get(current, prop, receiver);
  }
});

export interface Subscription {
  id: string;
  client_name: string;
  client_phone: string;
  plan_type: string;
  total_cuts: number;
  used_cuts: number;
  barber_id: string;
  price: number;
  status: 'active' | 'expired' | 'canceled';
  created_at: string;
}

export interface BarberCommission {
  barber_id: string;
  barber_name: string;
  commission_percentage: number;
}

export interface PlanOption {
  id: string;
  name: string;
  totalServices: number;
  price: number;
}

export const PLAN_OPTIONS: PlanOption[] = [
  { id: 'plan-100', name: '4 Cortes', totalServices: 4, price: 100 },
  { id: 'plan-120', name: '2 Cortes + 2 Barbas', totalServices: 4, price: 120 },
  { id: 'plan-140', name: '4 Cortes + 2 Barbas', totalServices: 6, price: 140 },
  { id: 'plan-160', name: '4 Cortes + 4 Sobrancelhas + 4 Meia Sola', totalServices: 12, price: 160 },
  { id: 'plan-180', name: '4 Cortes + 4 Barbas + 4 Sobrancelhas', totalServices: 12, price: 180 },
  { id: 'plan-custom', name: 'Personalizado', totalServices: 1, price: 0 }
];

export const SERVICES: Service[] = [
  // Cabelo
  { name: 'Degradê', time: 45, price: 35, image: 'https://i.imgur.com/I4t6W6N.jpeg', category: 'Cabelo' },
  { name: 'Corte Social', time: 30, price: 30, image: 'https://i.imgur.com/8eOwAxa.jpeg', category: 'Cabelo' },
  { name: 'Meia Sola', time: 20, price: 15, image: 'https://i.imgur.com/jcMfc3R.jpeg', category: 'Cabelo' },
  { name: 'Pigmentação', time: 20, price: 30, image: 'https://i.imgur.com/9OfKc3K.jpeg', category: 'Cabelo' },
  { name: 'Luzes', time: 210, price: 140, image: 'https://i.imgur.com/UwogcoN.jpeg', category: 'Cabelo' },

  // Barba
  { name: 'Barba', time: 30, price: 35, image: 'https://i.imgur.com/Dx3OY7I.jpeg', category: 'Barba' },

  // Sobrancelha
  { name: 'Sobrancelha', time: 15, price: 15, image: 'https://i.imgur.com/nGCtuxp.jpeg', category: 'Sobrancelha' },

  // Limpeza
  { name: 'Limpeza de Pele', time: 15, price: 15, image: 'https://i.imgur.com/RIhqm9H.jpeg', category: 'Limpeza' },
  { name: 'Limpeza Nasal', time: 15, price: 15, image: 'https://i.imgur.com/yW2T86c.jpeg', category: 'Limpeza' }
];

export const GALLERY_IMAGES = [
  'https://i.imgur.com/MmfJB5q.jpeg',
  'https://i.imgur.com/nHMKfR0.jpeg',
  'https://i.imgur.com/hrqwaa2.jpeg',
  'https://i.imgur.com/7eiD0Vf.jpeg',
  'https://i.imgur.com/aJYLvTj.jpeg',
  'https://i.imgur.com/jq04SIz.jpeg'
];

export const WHATSAPP_NUMBER = '554184491703';

export function isOpenNow(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeValue = hour * 60 + minute;

  if (day === 0) return false; // Fechado aos Domingos
  // Segunda a Sábado: 09:00 às 20:00
  return timeValue >= 540 && timeValue <= 1200;
}

export function isDayAllowed(date: Date): boolean {
  return date.getDay() !== 0; // Fechado aos Domingos
}

export function getTimesForDate(date: Date): string[] {
  const day = date.getDay();
  if (day === 0) return []; // Domingos
  
  // Retorna slots a cada 1 hora das 09:00 às 20:00
  const slots: string[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    const hStr = hour.toString().padStart(2, '0');
    slots.push(`${hStr}:00`);
  }
  return slots;
}

export function getBookingDuration(serviceName: string): number {
  const names = serviceName.split(' + ');
  let total = 0;
  names.forEach(name => {
    let baseName = name;
    let optionLabel = '';
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      baseName = parts[0];
      optionLabel = parts[1];
    }
    const svc = SERVICES.find(s => s.name === baseName);
    if (svc) {
      if (svc.options && optionLabel) {
        const opt = svc.options.find(o => o.label === optionLabel);
        if (opt) {
          total += opt.time;
          return;
        }
      }
      total += svc.time;
    }
  });
  return total || 120; // padrão 120min se não encontrado
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  return `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

