import type { MetadataRoute } from 'next'
import { getPublishedSlugs } from '@/lib/rutas'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const slugs = await getPublishedSlugs()

  const rutas: MetadataRoute.Sitemap = slugs.map(({ slug }) => ({
    url: `${baseUrl}/rutas/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/rutas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...rutas,
  ]
}
