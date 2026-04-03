import { useState } from 'react'
import { Copy, Sun, Moon, Languages, ArrowLeftRight, FileCode2 } from 'lucide-react'

const translations = {
  en: {
    title: 'XML ↔ JSON Converter',
    subtitle: 'Convert XML to JSON and JSON to XML. Uses native DOMParser — no server, no uploads.',
    xmlToJson: 'XML to JSON',
    jsonToXml: 'JSON to XML',
    inputLabel: 'Input',
    outputLabel: 'Output',
    inputPlaceholderXml: 'Paste your XML here...',
    inputPlaceholderJson: 'Paste your JSON here...',
    convert: 'Convert',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear',
    error: 'Parse error',
    builtBy: 'Built by',
  },
  pt: {
    title: 'Conversor XML ↔ JSON',
    subtitle: 'Converta XML para JSON e JSON para XML. Usa DOMParser nativo — sem servidor, sem upload.',
    xmlToJson: 'XML para JSON',
    jsonToXml: 'JSON para XML',
    inputLabel: 'Entrada',
    outputLabel: 'Saida',
    inputPlaceholderXml: 'Cole seu XML aqui...',
    inputPlaceholderJson: 'Cole seu JSON aqui...',
    convert: 'Converter',
    copy: 'Copiar',
    copied: 'Copiado!',
    clear: 'Limpar',
    error: 'Erro de parse',
    builtBy: 'Criado por',
  },
} as const

type Lang = keyof typeof translations

function xmlNodeToObj(node: Node): unknown {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').trim()
    return text === '' ? null : text
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element
    const obj: Record<string, unknown> = {}
    // attributes
    for (const attr of Array.from(el.attributes)) {
      obj[`@${attr.name}`] = attr.value
    }
    // children
    const children = Array.from(el.childNodes).filter(n =>
      n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '')
    )
    if (children.length === 0) {
      if (Object.keys(obj).length === 0) return null
    } else if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      const text = (children[0].textContent ?? '').trim()
      if (Object.keys(obj).length === 0) return text
      obj['#text'] = text
    } else {
      for (const child of children) {
        if (child.nodeType !== Node.ELEMENT_NODE) continue
        const childEl = child as Element
        const childVal = xmlNodeToObj(child)
        if (obj[childEl.tagName] !== undefined) {
          if (!Array.isArray(obj[childEl.tagName])) {
            obj[childEl.tagName] = [obj[childEl.tagName]]
          }
          ;(obj[childEl.tagName] as unknown[]).push(childVal)
        } else {
          obj[childEl.tagName] = childVal
        }
      }
    }
    return obj
  }
  return null
}

function xmlToJson(xmlStr: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  const errNode = doc.querySelector('parsererror')
  if (errNode) throw new Error(errNode.textContent ?? 'XML parse error')
  const root = doc.documentElement
  const result: Record<string, unknown> = {}
  result[root.tagName] = xmlNodeToObj(root)
  return JSON.stringify(result, null, 2)
}

function objToXml(key: string, value: unknown, indent: number): string {
  const pad = '  '.repeat(indent)
  if (value === null || value === undefined) return `${pad}<${key}/>`
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${pad}<${key}>${String(value)}</${key}>`
  }
  if (Array.isArray(value)) {
    return value.map(v => objToXml(key, v, indent)).join('\n')
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const attrs = Object.entries(obj)
      .filter(([k]) => k.startsWith('@'))
      .map(([k, v]) => ` ${k.slice(1)}="${String(v)}"`)
      .join('')
    const children = Object.entries(obj).filter(([k]) => !k.startsWith('@'))
    if (children.length === 0) return `${pad}<${key}${attrs}/>`
    const inner = children.map(([k, v]) => {
      if (k === '#text') return `${'  '.repeat(indent + 1)}${String(v)}`
      return objToXml(k, v, indent + 1)
    }).join('\n')
    return `${pad}<${key}${attrs}>\n${inner}\n${pad}</${key}>`
  }
  return `${pad}<${key}>${String(value)}</${key}>`
}

function jsonToXml(jsonStr: string): string {
  const obj = JSON.parse(jsonStr) as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length !== 1) throw new Error('JSON root must have exactly one key')
  const root = keys[0]
  return `<?xml version="1.0" encoding="UTF-8"?>\n${objToXml(root, obj[root], 0)}`
}

export default function XmlToJson() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [mode, setMode] = useState<'xml2json' | 'json2xml'>('xml2json')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const t = translations[lang]

  const toggleDark = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }

  const handleConvert = () => {
    setError('')
    setOutput('')
    try {
      if (mode === 'xml2json') {
        setOutput(xmlToJson(input))
      } else {
        setOutput(jsonToXml(input))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleCopy = () => {
    if (!output) return
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const placeholder = mode === 'xml2json' ? t.inputPlaceholderXml : t.inputPlaceholderJson

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <FileCode2 size={18} className="text-white" />
            </div>
            <span className="font-semibold">XML ↔ JSON</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button onClick={toggleDark} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/xml-to-json" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit">
            {([['xml2json', t.xmlToJson], ['json2xml', t.jsonToXml]] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setOutput(''); setError('') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${mode === m ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
              >
                <ArrowLeftRight size={13} />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <h2 className="font-semibold">{t.inputLabel}</h2>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={placeholder}
                rows={14}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {error && (
                <div className="rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  {t.error}: {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleConvert}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                >
                  <ArrowLeftRight size={15} />
                  {t.convert}
                </button>
                <button
                  onClick={() => { setInput(''); setOutput(''); setError('') }}
                  className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {t.clear}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t.outputLabel}</h2>
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  <Copy size={12} />
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <pre className="min-h-[300px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 font-mono text-sm overflow-auto whitespace-pre-wrap break-all select-all">
                {output || <span className="text-zinc-400 italic">...</span>}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-green-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
