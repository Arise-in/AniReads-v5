"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Moon,
  Sun,
  Maximize,
  Camera,
  Download,
  Play,
  Pause,
  Settings,
  BookOpen,
  Monitor,
  Smartphone,
  Tablet,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Bookmark,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"
import { searchKitsuManga, type KitsuManga } from "@/lib/kitsu-api"
import {
  getMangaDxChapter,
  getMangaDxChapterPages,
  getMangaDxManga,
  getMangaDxChapters,
  getPrimaryEnglishTitle,
  slugToMangaDxId,
  type Chapter,
} from "@/lib/mangadx-api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import DummyMangaPage from "@/components/dummy-manga-page"
import { titleToSlug } from "@/lib/slugify"

type ReadingMode = "single" | "double" | "vertical" | "webtoon"
type Direction = "ltr" | "rtl"
type FlipDirection = "horizontal" | "vertical"

interface DownloadedChapter {
  id: string
  mangaId: string
  mangaTitle: string
  mangaSlug: string
  chapterId: string
  chapterNumber: string
  chapterTitle: string
  posterUrl: string
  pages: string[]
  downloadedAt: string
  size: number
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get parameters from URL
  const mangaSlugParam = params.mangaId as string | undefined;
  const pageParam = params.pageId as string | undefined;
  const chapterQuery = searchParams?.get("chapter");

  // Determine if pageParam is a page number or chapter ID
  const isPageNumber = pageParam && /^\d+$/.test(pageParam);
  const initialPage = isPageNumber ? parseInt(pageParam, 10) : 1;
  const chapterIdFromUrl = !isPageNumber ? pageParam : chapterQuery;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mangaDxId, setMangaDxId] = useState<string | null>(null);

  // Reader state
  const [mangaTitle, setMangaTitle] = useState("")
  const [chapterTitle, setChapterTitle] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [darkMode, setDarkMode] = useState(true)
  const [readingMode, setReadingMode] = useState<ReadingMode>("single")
  const [direction, setDirection] = useState<Direction>("rtl")
  const [showControls, setShowControls] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(3)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pageTransition, setPageTransition] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  
  // New advanced features
  const [flipDirection, setFlipDirection] = useState<FlipDirection>("horizontal")
  const [flipAnimation, setFlipAnimation] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [immersiveMode, setImmersiveMode] = useState(false)
  const [preloadPages, setPreloadPages] = useState(3)
  const [smoothScrolling, setSmoothScrolling] = useState(true)
  const [gestureEnabled, setGestureEnabled] = useState(true)
  const [bookmarkCurrentPage, setBookmarkCurrentPage] = useState(false)

  // Data state
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [currentMangaDxChapter, setCurrentMangaDxChapter] = useState<Chapter | null>(null)
  const [allMangaDxChapters, setAllMangaDxChapters] = useState<Chapter[]>([])
  const [loadedImages, setLoadedImages] = useState<Map<number, string>>(new Map())

  // Refs
  const readerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null)
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null)
  const loadingStates = useRef<Set<number>>(new Set())
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const gestureThreshold = 50

  // Auto-hide controls functionality
  const hideControlsAfterDelay = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
    }
    const timer = setTimeout(() => {
      if (!immersiveMode) setShowControls(false)
    }, 3000)
    autoHideTimer.current = timer
  }, [immersiveMode])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (!immersiveMode) hideControlsAfterDelay()
  }, [hideControlsAfterDelay, immersiveMode])

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && currentPage < totalPages) {
      autoPlayTimer.current = setTimeout(() => {
        nextPage()
      }, autoPlayTimeout * 1000)
    }
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current)
      }
    }
  }, [autoPlay, currentPage, totalPages, autoPlayTimeout])

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Touch gesture handling
  useEffect(() => {
    if (!gestureEnabled) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current

      if (Math.abs(deltaX) > gestureThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          // Swipe right
          direction === "rtl" ? prevPage() : nextPage()
        } else {
          // Swipe left
          direction === "rtl" ? nextPage() : prevPage()
        }
      } else if (Math.abs(deltaY) > gestureThreshold && readingMode === "webtoon") {
        // Vertical swipe for webtoon mode
        if (deltaY > 0) {
          // Swipe down
          prevPage()
        } else {
          // Swipe up
          nextPage()
        }
      }
    }

    const element = readerRef.current
    if (element) {
      element.addEventListener('touchstart', handleTouchStart)
      element.addEventListener('touchend', handleTouchEnd)
      return () => {
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [gestureEnabled, direction, readingMode])

  const loadImageWithRetry = useCallback(async (pageIndex: number, url: string, retries = 3) => {
    if (loadingStates.current.has(pageIndex)) {
      return
    }

    loadingStates.current.add(pageIndex)
    setLoadedImages((prev) => new Map(prev).set(pageIndex, "loading"))

    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve, reject) => {
          const img = new window.Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            setLoadedImages((prev) => new Map(prev).set(pageIndex, url))
            resolve(true)
          }
          img.onerror = (e) => {
            console.error(`Error loading image ${url} (attempt ${i + 1}):`, e)
            reject(new Error("Image load failed"))
          }
          img.src = url
        })
        return
      } catch (error) {
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, 1000))
        }
      }
    }
    console.error(`Failed to load image ${url} after ${retries} attempts.`)
    setLoadedImages((prev) => new Map(prev).set(pageIndex, "/placeholder.svg"))
  }, [])

  // Save reading progress to cache
  const saveReadingProgress = useCallback((page: number) => {
    if (!mangaDxId) return;
    
    const readingHistory = JSON.parse(localStorage.getItem("readingHistory") || "{}")
    readingHistory[mangaDxId] = {
      lastTime: new Date().toISOString(),
      mangaId: mangaDxId,
      mangaSlug: mangaDxId,
      mangaTitle: mangaTitle,
      chapterId: currentMangaDxChapter?.id || '',
      chapter: currentMangaDxChapter?.attributes?.chapter || "Unknown",
      page: page,
      totalPages: totalPages,
      posterUrl: kitsuManga?.attributes?.posterImage?.medium || kitsuManga?.attributes?.posterImage?.small,
      lastRead: new Date().toISOString()
    }
    localStorage.setItem("readingHistory", JSON.stringify(readingHistory))
  }, [mangaDxId, mangaTitle, currentMangaDxChapter, totalPages, kitsuManga])

  // Check for offline content first
  const checkOfflineContent = useCallback(() => {
    try {
      const downloads = JSON.parse(localStorage.getItem('manga_downloads') || '[]')
      const offlineChapter = downloads.find((d: DownloadedChapter) => 
        d.mangaId === mangaDxId || (chapterIdFromUrl && d.chapterId === chapterIdFromUrl)
      )
      
      if (offlineChapter) {
        setIsOffline(true)
        setImageUrls(offlineChapter.pages)
        setTotalPages(offlineChapter.pages.length)
        setMangaTitle(offlineChapter.mangaTitle)
        setChapterTitle(`Chapter ${offlineChapter.chapterNumber}${offlineChapter.chapterTitle ? `: ${offlineChapter.chapterTitle}` : ''}`)
        setCurrentMangaDxChapter({
          id: offlineChapter.chapterId,
          type: 'chapter',
          attributes: {
            chapter: offlineChapter.chapterNumber,
            title: offlineChapter.chapterTitle,
            volume: null,
            pages: offlineChapter.pages.length,
            translatedLanguage: 'en',
            uploader: '',
            externalUrl: null,
            version: 1,
            createdAt: offlineChapter.downloadedAt,
            updatedAt: offlineChapter.downloadedAt,
            publishAt: offlineChapter.downloadedAt,
            readableAt: offlineChapter.downloadedAt
          },
          relationships: []
        })
        
        // Set initial page
        setCurrentPage(Math.min(initialPage, offlineChapter.pages.length))
        setLoading(false)
        return true
      }
    } catch (error) {
      console.error('Error checking offline content:', error)
    }
    return false
  }, [chapterIdFromUrl, initialPage])

  // Update URL when page changes
  const updateURL = useCallback((page: number) => {
    if (!mangaSlugParam) return;
    
    // Only update URL if we have a valid chapter ID
    const chapterId = currentMangaDxChapter?.id
    if (!chapterId) return;
    
    const newUrl = `/reader/${mangaSlugParam}/${page}?chapter=${chapterId}`
    window.history.replaceState(null, '', newUrl)
  }, [mangaSlugParam, currentMangaDxChapter?.id])
  
  // Main data fetching effect
  useEffect(() => {
    const fetchReaderData = async () => {
      if (!mangaSlugParam) {
        setError('Missing manga slug in URL.')
        setLoading(false)
        return;
      }

      try {
        setLoading(true)
        loadingStates.current.clear()
        setLoadedImages(new Map())

        // Convert slug to MangaDx ID
        const resolvedMangaDxId = await slugToMangaDxId(mangaSlugParam)
        if (!resolvedMangaDxId) {
          setError('Could not find manga with the provided slug.')
          setLoading(false)
          return
        }

        setMangaDxId(resolvedMangaDxId)

        // Check offline content first
        if (checkOfflineContent()) {
          return;
        }

        // Get MangaDx manga details
        const mangaDxResponse = await getMangaDxManga(resolvedMangaDxId)
        const mdManga = mangaDxResponse.data
        
        if (mdManga) {
          const mdTitle = getPrimaryEnglishTitle(mdManga)
          setMangaTitle(mdTitle)
          
          // Search Kitsu for additional metadata
          try {
            const kitsuSearchData = await searchKitsuManga(mdTitle, 1)
            const kitsuData = kitsuSearchData.data[0] || null
            setKitsuManga(kitsuData)
          } catch (error) {
            console.warn("ReaderPage: Could not fetch Kitsu data:", error)
          }
        }

        // Get all chapters for navigation
        const allChaptersData = await getMangaDxChapters(resolvedMangaDxId, 100)
        const sortedChapters = (allChaptersData.data || []).sort((a, b) => {
          const aNum = Number.parseFloat(a.attributes.chapter || "0")
          const bNum = Number.parseFloat(b.attributes.chapter || "0")
          const aVol = Number.parseFloat(a.attributes.volume || "0")
          const bVol = Number.parseFloat(b.attributes.volume || "0")

          if (aVol !== bVol) {
            return aVol - bVol
          }
          return aNum - bNum
        })
        setAllMangaDxChapters(sortedChapters)

        // Determine which chapter to load
        let chapterToLoad: Chapter | null = null
        
        if (chapterIdFromUrl) {
          chapterToLoad = sortedChapters.find((c: Chapter) => c.id === chapterIdFromUrl) || null
        } else {
          chapterToLoad = sortedChapters[0] || null
        }

        if (!chapterToLoad) {
          setError('No chapter found to load')
          setLoading(false)
          return
        }

        // Get current chapter details
        const currentChapterDetails = await getMangaDxChapter(chapterToLoad.id)
        setCurrentMangaDxChapter(currentChapterDetails.data)
        const chTitle = `Chapter ${currentChapterDetails.data?.attributes?.chapter || "?"}${
          currentChapterDetails.data?.attributes?.title ? `: ${currentChapterDetails.data.attributes.title}` : ""
        }`;
        setChapterTitle(chTitle)

        // Get chapter pages
        const pagesResponse = await getMangaDxChapterPages(chapterToLoad.id)
        const baseUrl = pagesResponse.baseUrl
        const chapterData = pagesResponse.chapter

        if (!chapterData || !chapterData.hash || !chapterData.data) {
          console.error("MangaDx chapter data, hash, or image list is missing:", chapterData)
          setImageUrls([])
          setTotalPages(0)
          setLoading(false)
          return
        }

        const rawPageUrls = chapterData.data.map((page: string) => `${baseUrl}/data/${chapterData.hash}/${page}`)
        setImageUrls(rawPageUrls)
        setTotalPages(rawPageUrls.length)

        // Set initial page and update URL
        const validInitialPage = Math.min(initialPage, rawPageUrls.length)
        setCurrentPage(validInitialPage)
        updateURL(validInitialPage)

        // Save initial progress
        saveReadingProgress(validInitialPage)

      } catch (error) {
        console.error("Error fetching reader data:", error)
        setError('Failed to load manga data')
        setImageUrls([])
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    }

    fetchReaderData()

    hideControlsAfterDelay()
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    }
  }, [mangaSlugParam, chapterIdFromUrl, initialPage])

  // Preload images based on current page
  useEffect(() => {
    if (imageUrls.length > 0) {
      const pagesToLoad = []

      // Current page(s)
      if (readingMode === "double") {
        pagesToLoad.push(currentPage - 1)
        if (currentPage < totalPages) pagesToLoad.push(currentPage)
      } else {
        pagesToLoad.push(currentPage - 1)
      }

      // Preload next pages
      for (let i = 1; i <= preloadPages; i++) {
        const nextPage = currentPage + i
        if (nextPage <= totalPages) {
          pagesToLoad.push(nextPage - 1)
        }
      }

      // Preload previous pages
      for (let i = 1; i <= Math.min(preloadPages, 2); i++) {
        const prevPage = currentPage - i
        if (prevPage >= 1) {
          pagesToLoad.push(prevPage - 1)
        }
      }

      pagesToLoad.forEach((pageIndex) => {
        if (imageUrls[pageIndex] && !loadingStates.current.has(pageIndex)) {
          loadImageWithRetry(pageIndex, imageUrls[pageIndex])
        }
      })
    }
  }, [currentPage, imageUrls, totalPages, readingMode, loadImageWithRetry, preloadPages])

  // Play sound effect
  const playSound = useCallback((type: 'flip' | 'click') => {
    if (!soundEnabled) return
    
    // Create audio context for sound effects
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'flip') {
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1)
      } else {
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime)
      }
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (error) {
      // Ignore audio errors
    }
  }, [soundEnabled])

  // Navigation functions with flip animation
  const nextPage = useCallback(() => {
    if (flipAnimation) {
      setPageTransition(true)
      setTimeout(() => setPageTransition(false), 300)
    }

    const increment = readingMode === "double" ? 2 : 1
    const newPage = Math.min(currentPage + increment, totalPages)

    if (newPage > currentPage) {
      setCurrentPage(newPage)
      updateURL(newPage)
      saveReadingProgress(newPage)
      playSound('flip')
    } else if (currentPage === totalPages) {
      goToNextChapter()
    }
  }, [currentPage, totalPages, readingMode, updateURL, saveReadingProgress, flipAnimation, playSound])

  const prevPage = useCallback(() => {
    if (flipAnimation) {
      setPageTransition(true)
      setTimeout(() => setPageTransition(false), 300)
    }

    const decrement = readingMode === "double" ? 2 : 1
    const newPage = Math.max(currentPage - decrement, 1)

    if (newPage < currentPage) {
      setCurrentPage(newPage)
      updateURL(newPage)
      saveReadingProgress(newPage)
      playSound('flip')
    } else if (currentPage === 1) {
      goToPrevChapter()
    }
  }, [currentPage, readingMode, updateURL, saveReadingProgress, flipAnimation, playSound])

  const goToNextChapter = useCallback(() => {
    if (!currentMangaDxChapter || !mangaSlugParam) return
    
    const currentIndex = allMangaDxChapters.findIndex((c) => c.id === currentMangaDxChapter.id)
    if (currentIndex !== -1 && currentIndex < allMangaDxChapters.length - 1) {
      const nextChapter = allMangaDxChapters[currentIndex + 1]
      router.push(`/reader/${mangaSlugParam}/1?chapter=${nextChapter.id}`)
    }
  }, [currentMangaDxChapter, allMangaDxChapters, router, mangaSlugParam])

  const goToPrevChapter = useCallback(() => {
    if (!currentMangaDxChapter || !mangaSlugParam) return
    
    const currentIndex = allMangaDxChapters.findIndex((c) => c.id === currentMangaDxChapter.id)
    if (currentIndex > 0) {
      const prevChapter = allMangaDxChapters[currentIndex - 1]
      router.push(`/reader/${mangaSlugParam}/1?chapter=${prevChapter.id}`)
    }
  }, [currentMangaDxChapter, allMangaDxChapters, router, mangaSlugParam])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          direction === "rtl" ? nextPage() : prevPage()
          break
        case "ArrowRight":
        case " ":
          e.preventDefault()
          direction === "rtl" ? prevPage() : nextPage()
          break
        case "ArrowUp":
          e.preventDefault()
          if (readingMode === "vertical" || readingMode === "webtoon") {
            if (smoothScrolling) {
              readerRef.current?.scrollBy({ top: -100, behavior: 'smooth' })
            } else {
              readerRef.current?.scrollBy(0, -100)
            }
          } else {
            prevPage()
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (readingMode === "vertical" || readingMode === "webtoon") {
            if (smoothScrolling) {
              readerRef.current?.scrollBy({ top: 100, behavior: 'smooth' })
            } else {
              readerRef.current?.scrollBy(0, 100)
            }
          } else {
            nextPage()
          }
          break
        case "Escape":
          if (mangaDxId) {
            router.push(`/manga/${mangaDxId}`)
          }
          break
        case "f":
        case "F11":
          e.preventDefault()
          toggleFullscreen()
          break
        case "h":
          setShowControls(!showControls)
          break
        case "s":
          setShowSettings(!showSettings)
          break
        case "i":
          setImmersiveMode(!immersiveMode)
          break
        case "b":
          setBookmarkCurrentPage(!bookmarkCurrentPage)
          break
      }
      showControlsTemporarily()
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, totalPages, router, showControlsTemporarily, mangaDxId, direction, readingMode, showControls, showSettings, nextPage, prevPage, immersiveMode, bookmarkCurrentPage, smoothScrolling])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  const handleScreenshot = useCallback(() => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      toast.error("Canvas not supported")
      return
    }

    const currentImageUrl = loadedImages.get(currentPage - 1)
    if (!currentImageUrl || currentImageUrl === "loading" || currentImageUrl === "/placeholder.svg") {
      toast.error("Image not loaded yet")
      return
    }

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${mangaTitle}_Chapter_${currentMangaDxChapter?.attributes.chapter}_Page_${currentPage}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          toast.success("Screenshot saved!")
        }
      }, "image/png")
    }
    img.onerror = () => {
      toast.error("Failed to load image for screenshot")
    }
    img.src = currentImageUrl
  }, [loadedImages, currentPage, mangaTitle, currentMangaDxChapter])

  const handleDownloadChapter = useCallback(async () => {
    if (downloading || isOffline || !currentMangaDxChapter || !mangaDxId) return

    setDownloading(true)
    try {
      // Calculate total size (estimate)
      const estimatedSize = imageUrls.length * 500000 // 500KB per page estimate

      const downloadData: DownloadedChapter = {
        id: `${mangaDxId}-${currentMangaDxChapter.id}`,
        mangaId: mangaDxId,
        mangaTitle: mangaTitle,
        mangaSlug: mangaDxId,
        chapterId: currentMangaDxChapter.id,
        chapterNumber: currentMangaDxChapter.attributes?.chapter || "Unknown",
        chapterTitle: currentMangaDxChapter.attributes?.title || "",
        posterUrl: kitsuManga?.attributes?.posterImage?.medium || "/placeholder.svg",
        pages: imageUrls,
        downloadedAt: new Date().toISOString(),
        size: estimatedSize
      }

      const existingDownloads = JSON.parse(localStorage.getItem('manga_downloads') || '[]')
      const updatedDownloads = existingDownloads.filter((d: DownloadedChapter) => d.id !== downloadData.id)
      updatedDownloads.push(downloadData)
      
      localStorage.setItem('manga_downloads', JSON.stringify(updatedDownloads))
      toast.success("Chapter downloaded for offline reading!")
    } catch (error) {
      console.error('Error downloading chapter:', error)
      toast.error("Failed to download chapter")
    } finally {
      setDownloading(false)
    }
  }, [downloading, isOffline, currentMangaDxChapter, imageUrls, mangaDxId, mangaTitle, kitsuManga])

  const renderPage = useCallback((pageIndex: number, isSecondPage = false) => {
    const imageUrl = loadedImages.get(pageIndex)
    const isLoaded = imageUrl && imageUrl !== "loading"

    return (
      <div
        key={pageIndex}
        ref={pageIndex === currentPage - 1 ? pageRef : undefined}
        className={`relative flex-shrink-0 ${
          readingMode === "double" ? "w-1/2" : "w-full"
        } h-full flex items-center justify-center ${
          pageTransition && flipAnimation ? 
            `transition-transform duration-300 ease-in-out ${
              flipDirection === "horizontal" ? "transform-gpu" : "transform-gpu"
            }` : ""
        }`}
        style={{
          transform: pageTransition && flipAnimation ? 
            (flipDirection === "horizontal" ? "rotateY(10deg)" : "rotateX(10deg)") : 
            "none"
        }}
      >
        {isLoaded ? (
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={`Page ${pageIndex + 1}`}
            width={800}
            height={1200}
            className={`max-w-full max-h-full object-contain ${
              readingMode === "vertical" || readingMode === "webtoon" ? "w-full h-auto" : "h-full w-auto"
            } ${flipAnimation ? "transition-transform duration-300" : ""}`}
            style={{
              transform: `scale(${zoom / 100})`,
              filter: darkMode ? "none" : "brightness(1.1) contrast(1.05)",
            }}
            unoptimized
            priority={pageIndex === currentPage - 1}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg">
            <div className="animate-pulse w-1/2 h-1/2 bg-gray-700 rounded-md" />
          </div>
        )}
        
        {/* Page number overlay */}
        {!immersiveMode && (
          <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {pageIndex + 1}
          </div>
        )}
      </div>
    )
  }, [loadedImages, readingMode, pageTransition, zoom, darkMode, currentPage, flipAnimation, flipDirection, immersiveMode])

  // Early returns for loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <DummyMangaPage />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6">
          <h1 className="text-2xl font-bold text-red-400">Error</h1>
          <p className="text-gray-300">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => router.push(`/manga/${mangaDxId || mangaSlugParam}`)} variant="outline">
              Go Back to Manga Details
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if ((!kitsuManga && !isOffline) || imageUrls.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Chapter not found</h1>
          <p className="text-gray-400">
            {imageUrls.length === 0 ? "No pages available for this chapter" : "Unable to load chapter data"}
          </p>
          <Button onClick={() => router.push(`/manga/${mangaDxId || mangaSlugParam}`)} variant="outline">
            Go Back to Manga Details
          </Button>
        </div>
      </div>
    )
  }

  const canGoToPrevChapter = currentMangaDxChapter && allMangaDxChapters.findIndex((c) => c.id === currentMangaDxChapter.id) > 0
  const canGoToNextChapter = currentMangaDxChapter && allMangaDxChapters.findIndex((c) => c.id === currentMangaDxChapter.id) < allMangaDxChapters.length - 1

  return (
    <TooltipProvider>
      <div
        ref={readerRef}
        className={`min-h-screen ${darkMode ? "bg-black" : "bg-gray-100"} relative overflow-hidden select-none ${
          immersiveMode ? "cursor-none" : ""
        }`}
        onClick={showControlsTemporarily}
      >
        {/* Navigation Zones */}
        <div
          className={`absolute ${direction === "rtl" ? "right-0" : "left-0"} top-0 w-1/3 h-full z-20 cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation()
            direction === "rtl" ? nextPage() : prevPage()
          }}
        />
        <div
          className={`absolute ${direction === "rtl" ? "left-0" : "right-0"} top-0 w-1/3 h-full z-20 cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation()
            direction === "rtl" ? prevPage() : nextPage()
          }}
        />

        {/* Top Controls */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            showControls && !immersiveMode ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <div className="bg-black/95 backdrop-blur-md border-b border-gray-800/50">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/manga/${mangaDxId || mangaSlugParam}`)}
                      className="text-white hover:bg-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Manga Details</TooltipContent>
                </Tooltip>
                <div className="text-white">
                  <h1 className="font-semibold text-sm">{chapterTitle}</h1>
                  <p className="text-xs text-gray-400">
                    Page {currentPage} of {totalPages}
                    {isOffline && <Badge className="ml-2 bg-green-600/20 text-green-400 text-xs">Offline</Badge>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImmersiveMode(!immersiveMode)}
                      className={`text-white hover:bg-gray-800 ${immersiveMode ? "bg-red-600/20 text-red-400" : ""}`}
                    >
                      {immersiveMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{immersiveMode ? "Exit Immersive Mode" : "Enter Immersive Mode"}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoPlay(!autoPlay)}
                      className={`text-white hover:bg-gray-800 ${autoPlay ? "bg-red-600/20 text-red-400" : ""}`}
                    >
                      {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{autoPlay ? "Pause Auto-play" : "Start Auto-play"}</TooltipContent>
                </Tooltip>

                {autoPlay && (
                  <Select
                    value={autoPlayTimeout.toString()}
                    onValueChange={(value) => setAutoPlayTimeout(Number(value))}
                  >
                    <SelectTrigger className="w-20 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1s</SelectItem>
                      <SelectItem value="2">2s</SelectItem>
                      <SelectItem value="3">3s</SelectItem>
                      <SelectItem value="5">5s</SelectItem>
                      <SelectItem value="10">10s</SelectItem>
                      <SelectItem value="30">30s</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-white hover:bg-gray-800"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-gray-800"
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Fullscreen</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Settings Panel */}
        {showSettings && (
          <div className="fixed top-16 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
            <Card className="bg-gray-900/95 backdrop-blur-md border-gray-700">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Reader Settings</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Reading Mode</label>
                    <Select value={readingMode} onValueChange={(value: ReadingMode) => setReadingMode(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Single Page
                          </div>
                        </SelectItem>
                        <SelectItem value="double">
                          <div className="flex items-center gap-2">
                            <Tablet className="w-4 h-4" />
                            Double Page
                          </div>
                        </SelectItem>
                        <SelectItem value="vertical">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Vertical Scroll
                          </div>
                        </SelectItem>
                        <SelectItem value="webtoon">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Webtoon
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Reading Direction</label>
                    <Select value={direction} onValueChange={(value: Direction) => setDirection(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rtl">Right to Left (Manga)</SelectItem>
                        <SelectItem value="ltr">Left to Right (Western)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Flip Direction</label>
                    <Select value={flipDirection} onValueChange={(value: FlipDirection) => setFlipDirection(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal Flip</SelectItem>
                        <SelectItem value="vertical">Vertical Flip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Theme</label>
                    <Button
                      variant="outline"
                      onClick={() => setDarkMode(!darkMode)}
                      className="w-full justify-start border-gray-700 text-white"
                    >
                      {darkMode ? <Moon className="w-4 h-4 mr-2" /> : <Sun className="w-4 h-4 mr-2" />}
                      {darkMode ? "Dark Mode" : "Light Mode"}
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Zoom: {zoom}%</label>
                    <Slider
                      value={[zoom]}
                      onValueChange={(value) => setZoom(value[0])}
                      min={50}
                      max={200}
                      step={25}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Preload Pages: {preloadPages}</label>
                    <Slider
                      value={[preloadPages]}
                      onValueChange={(value) => setPreloadPages(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => setFlipAnimation(!flipAnimation)}
                      className={`w-full justify-start border-gray-700 ${flipAnimation ? 'text-green-400' : 'text-gray-300'}`}
                    >
                      Flip Animation: {flipAnimation ? 'On' : 'Off'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-full justify-start border-gray-700 ${soundEnabled ? 'text-green-400' : 'text-gray-300'}`}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                      Sound Effects: {soundEnabled ? 'On' : 'Off'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setSmoothScrolling(!smoothScrolling)}
                      className={`w-full justify-start border-gray-700 ${smoothScrolling ? 'text-green-400' : 'text-gray-300'}`}
                    >
                      Smooth Scrolling: {smoothScrolling ? 'On' : 'Off'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setGestureEnabled(!gestureEnabled)}
                      className={`w-full justify-start border-gray-700 ${gestureEnabled ? 'text-green-400' : 'text-gray-300'}`}
                    >
                      Touch Gestures: {gestureEnabled ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reading Area */}
        <div className="h-screen flex items-center justify-center p-4 pt-16 pb-20">
          {readingMode === "vertical" || readingMode === "webtoon" ? (
            <div className={`max-w-4xl mx-auto space-y-1 ${readingMode === "webtoon" ? "overflow-y-auto h-full" : ""}`}>
              {imageUrls.map((_, index) => renderPage(index))}
            </div>
          ) : readingMode === "double" ? (
            <div className={`flex h-full max-w-6xl mx-auto ${direction === "rtl" ? "flex-row-reverse" : "flex-row"}`}>
              {direction === "rtl" ? (
                <>
                  {currentPage < totalPages && renderPage(currentPage, true)}
                  {renderPage(currentPage - 1)}
                </>
              ) : (
                <>
                  {renderPage(currentPage - 1)}
                  {currentPage < totalPages && renderPage(currentPage, true)}
                </>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">{renderPage(currentPage - 1)}</div>
          )}
        </div>

        {/* Bottom Controls */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
            showControls && !immersiveMode ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          <div className="bg-black/95 backdrop-blur-md border-t border-gray-800/50">
            <div className="p-3 space-y-3">
              {/* Page Navigation */}
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevChapter}
                      className="text-white hover:bg-gray-800"
                      disabled={!canGoToPrevChapter}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous Chapter</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevPage}
                      className="text-white hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous Page</TooltipContent>
                </Tooltip>

                <div className="flex-1 px-2">
                  <Slider
                    value={[currentPage]}
                    onValueChange={(value) => {
                      const newPage = value[0]
                      setCurrentPage(newPage)
                      updateURL(newPage)
                      saveReadingProgress(newPage)
                    }}
                    max={totalPages}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextPage}
                      className="text-white hover:bg-gray-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next Page</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextChapter}
                      className="text-white hover:bg-gray-800"
                      disabled={!canGoToNextChapter}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next Chapter</TooltipContent>
                </Tooltip>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(Math.max(50, zoom - 25))}
                          className="text-white hover:bg-gray-800"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom Out</TooltipContent>
                    </Tooltip>
                    <span className="text-white text-xs w-10 text-center">{zoom}%</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(Math.min(200, zoom + 25))}
                          className="text-white hover:bg-gray-800"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom In</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(100)}
                          className="text-white hover:bg-gray-800"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset Zoom</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBookmarkCurrentPage(!bookmarkCurrentPage)}
                        className={`text-white hover:bg-gray-800 ${bookmarkCurrentPage ? 'text-blue-400' : ''}`}
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarkCurrentPage ? 'fill-current' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bookmark Page</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleScreenshot}
                        className="text-white hover:bg-gray-800"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Screenshot</TooltipContent>
                  </Tooltip>
                  
                  {!isOffline && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDownloadChapter}
                          disabled={downloading}
                          className="text-white hover:bg-gray-800"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {downloading ? "Downloading..." : "Download Chapter"}
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: `${mangaTitle} - ${chapterTitle}`,
                              url: window.location.href
                            })
                          } else {
                            navigator.clipboard.writeText(window.location.href)
                            toast.success("Link copied to clipboard!")
                          }
                        }}
                        className="text-white hover:bg-gray-800"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        {showControls && !immersiveMode && (
          <div className="fixed bottom-20 left-4 text-xs text-gray-400 bg-black/50 p-2 rounded">
            <div>Shortcuts: ← → (navigate) | F (fullscreen) | H (hide UI) | I (immersive) | B (bookmark)</div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}