import { readFile } from 'fs/promises'
import path from 'path'
import ReactMarkdown from 'react-markdown'

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

export default async function TermsPage() {
  // Try local terms.txt first
  let textContent = ''
  try {
    const filePath = path.join(process.cwd(), 'src/app/terms/terms.md')
    textContent = await readFile(filePath, 'utf8')
  } catch {}

  const content = textContent || await fetchPageContent('https://gamedao.co/tos')
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold mb-6">Terms and Conditions</h1>
      {textContent ? (
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{textContent}</ReactMarkdown>
        </div>
      ) : content ? (
        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load terms. Please visit <a className="underline" href="https://gamedao.co/tos" target="_blank" rel="noreferrer">gamedao.co/tos</a>.</p>
      )}
    </div>
  )
}


