import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseStatus, testFirebaseConnection, safeInitializeFirebase } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Firebase health check initiated');
    
    // Get current Firebase status
    const status = getFirebaseStatus();
    console.log('📊 Current Firebase status:', status);
    
    // Attempt safe initialization if not already initialized
    if (!status.initialized) {
      console.log('🚀 Attempting Firebase initialization...');
      const app = safeInitializeFirebase();
      if (!app) {
        return NextResponse.json({
          status: 'error',
          message: 'Firebase initialization failed',
          details: status,
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }
    }
    
    // Test connection if requested
    const testConnection = request.nextUrl.searchParams.get('test') === 'true';
    let connectionTest = null;
    
    if (testConnection) {
      console.log('🧪 Testing Firebase connection...');
      connectionTest = await testFirebaseConnection();
    }
    
    // Get updated status
    const updatedStatus = getFirebaseStatus();
    
    const response = {
      status: updatedStatus.initialized && !updatedStatus.hasError ? 'healthy' : 'unhealthy',
      firebase: {
        ...updatedStatus,
        connectionTest: testConnection ? connectionTest : 'not_requested'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        projectId: process.env.FIREBASE_PROJECT_ID || 'not_set'
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Firebase health check completed:', response.status);
    
    return NextResponse.json(response, {
      status: response.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('❌ Firebase health check failed:', error);
    
    const errorResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      firebase: getFirebaseStatus(),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
