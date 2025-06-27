export async function loadScaffoldData() {
  try {
    const response = await fetch('/api/scaffold-data')
    if (!response.ok) {
      throw new Error('Failed to load scaffold data')
    }
    return await response.json()
  } catch (error) {
    console.error('Error loading scaffold data:', error)
    return null
  }
}
