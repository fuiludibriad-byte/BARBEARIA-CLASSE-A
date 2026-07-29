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

export interface Barber {
  id: string;
  name: string;
  role: 'barber' | 'owner';
  image: string;
  password?: string;
  serviceCommissionRate: number;
  planCommissionRate: number;
}

export const BARBERS: Barber[] = [
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
    id: 'dono',
    name: 'Jean (Dono)',
    role: 'owner',
    image: 'https://i.imgur.com/npARx9Q.jpeg',
    password: '8888',
    serviceCommissionRate: 1.0,
    planCommissionRate: 1.0
  }
];

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
  { id: 'plan-4', name: 'Plano Mensal - 4 Cortes', totalServices: 4, price: 120 },
  { id: 'plan-2', name: 'Plano Quinzenal - 2 Cortes', totalServices: 2, price: 65 },
  { id: 'plan-custom', name: 'Personalizado', totalServices: 1, price: 0 }
];

export const SERVICES: Service[] = [
  // Cabelo
  { name: 'Degradê', time: 45, price: 35, image: 'https://i.imgur.com/I4t6W6N.jpeg', category: 'Cabelo' },
  { name: 'Corte Social', time: 30, price: 30, image: 'https://i.imgur.com/8eOwAxa.jpeg', category: 'Cabelo' },
  { name: 'Meia Sola', time: 20, price: 20, image: 'https://i.imgur.com/jcMfc3R.jpeg', category: 'Cabelo' },
  { name: 'Pigmentação', time: 45, price: 30, image: 'https://i.imgur.com/9OfKc3K.jpeg', category: 'Cabelo' },
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

