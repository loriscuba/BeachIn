/** Unione condizionale di classi CSS senza dipendenze esterne. */
export type ClassValue = string | number | false | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  for (const i of inputs) {
    if (!i) continue
    if (Array.isArray(i)) out.push(cn(...i))
    else out.push(String(i))
  }
  return out.join(' ')
}
