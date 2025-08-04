import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/firebase'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { sessionManager } from '@/lib/sessionManager'

// API keys stored securely on server
const GEMINI_API_KEYS = [
  // process.env.GEMINI_API_KEY_1,
  // process.env.GEMINI_API_KEY_2,
  // process.env.GEMINI_API_KEY_3,
  // process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    process.env.GEMINI_API_KEY_11,
    process.env.GEMINI_API_KEY_12,
    process.env.GEMINI_API_KEY_13,
    process.env.GEMINI_API_KEY_14,
    process.env.GEMINI_API_KEY_15,
].filter(Boolean)

const DEEPSEEK_API_KEYS = [
  process.env.DEEPSEEK_API_KEY_1,
  process.env.DEEPSEEK_API_KEY_2
].filter(Boolean)

// Combine all API providers
const API_PROVIDERS = [
  ...GEMINI_API_KEYS.map(key => ({ type: 'gemini', key })),
  ...DEEPSEEK_API_KEYS.map(key => ({ type: 'deepseek', key }))
]

// Shuffle function for random API selection
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
function checkRateLimit(userId: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitStore.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

// Input validation and sanitization
function validateInput(prompt: string, persona: string): { valid: boolean; error?: string } {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Invalid prompt' }
  }
  
  if (!persona || typeof persona !== 'string') {
    return { valid: false, error: 'Invalid persona' }
  }
  
  if (prompt.length > 2000) {
    return { valid: false, error: 'Prompt too long' }
  }
  
  if (persona.length > 50) {
    return { valid: false, error: 'Invalid persona name' }
  }
  
  // Check for malicious content
  const maliciousPatterns = [
    /system|admin|root|sudo/i,
    /exec|eval|script|javascript/i,
    /\<script\>|\<\/script\>/i,
    /onerror|onload|onclick/i
  ]
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(prompt)) {
      return { valid: false, error: 'Invalid content detected' }
    }
  }
  
  return { valid: true }
}

// Secure API call to Gemini
async function callGeminiAPI(apiKey: string, prompt: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HumanGPT/1.0',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 150,
          topK: 40,
          topP: 0.95,
          candidateCount: 1
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    })
    
    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const responseText = data.candidates[0].content.parts[0].text
      
      // Sanitize response
      const sanitizedResponse = responseText
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .substring(0, 500) // Limit response length
      
      return { success: true, message: sanitizedResponse }
    } else if (data.error) {
      throw new Error(`Gemini API Error: ${data.error.message || 'Unknown error'}`)
    } else {
      throw new Error('Invalid Gemini API response format')
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Secure API call to DeepSeek
async function callDeepSeekAPI(apiKey: string, prompt: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'HumanGPT/1.0'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.9,
        top_p: 0.95,
        stream: false
      })
    })
    
    if (!response.ok) {
      throw new Error(`DeepSeek API Error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      const responseText = data.choices[0].message.content
      
      // Sanitize response
      const sanitizedResponse = responseText
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .substring(0, 500) // Limit response length
      
      return { success: true, message: sanitizedResponse }
    } else if (data.error) {
      throw new Error(`DeepSeek API Error: ${data.error.message || 'Unknown error'}`)
    } else {
      throw new Error('Invalid DeepSeek API response format')
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Session-aware API call function with optimized key management
async function makeSessionAwareAPICall(
  prompt: string, 
  sessionId: string, 
  maxRetries: number = 5
): Promise<{ success: boolean; message?: string; error?: string }> {
  // First, try to use the working API key from session if available
  const sessionData = sessionManager.getWorkingApiKey(sessionId)
  
  if (sessionData) {
    console.log(`Using cached ${sessionData.apiProvider} API key for session ${sessionId}`)
    
    let result: { success: boolean; message?: string; error?: string }
    
    if (sessionData.apiProvider === 'gemini') {
      result = await callGeminiAPI(sessionData.workingApiKey, prompt)
    } else if (sessionData.apiProvider === 'deepseek') {
      result = await callDeepSeekAPI(sessionData.workingApiKey, prompt)
    } else {
      // Invalid provider, clear session and fall back to discovery
      sessionManager.clearSession(sessionId)
      return await discoverWorkingAPIKey(prompt, sessionId, maxRetries)
    }
    
    if (result.success) {
      return result
    }
    
    // If cached key failed, clear session and try discovery
    console.log(`Cached ${sessionData.apiProvider} key failed, clearing session and discovering new key`)
    sessionManager.clearSession(sessionId)
  }
  
  // No working key in session or cached key failed, discover new working key
  return await discoverWorkingAPIKey(prompt, sessionId, maxRetries)
}

// Function to discover and cache a working API key
async function discoverWorkingAPIKey(
  prompt: string, 
  sessionId: string, 
  maxRetries: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log(`Discovering working API key for session ${sessionId}`)
  
  // Shuffle API providers for random selection
  const shuffledProviders = shuffleArray(API_PROVIDERS)
  let attempts = 0
  
  while (attempts < maxRetries && attempts < shuffledProviders.length) {
    const provider = shuffledProviders[attempts]
    
    if (!provider || !provider.key) {
      attempts++
      continue
    }
    
    console.log(`Trying ${provider.type} API key (attempt ${attempts + 1}/${maxRetries})`)
    
    let result: { success: boolean; message?: string; error?: string }
    
    if (provider.type === 'gemini') {
      result = await callGeminiAPI(provider.key, prompt)
    } else if (provider.type === 'deepseek') {
      result = await callDeepSeekAPI(provider.key, prompt)
    } else {
      attempts++
      continue
    }
    
    if (result.success) {
      // Cache the working API key for this session
      sessionManager.setWorkingApiKey(
        sessionId, 
        provider.key, 
        provider.type as 'gemini' | 'deepseek'
      )
      
      console.log(`Found working ${provider.type} API key, cached for session ${sessionId}`)
      return result
    }
    
    // Log failed attempt (without exposing API key)
    console.log(`${provider.type} API attempt ${attempts + 1} failed: ${result.error}`)
    
    attempts++
    
    // Wait before trying next provider
    if (attempts < maxRetries && attempts < shuffledProviders.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log(`All API providers failed for session ${sessionId}`)
  return { success: false, error: 'All API providers are temporarily unavailable' }
}

export async function POST(request: NextRequest) {
  try {
    // Security headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
    
    // Verify request origin
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean)
    
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403, headers }
      )
    }
    
    // Verify Content-Type
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400, headers }
      )
    }
    
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers }
      )
    }
    
    const token = authHeader.substring(7)
    
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401, headers }
      )
    }
    
    // Rate limiting
    if (!checkRateLimit(decodedToken.uid)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers }
      )
    }
    
    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400, headers }
      )
    }
    
    let { prompt, persona, sessionId } = body
    
    // Generate sessionId if not provided
    if (!sessionId || typeof sessionId !== 'string') {
      sessionId = sessionManager.generateSessionId()
      console.log(`Generated new sessionId: ${sessionId}`)
    }
    
    // Validate input
    const validation = validateInput(prompt, persona)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400, headers }
      )
    }
    
    // Verify user permissions
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers }
      )
    }
    
    let userData = userDoc.data()
    
    // Check and reset daily count if it's a new day
    const now = new Date()
    const today = now.toDateString()
    
    let lastMessageDate = null
    if (userData?.lastMessageDate) {
      if (userData.lastMessageDate.toDate) {
        lastMessageDate = userData.lastMessageDate.toDate().toDateString()
      } else {
        lastMessageDate = new Date(userData.lastMessageDate).toDateString()
      }
    }
    
    // If it's a new day, reset daily count
    if (!lastMessageDate || lastMessageDate !== today) {
      await adminDb.collection('users').doc(decodedToken.uid).update({
        dailyMessageCount: 0,
        lastMessageDate: new Date()
      })
      
      // Refresh user data after reset
      const updatedUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
      if (updatedUserDoc.exists) {
        userData = updatedUserDoc.data()
      }
    }
    
    // Check message limits after potential reset
    const userPlan = userData?.plan?.toLowerCase() || 'free';
    const subscriptionStatus = userData?.subscriptionStatus?.toLowerCase() || 'inactive';
    
    // Pro and Pro Plus users with active subscription have unlimited messages
    const hasUnlimitedMessages = (userPlan === 'pro' || userPlan === 'pro-plus') && subscriptionStatus === 'active';
    
    if (!hasUnlimitedMessages) {
      // Free users or inactive pro users have 20 messages per day limit
      if (userData?.dailyMessageCount >= 20) {
        return NextResponse.json(
          { success: false, error: 'Daily message limit (20) reached. Upgrade to Pro for unlimited messages.' },
          { status: 403, headers }
        )
      }
    }
    // If user has unlimited messages, skip the limit check entirely
    
    // Make session-aware API call
    const result = await makeSessionAwareAPICall(prompt, sessionId)
    
    if (!result.success) {
      console.error('API call failed:', {
        sessionId,
        error: result.error,
        persona: persona,
        userId: decodedToken.uid
      })
      return NextResponse.json(
        { success: false, error: result.error || 'Service temporarily unavailable. Please try again.' },
        { status: 500, headers }
      )
    }
    
    // Increment message count after successful response
    const updateData: any = {
      messageCount: (userData?.messageCount || 0) + 1,
      lastMessageDate: new Date()
    };
    
    // Only increment daily count for users with limits
    if (!hasUnlimitedMessages) {
      updateData.dailyMessageCount = (userData?.dailyMessageCount || 0) + 1;
    } else {
      // For unlimited users, we still track daily count but don't enforce limits
      updateData.dailyMessageCount = (userData?.dailyMessageCount || 0) + 1;
    }
    
    await adminDb.collection('users').doc(decodedToken.uid).update(updateData)
    
    // Log the request for monitoring (without sensitive data)
    console.log(`Chat request from user ${decodedToken.uid} for persona ${persona}`)
    
    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200, headers }
    )
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }}
    )
  }
}

// Disable other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
