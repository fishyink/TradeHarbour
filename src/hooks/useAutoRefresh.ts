import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useAutoRefresh = () => {
  const { settings, refreshData } = useAppStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (settings.autoRefresh && settings.refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refreshData()
      }, settings.refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [settings.autoRefresh, settings.refreshInterval, refreshData])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}