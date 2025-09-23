import { create } from 'zustand'

export interface Bot {
  id: string
  name: string
  startDate: string
  endDate?: string // undefined means still active
  accountId: string
  tradingPair: string
  daviddtechLink: string
  tradingViewLink: string
  createdAt: number
  isActive: boolean
  tags: string[]
}

interface BotState {
  bots: Bot[]
  addBot: (bot: Omit<Bot, 'id' | 'createdAt' | 'isActive'>) => void
  stopBot: (botId: string) => void
  restartBot: (botId: string) => void
  deleteBot: (botId: string) => void
  updateBot: (botId: string, updates: Partial<Bot>) => void
}

// Simple localStorage utility
const BOT_STORAGE_KEY = 'daviddtech-bot-storage'

const saveBots = (bots: Bot[]) => {
  try {
    localStorage.setItem(BOT_STORAGE_KEY, JSON.stringify(bots))
  } catch (error) {
    console.warn('Failed to save bots to localStorage:', error)
  }
}

const loadBots = (): Bot[] => {
  try {
    const stored = localStorage.getItem(BOT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to load bots from localStorage:', error)
    return []
  }
}

export const useBotStore = create<BotState>((set, get) => ({
  bots: loadBots(),

  addBot: (botData) => {
    const newBot: Bot = {
      ...botData,
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      isActive: true,
      tags: botData.tags || [],
    }

    const newBots = [...get().bots, newBot]
    set({ bots: newBots })
    saveBots(newBots)
  },

  stopBot: (botId) => {
    const newBots = get().bots.map(bot =>
      bot.id === botId
        ? { ...bot, endDate: new Date().toISOString().split('T')[0], isActive: false }
        : bot
    )
    set({ bots: newBots })
    saveBots(newBots)
  },

  restartBot: (botId) => {
    const newBots = get().bots.map(bot =>
      bot.id === botId
        ? { ...bot, endDate: undefined, isActive: true }
        : bot
    )
    set({ bots: newBots })
    saveBots(newBots)
  },

  deleteBot: (botId) => {
    const newBots = get().bots.filter(bot => bot.id !== botId)
    set({ bots: newBots })
    saveBots(newBots)
  },

  updateBot: (botId, updates) => {
    const newBots = get().bots.map(bot =>
      bot.id === botId ? { ...bot, ...updates } : bot
    )
    set({ bots: newBots })
    saveBots(newBots)
  },
}))