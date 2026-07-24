import { Booking, ScheduleBlock } from './types';

const BOOKINGS_KEY = 'classea_bookings';
const COMPLETED_KEY = 'classea_completed';
const BLOCKS_KEY = 'studiogaby_blocks';

export function getBlocks(): ScheduleBlock[] {
  return JSON.parse(localStorage.getItem(BLOCKS_KEY) || '[]');
}

export function saveBlocks(blocks: ScheduleBlock[]): void {
  localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
}

export function addBlock(block: ScheduleBlock): void {
  const blocks = getBlocks();
  blocks.push(block);
  saveBlocks(blocks);
}

export function removeBlock(id: string): void {
  const blocks = getBlocks().filter(b => b.id !== id);
  saveBlocks(blocks);
}

export function getBookings(): Booking[] {
  return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]');
}

export function saveBookings(bookings: Booking[]): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function addBooking(booking: Booking): void {
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);
}

export function removeBooking(id: string): void {
  const bookings = getBookings().filter(b => b.id !== id);
  saveBookings(bookings);
}

export function getCompleted(): Booking[] {
  return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
}

export function saveCompleted(completed: Booking[]): void {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
}

export function addCompleted(booking: Booking): void {
  const completed = getCompleted();
  completed.push({ ...booking, status: 'completed' });
  saveCompleted(completed);
}

export function removeCompleted(id: string): Booking | undefined {
  const completed = getCompleted();
  const removed = completed.find(b => b.id === id);
  saveCompleted(completed.filter(b => b.id !== id));
  return removed;
}

// Weekday Slots Whitelist Configuration (Local Fallback)
const SLOTS_KEY = 'classea_weekday_slots';

export interface WeekdaySlot {
  id?: string;
  weekday: number;
  time: string;
}

export function getLocalWeekdaySlots(): WeekdaySlot[] {
  return JSON.parse(localStorage.getItem(SLOTS_KEY) || '[]');
}

export function saveLocalWeekdaySlots(slots: WeekdaySlot[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function addLocalWeekdaySlot(slot: WeekdaySlot): void {
  const slots = getLocalWeekdaySlots();
  if (!slots.some(s => s.weekday === slot.weekday && s.time === slot.time)) {
    slots.push(slot);
    saveLocalWeekdaySlots(slots);
  }
}

export function removeLocalWeekdaySlot(weekday: number, time: string): void {
  const slots = getLocalWeekdaySlots().filter(s => !(s.weekday === weekday && s.time === time));
  saveLocalWeekdaySlots(slots);
}

export function clearLocalWeekdaySlotsForDay(weekday: number): void {
  const slots = getLocalWeekdaySlots().filter(s => s.weekday !== weekday);
  saveLocalWeekdaySlots(slots);
}

export function copyLocalWeekdaySlots(fromWeekday: number, toWeekdays: number[]): void {
  const slots = getLocalWeekdaySlots();
  const sourceTimes = slots.filter(s => s.weekday === fromWeekday).map(s => s.time);
  
  // Remove target weekdays
  let newSlots = slots.filter(s => !toWeekdays.includes(s.weekday));
  
  // Add new copies
  toWeekdays.forEach(targetDay => {
    sourceTimes.forEach(time => {
      newSlots.push({ weekday: targetDay, time });
    });
  });
  
  saveLocalWeekdaySlots(newSlots);
}

// Date Specific Slots Whitelist Configuration (Local Fallback)
const DATE_SLOTS_KEY = 'classea_date_slots';

export interface DateSpecificSlot {
  id?: string;
  selected_date: string; // Formato "YYYY-MM-DD"
  time: string;          // Formato "HH:mm"
}

export function getLocalDateSlots(): DateSpecificSlot[] {
  return JSON.parse(localStorage.getItem(DATE_SLOTS_KEY) || '[]');
}

export function saveLocalDateSlots(slots: DateSpecificSlot[]): void {
  localStorage.setItem(DATE_SLOTS_KEY, JSON.stringify(slots));
}

export function addLocalDateSlot(slot: DateSpecificSlot): void {
  const slots = getLocalDateSlots();
  if (!slots.some(s => s.selected_date === slot.selected_date && s.time === slot.time)) {
    slots.push(slot);
    saveLocalDateSlots(slots);
  }
}

export function removeLocalDateSlot(selected_date: string, time: string): void {
  const slots = getLocalDateSlots().filter(s => !(s.selected_date === selected_date && s.time === time));
  saveLocalDateSlots(slots);
}

export function clearLocalDateSlotsForDate(selected_date: string): void {
  const slots = getLocalDateSlots().filter(s => s.selected_date !== selected_date);
  saveLocalDateSlots(slots);
}

export function copyLocalWeekdayToDateSlots(fromWeekday: number, to_dates: string[]): void {
  const weekdaySlots = getLocalWeekdaySlots();
  const sourceTimes = weekdaySlots.filter(s => s.weekday === fromWeekday).map(s => s.time);
  
  const slots = getLocalDateSlots();
  // Remove target dates
  let newSlots = slots.filter(s => !to_dates.includes(s.selected_date));
  
  // Add new copies
  to_dates.forEach(targetDate => {
    sourceTimes.forEach(time => {
      newSlots.push({ selected_date: targetDate, time });
    });
  });
  
  saveLocalDateSlots(newSlots);
}

export function copyLocalDateSlots(from_date: string, to_dates: string[]): void {
  const slots = getLocalDateSlots();
  const sourceTimes = slots.filter(s => s.selected_date === from_date).map(s => s.time);
  
  // Remove target dates
  let newSlots = slots.filter(s => !to_dates.includes(s.selected_date));
  
  // Add new copies
  to_dates.forEach(targetDate => {
    sourceTimes.forEach(time => {
      newSlots.push({ selected_date: targetDate, time });
    });
  });
  
  saveLocalDateSlots(newSlots);
}
