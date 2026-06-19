'use client';

/**
 * TTS de NutriLens vía Web Speech API del navegador (`speechSynthesis`).
 * Gratis, sin backend ni ElevenLabs — gpt-5.1 genera el TEXTO (es un LLM, no
 * hace audio); acá lo "hablamos" localmente. Elige una voz en español si hay.
 *
 * Cuando haya un deployment de TTS (Azure/OpenAI), se reemplaza por
 * `POST /api/voice/speak` sin tocar los callers (misma firma `speak`).
 */
function pickSpanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith('es-ar')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('es-419')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('es'))
  );
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, handlers?: { onStart?: () => void; onEnd?: () => void }): void {
  if (!isSpeechSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel(); // corta lo anterior: una sola voz a la vez
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 1.05;
  utterance.pitch = 1.05;
  const voice = pickSpanishVoice();
  if (voice) utterance.voice = voice;
  utterance.onstart = () => handlers?.onStart?.();
  utterance.onend = () => handlers?.onEnd?.();
  utterance.onerror = () => handlers?.onEnd?.();
  synth.speak(utterance);
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
