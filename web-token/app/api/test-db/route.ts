/**
 * Test MongoDB Connection
 * 
 * GET: Test if MongoDB is connected and list tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    const db = await getDatabase();
    console.log('✅ MongoDB connected successfully');
    
    // Get all tokens
    const tokens = await db.collection('tokens').find().toArray();
    console.log(`📊 Found ${tokens.length} tokens in database`);
    
    // Get database stats
    const stats = await db.stats();
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      data: {
        connected: true,
        database: 'rwa',
        totalTokens: tokens.length,
        tokens: tokens.map(t => ({
          _id: t._id.toString(),
          name: t.name,
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          adminAddress: t.adminAddress,
          complianceAddress: t.complianceAddress,
          requiredClaims: t.requiredClaims,
        })),
        dbStats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize,
        }
      },
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to MongoDB',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Make sure MongoDB is running on localhost:27017',
      },
      { status: 500 }
    );
  }
}

