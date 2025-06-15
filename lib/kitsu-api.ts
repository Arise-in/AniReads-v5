// Kitsu API types (simplified for relevant fields)
export interface KitsuResponse<T> {
  data: T[]
  links?: {
    first?: string
    next?: string
    last?: string
  }
  meta?: {
    count: number
  }
}

export interface KitsuManga {
  id: string
  type: "manga" | "anime"
  attributes: {
    canonicalTitle: string
    titles: {
      en?: string
      en_jp?: string
      en_us?: string
      ja_jp?: string
      [key: string]: string | undefined
    }
    description: string
    posterImage: {
      tiny?: string
      small?: string
      medium?: string
      large?: string
      original?: string
    }
    coverImage: {
      tiny?: string
      small?: string
      large?: string
      original?: string
    } | null
    startDate: string
    endDate: string | null
    averageRating: string | null
    ratingRank: number | null
    popularityRank: number | null
    status: string // "finished", "publishing", "unreleased", "cancelled", "hiatus"
    chapterCount: number | null
    volumeCount: number | null
    serialization: string | null
    mangaType: string // "manga", "novel", "one_shot", "doujin", "manhwa", "manhua"
  }
  relationships: {
    genres?: {
      links: {
        related: string
        self: string
      }
      data?: {
        id: string
        type: "genres"
        attributes?: {
          name: string
        }
      }[]
    }
    categories?: {
      links: {
        related: string
        self: string
      }
    }
    castings?: {
      links: {
        related: string
        self: string
      }
    }
    staff?: {
      links: {
        related: string
        self: string
      }
      data?: {
        id: string
        type: "staff"
        attributes?: {
          name?: string
        }
      }[]
    }
    // Add other relationships as needed
  }
}

export interface KitsuGenre {
  id: string
  type: "genres"
  attributes: {
    name: string
  }
}

// Helper function to correctly format query parameters for Kitsu API
function formatKitsuQueryParams(params: Record<string, any>): string {
  const queryParts: string[] = []

  for (const key in params) {
    const value = params[key]

    if (Array.isArray(value)) {
      value.forEach((item) => {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
      })
    } else if (typeof value === "object" && value !== null) {
      for (const subKey in value) {
        queryParts.push(
          `${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(value[subKey])}`,
        )
      }
    } else {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }

  return queryParts.join("&")
}

// Enhanced search function with better matching
export async function searchKitsuManga(query: string, limit = 20, offset = 0): Promise<KitsuResponse<KitsuManga>> {
  const params = {
    "filter[text]": query,
    "page[limit]": limit.toString(),
    "page[offset]": offset.toString(),
    "fields[manga]":
      "canonicalTitle,titles,description,posterImage,coverImage,startDate,averageRating,status,chapterCount,volumeCount,mangaType,popularityRank",
    include: "genres", // Include genres for filtering/display
    sort: "-popularityRank", // Sort by popularity for search relevance
  }
  const queryString = formatKitsuQueryParams(params)
  const response = await fetch(`/api/proxy/kitsu/manga?${queryString}`)
  return response.json()
}

export async function getKitsuMangaDetails(id: string): Promise<KitsuResponse<KitsuManga>> {
  const params = {
    "fields[manga]":
      "canonicalTitle,titles,description,posterImage,coverImage,startDate,endDate,averageRating,status,chapterCount,volumeCount,serialization,mangaType",
    include: "genres,staff", // Include genres and staff (authors/artists)
  }
  const queryString = formatKitsuQueryParams(params)
  const response = await fetch(`/api/proxy/kitsu/manga/${id}?${queryString}`)
  return response.json()
}

// Enhanced function to get manga by slug with better title matching
import { slugify } from "./slugify" // Import slugify helper

export async function getKitsuMangaBySlug(slug: string): Promise<KitsuManga | null> {
  console.log("getKitsuMangaBySlug: Input slug:", slug) // Debug log
  const filterText = slug.replace(/-/g, " ") // Convert slug back to spaces for broader search
  console.log("getKitsuMangaBySlug: filter[text] sent to Kitsu:", filterText) // Debug log

  const params = {
    "filter[text]": filterText,
    "page[limit]": "10", // Fetch a few more results to increase chances of finding exact match
    "fields[manga]":
      "canonicalTitle,titles,description,posterImage,coverImage,startDate,endDate,averageRating,status,chapterCount,volumeCount,serialization,mangaType",
    include: "genres,staff",
  }
  const queryString = formatKitsuQueryParams(params)
  const response = await fetch(`/api/proxy/kitsu/manga?${queryString}`)
  const data: KitsuResponse<KitsuManga> = await response.json()

  console.log("getKitsuMangaBySlug: Kitsu API response data:", data.data) // Debug log the raw data

  // Enhanced matching algorithm
  const foundManga = data.data.find((manga) => {
    // Get all possible titles for this manga
    const titles = [
      manga.attributes.canonicalTitle,
      manga.attributes.titles.en,
      manga.attributes.titles.en_jp,
      manga.attributes.titles.en_us,
      manga.attributes.titles.ja_jp,
      ...Object.values(manga.attributes.titles)
    ].filter(Boolean)

    // Check each title for a match
    for (const title of titles) {
      if (!title) continue
      
      const generatedSlug = slugify(title)
      console.log(
        `  Kitsu Manga ID: ${manga.id}, Title: "${title}", Generated Slug: "${generatedSlug}", Matches Input Slug: ${generatedSlug === slug}`,
      ) // Detailed debug log for each item
      
      if (generatedSlug === slug) {
        return true
      }
    }
    
    return false
  })

  console.log("getKitsuMangaBySlug: Found manga after filtering:", foundManga) // Debug log the final found manga
  return foundManga || null
}

export async function getKitsuTrendingManga(limit = 20): Promise<KitsuResponse<KitsuManga>> {
  const params = {
    "page[limit]": limit.toString(),
    "fields[manga]":
      "canonicalTitle,titles,description,posterImage,coverImage,startDate,averageRating,status,chapterCount,volumeCount,mangaType",
    include: "genres",
  }
  const queryString = formatKitsuQueryParams(params)
  const response = await fetch(`/api/proxy/kitsu/trending/manga?${queryString}`)
  return response.json()
}

export async function getKitsuRecentManga(limit = 20, offset = 0): Promise<KitsuResponse<KitsuManga>> {
  const params = {
    "page[limit]": limit.toString(),
    "page[offset]": offset.toString(),
    sort: "-createdAt", // Sort by creation date for recent additions
    "fields[manga]":
      "canonicalTitle,titles,description,posterImage,coverImage,startDate,averageRating,status,chapterCount,volumeCount,mangaType",
    include: "genres",
  }
  const queryString = formatKitsuQueryParams(params)
  const response = await fetch(`/api/proxy/kitsu/manga?${queryString}`)
  return response.json()
}

// Utility to get the best available image URL
export function getKitsuPosterImage(posterImage: KitsuManga["attributes"]["posterImage"]): string {
  return posterImage?.large || posterImage?.medium || posterImage?.small || posterImage?.tiny || "/placeholder.svg"
}

export function getKitsuCoverImage(coverImage: KitsuManga["attributes"]["coverImage"]): string {
  return coverImage?.original || coverImage?.large || coverImage?.small || coverImage?.tiny || "/placeholder.svg"
}

// Enhanced title extraction function with better English prioritization
export function getBestKitsuTitle(manga: KitsuManga): string {
  // Priority order for title selection - prioritize English titles
  const titlePriority = [
    manga.attributes.titles.en,        // Primary English
    manga.attributes.titles.en_us,     // US English
    manga.attributes.titles.en_jp,     // English-Japanese (often romanized)
  ]
  
  // Return the first available English title from priority list
  for (const title of titlePriority) {
    if (title && title.trim() && !isJapaneseText(title)) {
      return title.trim()
    }
  }
  
  // If no good English title found, check canonical title
  const canonicalTitle = manga.attributes.canonicalTitle
  if (canonicalTitle && !isJapaneseText(canonicalTitle)) {
    return canonicalTitle.trim()
  }
  
  // Last resort: use any available title, preferring shorter ones (likely English)
  const allTitles = Object.values(manga.attributes.titles).filter(Boolean)
  if (allTitles.length > 0) {
    // Sort by length and prefer non-Japanese text
    const sortedTitles = allTitles.sort((a, b) => {
      const aIsJapanese = isJapaneseText(a!)
      const bIsJapanese = isJapaneseText(b!)
      
      // Prefer non-Japanese titles
      if (aIsJapanese && !bIsJapanese) return 1
      if (!aIsJapanese && bIsJapanese) return -1
      
      // If both are same type, prefer shorter titles
      return a!.length - b!.length
    })
    
    return sortedTitles[0]!.trim()
  }
  
  // Final fallback
  return canonicalTitle || 'Unknown Title'
}

// Helper function to detect Japanese text
function isJapaneseText(text: string): boolean {
  // Check for Hiragana, Katakana, and Kanji characters
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
  return japaneseRegex.test(text)
}