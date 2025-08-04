// Session Manager for API Key Management
// Manages working API keys per session to avoid repeated failures

interface SessionData {
  workingApiKey: string
  apiProvider: 'gemini' | 'deepseek'
  sessionId: string
  lastUsed: number
  createdAt: number
  requestCount: number
  lastError?: string
}

class SessionManager {
  private sessions = new Map<string, SessionData>()
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_SESSIONS = 10000 // Maximum number of sessions to keep in memory

  // Generate unique session ID for each chat session
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Store working API key for a session
  setWorkingApiKey(sessionId: string, apiKey: string, provider: 'gemini' | 'deepseek'): void {
    const now = Date.now()
    const existingSession = this.sessions.get(sessionId)
    
    this.sessions.set(sessionId, {
      workingApiKey: apiKey,
      apiProvider: provider,
      sessionId,
      lastUsed: now,
      createdAt: existingSession?.createdAt || now,
      requestCount: (existingSession?.requestCount || 0) + 1,
      lastError: undefined // Clear any previous errors
    })
    
    // Clean up old sessions
    this.cleanupExpiredSessions()
  }

  // Get working API key for a session
  getWorkingApiKey(sessionId: string): SessionData | null {
    const sessionData = this.sessions.get(sessionId)
    
    if (!sessionData) {
      return null
    }

    // Check if session is expired
    if (Date.now() - sessionData.lastUsed > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId)
      return null
    }

    // Update last used time
    sessionData.lastUsed = Date.now()
    return sessionData
  }

  // Remove session when chat is cleared or ended
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  // Clean up expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredSessions: string[] = []
    
    this.sessions.forEach((data, sessionId) => {
      if (now - data.lastUsed > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId)
      }
    })
    
    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId)
    })
  }

  // Get all active sessions (for debugging)
  getActiveSessions(): number {
    this.cleanupExpiredSessions()
    return this.sessions.size
  }
  
  // Record error for a session
  recordSessionError(sessionId: string, error: string): void {
    const sessionData = this.sessions.get(sessionId)
    if (sessionData) {
      sessionData.lastError = error
      sessionData.lastUsed = Date.now()
    }
  }
  
  // Get session statistics
  getSessionStats(sessionId: string): { requestCount: number; provider: string; age: number } | null {
    const sessionData = this.sessions.get(sessionId)
    if (!sessionData) return null
    
    return {
      requestCount: sessionData.requestCount,
      provider: sessionData.apiProvider,
      age: Date.now() - sessionData.createdAt
    }
  }
  
  // Force cleanup of old sessions (for memory management)
  forceCleanup(): number {
    const initialSize = this.sessions.size
    this.cleanupExpiredSessions()
    
    // If still too many sessions, remove oldest ones
    if (this.sessions.size > this.MAX_SESSIONS) {
      const sessionArray = Array.from(this.sessions.entries())
      sessionArray.sort((a, b) => a[1].lastUsed - b[1].lastUsed)
      
      const toRemove = this.sessions.size - this.MAX_SESSIONS
      for (let i = 0; i < toRemove; i++) {
        this.sessions.delete(sessionArray[i][0])
      }
    }
    
    return initialSize - this.sessions.size
  }
  
  // Get overall session manager statistics
  getManagerStats(): {
    totalSessions: number
    geminiSessions: number
    deepseekSessions: number
    averageAge: number
    totalRequests: number
  } {
    this.cleanupExpiredSessions()
    
    let geminiCount = 0
    let deepseekCount = 0
    let totalAge = 0
    let totalRequests = 0
    const now = Date.now()
    
    this.sessions.forEach((session) => {
      if (session.apiProvider === 'gemini') geminiCount++
      else if (session.apiProvider === 'deepseek') deepseekCount++
      
      totalAge += (now - session.createdAt)
      totalRequests += session.requestCount
    })
    
    return {
      totalSessions: this.sessions.size,
      geminiSessions: geminiCount,
      deepseekSessions: deepseekCount,
      averageAge: this.sessions.size > 0 ? totalAge / this.sessions.size : 0,
      totalRequests
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()
export default sessionManager
