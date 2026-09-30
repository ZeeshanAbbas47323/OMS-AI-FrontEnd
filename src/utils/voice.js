import { API_BASE, getApiKey } from '../config'

/**
 * Recording a question, and hearing an answer read back.
 *
 * Speech arrives a sentence at a time and is queued, so playback starts on
 * the first sentence — about five seconds — rather than after the whole
 * reply, which took fifteen.
 */

export async function transcribe(blob) {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')

  const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Could not read that recording.')
  return res.json()
}

/**
 * Plays a reply aloud, sentence by sentence.
 *
 * Returns a handle with stop(); onSentence fires as each piece starts, so
 * the caller can show which line is being read.
 */
export function speakStreaming(text, { onSentence, onDone, onError } = {}) {
  const controller = new AbortController()
  const queue = []
  let current = null
  let finished = false
  let stopped = false

  const playNext = () => {
    if (stopped) return
    const next = queue.shift()
    if (!next) {
      current = null
      if (finished) onDone?.()
      return
    }
    onSentence?.(next.index, next.text)
    const audio = new Audio(next.url)
    current = audio
    audio.onended = () => {
      URL.revokeObjectURL(next.url)
      playNext()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(next.url)
      playNext()
    }
    audio.play().catch(() => playNext())
  }

  const enqueue = (payload) => {
    const bytes = Uint8Array.from(atob(payload.audio), c => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
    queue.push({ index: payload.index, text: payload.text, url })
    if (!current) playNext()
  }

  ;(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/voice/speak-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': getApiKey() },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error('Could not read that out.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Server-sent events are separated by a blank line.
        let split
        while ((split = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, split)
          buffer = buffer.slice(split + 2)

          if (block.startsWith('event: error')) throw new Error('Could not read that out.')
          if (block.startsWith('event: done')) continue

          const line = block.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          const payload = JSON.parse(line.slice(6))
          if (payload.audio) enqueue(payload)
        }
      }
      finished = true
      if (!current) onDone?.()
    } catch (err) {
      if (err.name !== 'AbortError') onError?.(err)
    }
  })()

  return {
    stop() {
      stopped = true
      finished = true
      controller.abort()
      current?.pause()
      current = null
      queue.forEach(item => URL.revokeObjectURL(item.url))
      queue.length = 0
    },
  }
}

/** Records from the microphone until stop() is called. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks = []
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data)
  recorder.start()

  return {
    stop() {
      return new Promise(resolve => {
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }))
        }
        recorder.stop()
      })
    },
  }
}
