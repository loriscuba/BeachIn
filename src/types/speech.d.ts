/**
 * Tipi minimi per la Web Speech API (riconoscimento vocale), non inclusi nella
 * lib DOM standard di TypeScript. Bastano per l'assistente vocale.
 */
export {}

declare global {
  interface SpeechRecognitionAlternative {
    readonly transcript: string
    readonly confidence: number
  }
  interface SpeechRecognitionResult {
    readonly length: number
    item(index: number): SpeechRecognitionAlternative
    readonly [index: number]: SpeechRecognitionAlternative
    readonly isFinal: boolean
  }
  interface SpeechRecognitionResultList {
    readonly length: number
    item(index: number): SpeechRecognitionResult
    readonly [index: number]: SpeechRecognitionResult
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number
    readonly results: SpeechRecognitionResultList
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string
    readonly message: string
  }
  interface SpeechRecognition extends EventTarget {
    lang: string
    continuous: boolean
    interimResults: boolean
    maxAlternatives: number
    start(): void
    stop(): void
    abort(): void
    onstart: ((ev: Event) => void) | null
    onresult: ((ev: SpeechRecognitionEvent) => void) | null
    onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null
    onend: ((ev: Event) => void) | null
  }
  interface SpeechRecognitionStatic {
    new (): SpeechRecognition
  }
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic
    webkitSpeechRecognition?: SpeechRecognitionStatic
  }
}
