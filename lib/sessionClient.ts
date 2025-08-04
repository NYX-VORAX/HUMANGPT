// Client-side session management utilities
// For use in React components and frontend code

interface SessionConfig {
  baseUrl?: string
  timeout?: number
}

class SessionClient {
  private baseUrl: string
  private timeout: number
  private currentSessionId: string | null = null

  constructor(config: SessionConfig = {}) {
    this.baseUrl = config.baseUrl || '/api'
    this.timeout = config.timeout || 30000 // 30 seconds
  }

  // Generate a new session ID locally (for immediate use)
  generateLocalSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get or create current session ID
  getSessionId(): string {
    if (!this.currentSessionId) {
      this.currentSessionId = this.generateLocalSessionId()
      // Store in localStorage for persistence across page reloads
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_session_id', this.currentSessionId)
      }
    }
    return this.currentSessionId
  }

  // Load session ID from localStorage
  loadSessionFromStorage(): string | null {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('chat_session_id')
      if (storedSession) {
        this.currentSessionId = storedSession
        return storedSession
      }
    }
    return null
  }

  // Clear current session
  clearCurrentSession(): void {
    this.currentSessionId = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat_session_id')
    }
  }

  // Start a new session (clears current and creates new)
  startNewSession(): string {
    this.clearCurrentSession()
    return this.getSessionId()
  }

  // Make authenticated API request with session ID
  async makeRequest(
    endpoint: string, 
    options: RequestInit = {}, 
    includeSessionId: boolean = true
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    
    // Get auth token (assuming Firebase Auth)
    let authToken = ''
    if (typeof window !== 'undefined' && window.auth) {
      try {
        const user = window.auth.currentUser
        if (user) {
          authToken = await user.getIdToken()
        }
      } catch (error) {
        console.warn('Failed to get auth token:', error)
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    // Include session ID in request body if specified
    let body = options.body
    if (includeSessionId && (options.method === 'POST' || options.method === 'PUT')) {
      try {
        const bodyObj = body ? JSON.parse(body as string) : {}
        bodyObj.sessionId = this.getSessionId()
        body = JSON.stringify(bodyObj)
      } catch (error) {
        // If body is not JSON, create new object
        body = JSON.stringify({ sessionId: this.getSessionId() })
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      body
    }

    return fetch(url, requestOptions)
  }

  // Send chat message with session management
  async sendChatMessage(prompt: string, persona: string = 'default'): Promise<any> {
    try {
      const response = await this.makeRequest('/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          persona,
          sessionId: this.getSessionId()
        })
      }, false) // Don't auto-include sessionId since we're manually adding it

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Chat request failed:', error)
      throw error
    }
  }

  // Get session statistics
  async getSessionStats(sessionId?: string): Promise<any> {
    try {
      const targetSessionId = sessionId || this.getSessionId()
      const response = await this.makeRequest('/session', {
        method: 'POST',
        body: JSON.stringify({
          action: 'stats',
          sessionId: targetSessionId
        })
      }, false)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get session stats:', error)
      throw error
    }
  }

  // Clear session on server
  async clearSessionOnServer(sessionId?: string): Promise<any> {
    try {
      const targetSessionId = sessionId || this.getSessionId()
      const response = await this.makeRequest('/session', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear',
          sessionId: targetSessionId
        })
      }, false)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // If clearing current session, also clear locally
      if (!sessionId || sessionId === this.currentSessionId) {
        this.clearCurrentSession()
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to clear session on server:', error)
      throw error
    }
  }

  // Get global session manager stats (admin only)
  async getManagerStats(): Promise<any> {
    try {
      const response = await this.makeRequest('/session', {
        method: 'GET'
      }, false)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get manager stats:', error)
      throw error
    }
  }
}

// Create and export singleton instance
export const sessionClient = new SessionClient()
export default sessionClient

// TypeScript declarations for window.auth (if not available elsewhere)
declare global {
  interface Window {
    auth?: any
  }
}
