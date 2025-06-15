"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import MangaBanner from '@/components/manga/manga-banner'
import MangaHeader from '@/components/manga/manga-header'
import MangaDetails from '@/components/manga/manga-details'
import MangaComments from '@/components/manga/manga-comments'
import {
  searchKitsuManga,
  getKitsuPosterImage,
  getKitsuCoverImage,
  getBestKitsuTitle,
  type KitsuManga,
} from "@/lib/kitsu-api"
import { getMangaDxChapters, getMangaDxManga, getPrimaryEnglishTitle, type Chapter } from "@/lib/mangadx-api"
import LoadingSpinner from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"

// Cache for manga data
const mangaCache = new Map<string, {
  kitsuManga: KitsuManga | null,
  chapters: Chapter[],
  timestamp: number
}>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function MangaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [mangaDxId, setMangaDxId] = useState<string | null>(null)
  const { user } = useAuth()

  const slug = params.slug as string

  useEffect(() => {
    const fetchMangaDetails = async () => {
      try {
        setLoading(true)
        console.log("MangaDetailPage: Processing slug:", slug)

        // Check cache first
        const cached = mangaCache.get(slug)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log("MangaDetailPage: Using cached data")
          setKitsuManga(cached.kitsuManga)
          setChapters(cached.chapters)
          setMangaDxId(slug)
          setLoading(false)
          return
        }

        // Check if slug is already a MangaDx ID (UUID format)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
        
        let currentMangaDxId: string
        
        if (isUUID) {
          // Slug is already a MangaDx ID
          currentMangaDxId = slug
          console.log("MangaDetailPage: Using slug as MangaDx ID:", currentMangaDxId)
        } else {
          // Slug is a title-based slug, need to search for MangaDx ID
          console.log("MangaDetailPage: Searching for MangaDx ID using slug:", slug)
          
          // Convert slug back to searchable title
          const searchTitle = slug.replace(/-/g, ' ')
          
          // Search MangaDx for the manga
          const searchResponse = await fetch(`/api/proxy/mangadx/manga?title=${encodeURIComponent(searchTitle)}&limit=1&includes[]=cover_art`)
          const searchData = await searchResponse.json()
          
          if (!searchData.data || searchData.data.length === 0) {
            console.error("MangaDetailPage: No manga found for slug:", slug)
            setLoading(false)
            return
          }
          
          currentMangaDxId = searchData.data[0].id
          console.log("MangaDetailPage: Found MangaDx ID:", currentMangaDxId)
          
          // Update URL to use MangaDx ID for consistency
          router.replace(`/manga/${currentMangaDxId}`, { scroll: false })
        }

        setMangaDxId(currentMangaDxId)

        // Get MangaDx manga details
        const mangaDxResponse = await getMangaDxManga(currentMangaDxId)
        const mdManga = mangaDxResponse.data
        
        if (!mdManga) {
          console.error("MangaDetailPage: No MangaDx manga found for ID:", currentMangaDxId)
          setLoading(false)
          return
        }

        const mdTitle = getPrimaryEnglishTitle(mdManga)
        console.log("MangaDetailPage: MangaDx title:", mdTitle)

        // Search Kitsu for additional metadata using the MangaDx title
        let kitsuData: KitsuManga | null = null
        try {
          // Try multiple search strategies for better matching
          const searchStrategies = [
            mdTitle, // Original title
            mdTitle.replace(/[^\w\s]/g, ''), // Remove special characters
            mdTitle.split(':')[0].trim(), // Take part before colon
            mdTitle.split('(')[0].trim(), // Take part before parentheses
          ]

          for (const searchTerm of searchStrategies) {
            if (kitsuData) break
            
            try {
              const kitsuSearchData = await searchKitsuManga(searchTerm, 5)
              
              // Find best match based on title similarity
              const bestMatch = kitsuSearchData.data.find(manga => {
                const kitsuTitle = getBestKitsuTitle(manga)
                
                if (!kitsuTitle) return false
                
                // Normalize titles for comparison
                const normalizeTitle = (title: string) => 
                  title.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                
                const normalizedKitsu = normalizeTitle(kitsuTitle)
                const normalizedMd = normalizeTitle(mdTitle)
                const normalizedSearch = normalizeTitle(searchTerm)
                
                // Check for exact match or high similarity
                return normalizedKitsu === normalizedMd || 
                       normalizedKitsu === normalizedSearch ||
                       normalizedKitsu.includes(normalizedSearch) ||
                       normalizedSearch.includes(normalizedKitsu)
              })
              
              if (bestMatch) {
                kitsuData = bestMatch
                console.log("MangaDetailPage: Found Kitsu match with strategy:", searchTerm)
                break
              }
            } catch (error) {
              console.warn(`MangaDetailPage: Kitsu search failed for "${searchTerm}":`, error)
            }
          }
          
          // Fallback to first result if no good match found
          if (!kitsuData && searchStrategies.length > 0) {
            try {
              const fallbackSearch = await searchKitsuManga(mdTitle, 1)
              kitsuData = fallbackSearch.data[0] || null
              console.log("MangaDetailPage: Using fallback Kitsu result")
            } catch (error) {
              console.warn("MangaDetailPage: Fallback Kitsu search failed:", error)
            }
          }
        } catch (error) {
          console.warn("MangaDetailPage: Could not fetch Kitsu data:", error)
        }

        setKitsuManga(kitsuData)

        // Get chapters from MangaDx
        const chaptersData = await getMangaDxChapters(currentMangaDxId)
        const sortedChapters = (chaptersData.data || []).sort((a, b) => {
          const aChapter = Number.parseFloat(a.attributes.chapter || "0")
          const bChapter = Number.parseFloat(b.attributes.chapter || "0")
          const aVolume = Number.parseFloat(a.attributes.volume || "0")
          const bVolume = Number.parseFloat(b.attributes.volume || "0")

          if (aVolume !== bVolume) {
            return aVolume - bVolume
          }
          return aChapter - bChapter
        })
        setChapters(sortedChapters)
        console.log("MangaDetailPage: Chapters fetched:", sortedChapters.length)

        // Cache the results
        mangaCache.set(slug, {
          kitsuManga: kitsuData,
          chapters: sortedChapters,
          timestamp: Date.now()
        })

      } catch (error) {
        console.error("MangaDetailPage: Error fetching manga details:", error)
        setKitsuManga(null)
        setChapters([])
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchMangaDetails()
    }
  }, [slug, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!mangaDxId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Manga not found</h1>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const posterUrl = kitsuManga ? getKitsuPosterImage(kitsuManga.attributes.posterImage) : "/placeholder.svg"
  const coverUrl = kitsuManga
    ? getKitsuCoverImage(kitsuManga.attributes.coverImage) || getKitsuPosterImage(kitsuManga.attributes.posterImage)
    : null
  
  // Get the best title - prioritize English titles
  const title = kitsuManga ? getBestKitsuTitle(kitsuManga) : "Unknown Title"

  // Prepare manga data for library operations - use MangaDx ID as primary identifier
  const mangaData = {
    manga_id: mangaDxId,
    manga_title: title,
    manga_slug: mangaDxId, // Use MangaDx ID as slug for consistency
    poster_url: posterUrl,
    total_chapters: kitsuManga?.attributes.chapterCount || chapters.length || undefined,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <MangaBanner 
        coverUrl={coverUrl} 
        posterUrl={posterUrl}
        title={title} 
      />
      
      <main className="relative z-10">
        {/* Hero Section with Poster and Quick Info */}
        <div className="container mx-auto px-4 -mt-32 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Poster and Quick Actions */}
            <div className="lg:w-80 flex-shrink-0">
              <MangaHeader
                kitsuManga={kitsuManga}
                mangaData={mangaData}
                mangaSlug={mangaDxId}
                chapters={chapters}
              />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <MangaDetails
                kitsuManga={kitsuManga}
                chapters={chapters}
                mangaSlug={mangaDxId}
              />
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="container mx-auto px-4 py-16">
          <MangaComments
            mangaId={mangaDxId}
            mangaTitle={title}
          />
        </div>
      </main>
    </div>
  );
}