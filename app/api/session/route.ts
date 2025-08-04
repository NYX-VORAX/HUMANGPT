import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { sessionManager } from '@/lib/sessionManager'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication for admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get session statistics
    const stats = sessionManager.getManagerStats()
    const activeSessions = sessionManager.getActiveSessions()

    return NextResponse.json({
      success: true,
      data: {
        activeSessions,
        ...stats,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, sessionId } = body

    switch (action) {
      case 'clear':
        if (sessionId) {
          sessionManager.clearSession(sessionId)
          return NextResponse.json({ 
            success: true, 
            message: `Session ${sessionId} cleared` 
          })
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Session ID required for clear action' 
          }, { status: 400 })
        }

      case 'cleanup':
        const removedCount = sessionManager.forceCleanup()
        return NextResponse.json({ 
          success: true, 
          message: `Cleaned up ${removedCount} sessions` 
        })

      case 'generate':
        const newSessionId = sessionManager.generateSessionId()
        return NextResponse.json({ 
          success: true, 
          sessionId: newSessionId 
        })

      case 'stats':
        if (sessionId) {
          const sessionStats = sessionManager.getSessionStats(sessionId)
          if (sessionStats) {
            return NextResponse.json({ 
              success: true, 
              sessionId,
              stats: sessionStats 
            })
          } else {
            return NextResponse.json({ 
              success: false, 
              error: 'Session not found' 
            }, { status: 404 })
          }
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Session ID required for stats action' 
          }, { status: 400 })
        }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action. Supported actions: clear, cleanup, generate, stats' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Session POST API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Disable other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
