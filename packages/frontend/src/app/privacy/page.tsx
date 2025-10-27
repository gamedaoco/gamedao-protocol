async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return ''
    const html = await res.text()
    const mainMatch = html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i)
    const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i)
    const raw = (mainMatch?.[1] || bodyMatch?.[1] || '')
    return raw.replace(/<script[\s\S]*?<\/script>/gi, '')
  } catch {
    return ''
  }
}

export default async function PrivacyPage() {
  const content = await fetchPageContent('https://gamedao.co/privacy')
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold mb-6">Privacy Policy</h1>
      {content ? (
        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load privacy policy. Please visit <a className="underline" href="https://gamedao.co/privacy" target="_blank" rel="noreferrer">gamedao.co/privacy</a>.</p>
      )}
    </div>
  )
}


