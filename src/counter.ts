let count = 0;

export function incrementCounter(): void {
  count++;
}

export function decrementCounter(): void {
  count--;
}

export function resetCounter(): void {
  count = 0;
}

export function getCounter(): number {
  return count;
}