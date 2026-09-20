import { useEffect } from 'react'

type CabinetSeoData = {
  slug: string
  name: string
  specialty: string
  city: string
  title: string
  description: string
  keywords: string | null
  canonical_url: string | null
  social_image_url: string | null
  indexable: boolean
}

const apiUrl = import.meta.env.VITE_API_URL ?? ''

function setMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  const created = !element
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value))
    document.head.appendChild(element)
  }
  const previous = element.getAttribute('content')
  element.setAttribute('content', content)
  return () => {
    if (created) element?.remove()
    else if (previous === null) element?.removeAttribute('content')
    else element?.setAttribute('content', previous)
  }
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const created = !element
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  const previous = element.getAttribute('href')
  element.href = url
  return () => {
    if (created) element?.remove()
    else if (previous === null) element?.removeAttribute('href')
    else element?.setAttribute('href', previous)
  }
}

export function useCabinetSeo(cabinetSlug?: string) {
  useEffect(() => {
    if (!cabinetSlug) return
    const controller = new AbortController()
    let restore: Array<() => void> = []
    fetch(`${apiUrl}/api/public/cabinets/${encodeURIComponent(cabinetSlug)}/seo`, {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) throw new Error('Configuration SEO indisponible.')
        return response.json() as Promise<CabinetSeoData>
      })
      .then(seo => {
        const previousTitle = document.title
        const canonical = seo.canonical_url || `${window.location.origin}/cabinet/${encodeURIComponent(seo.slug)}`
        const socialImage = seo.social_image_url
          ? new URL(seo.social_image_url, window.location.origin).toString()
          : `${window.location.origin}/images/fadaa-clinic-hero.webp`
        document.title = seo.title
        restore = [
          () => { document.title = previousTitle },
          setMeta('meta[name="description"]', { name: 'description' }, seo.description),
          setMeta('meta[name="keywords"]', { name: 'keywords' }, seo.keywords ?? `${seo.specialty}, médecin, ${seo.city}, rendez-vous médical`),
          setMeta('meta[name="robots"]', { name: 'robots' }, seo.indexable ? 'index, follow' : 'noindex, nofollow'),
          setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website'),
          setMeta('meta[property="og:title"]', { property: 'og:title' }, seo.title),
          setMeta('meta[property="og:description"]', { property: 'og:description' }, seo.description),
          setMeta('meta[property="og:url"]', { property: 'og:url' }, canonical),
          setMeta('meta[property="og:image"]', { property: 'og:image' }, socialImage),
          setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image'),
          setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, seo.title),
          setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, seo.description),
          setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, socialImage),
          setCanonical(canonical),
        ]
        const structuredData = document.createElement('script')
        structuredData.type = 'application/ld+json'
        structuredData.dataset.cabinetSeo = seo.slug
        structuredData.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'MedicalClinic',
          name: seo.name,
          medicalSpecialty: seo.specialty,
          address: { '@type': 'PostalAddress', addressLocality: seo.city },
          url: canonical,
          image: socialImage,
        })
        document.head.appendChild(structuredData)
        restore.push(() => structuredData.remove())
      })
      .catch(() => undefined)
    return () => {
      controller.abort()
      restore.reverse().forEach(action => action())
    }
  }, [cabinetSlug])
}

export function CabinetSeo({ cabinetSlug }: { cabinetSlug: string }) {
  useCabinetSeo(cabinetSlug)
  return null
}
