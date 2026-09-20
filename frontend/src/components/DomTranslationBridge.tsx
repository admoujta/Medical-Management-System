import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppLanguage, normalizeAppLanguage, toFrenchUiPhrase, translateUiPhrase } from '../i18n'

const attributes = ['placeholder', 'title', 'aria-label'] as const
const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Map<string, string>>()
const renderedText = new WeakMap<Text, string>()
const renderedAttributes = new WeakMap<Element, Map<string, string>>()

function translateTextNode(node: Text, language: AppLanguage) {
  const current = node.nodeValue ?? ''
  const compact = current.trim()
  if (!compact) return
  const previousRender = renderedText.get(node)
  if (!originalText.has(node) || (previousRender !== undefined && current !== previousRender)) {
    originalText.set(node, toFrenchUiPhrase(compact))
  }
  const source = originalText.get(node) ?? compact
  const translated = translateUiPhrase(source, language)
  if (translated === source && language !== 'fr') return
  const leading = current.match(/^\s*/)?.[0] ?? ''
  const trailing = current.match(/\s*$/)?.[0] ?? ''
  const nextValue = `${leading}${language === 'fr' ? source : translated}${trailing}`
  if (nextValue !== current) node.nodeValue = nextValue
  renderedText.set(node, nextValue)
}

function translateElement(element: Element, language: AppLanguage) {
  if (element.closest('[data-no-auto-translate],script,style,code,pre')) return
  let originals = originalAttributes.get(element)
  if (!originals) {
    originals = new Map()
    originalAttributes.set(element, originals)
  }
  let rendered = renderedAttributes.get(element)
  if (!rendered) {
    rendered = new Map()
    renderedAttributes.set(element, rendered)
  }
  for (const attribute of attributes) {
    const current = element.getAttribute(attribute)
    if (!current) continue
    const previousRender = rendered.get(attribute)
    if (!originals.has(attribute) || (previousRender !== undefined && current !== previousRender)) {
      originals.set(attribute, toFrenchUiPhrase(current))
    }
    const source = originals.get(attribute) ?? current
    const translated = language === 'fr' ? source : translateUiPhrase(source, language)
    if (translated !== current) element.setAttribute(attribute, translated)
    rendered.set(attribute, translated)
  }
}

function translateTree(root: Node, language: AppLanguage) {
  if (root instanceof Text) {
    translateTextNode(root, language)
    return
  }
  if (!(root instanceof Element || root instanceof Document)) return
  if (root instanceof Element) translateElement(root, language)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (node instanceof Text) translateTextNode(node, language)
    else if (node instanceof Element) translateElement(node, language)
    node = walker.nextNode()
  }
}

export function DomTranslationBridge() {
  const { i18n } = useTranslation()
  useEffect(() => {
    const language = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language) ?? 'fr'
    let applying = false
    const apply = (root: Node) => {
      if (applying) return
      applying = true
      translateTree(root, language)
      applying = false
    }
    apply(document.body)
    const observer = new MutationObserver(records => {
      if (applying) return
      for (const record of records) {
        if (record.type === 'characterData') apply(record.target)
        record.addedNodes.forEach(apply)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [i18n, i18n.resolvedLanguage])
  return null
}
