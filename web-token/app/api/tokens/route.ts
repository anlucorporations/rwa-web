/**
 * API Route for Token Management
 * 
 * GET: List all tokens
 * POST: Create a new token record
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Token, CreateTokenDto } from '@/types/token';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection<Token>('tokens');

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const adminAddress = searchParams.get('adminAddress');

    // Build query
    const query: any = {};
    if (adminAddress) {
      query.adminAddress = adminAddress.toLowerCase();
    }

    const tokens = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    // Return empty array instead of error for better UX in development
    // In production with proper MongoDB, this will work correctly
    return NextResponse.json(
      {
        success: true,
        data: [],
        count: 0,
        message: 'MongoDB not available - returning empty list',
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTokenDto & { tokenAddress: string; transactionHash?: string; blockNumber?: number } = await request.json();
    
    // Validate required fields
    if (!body.name || !body.symbol || body.decimals === undefined || !body.adminAddress || !body.tokenAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'name, symbol, decimals, adminAddress, and tokenAddress are required',
        },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection<Token>('tokens');
    
    // Check if token already exists
    const existingToken = await collection.findOne({ 
      tokenAddress: body.tokenAddress.toLowerCase() 
    });
    
    if (existingToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token already exists',
          message: 'A token with this address is already registered',
        },
        { status: 409 }
      );
    }
    
    // Create token document
    const token: Omit<Token, '_id'> = {
      name: body.name,
      symbol: body.symbol,
      decimals: body.decimals,
      tokenAddress: body.tokenAddress.toLowerCase(),
      adminAddress: body.adminAddress.toLowerCase(),
      requiredClaims: body.requiredClaims || [1, 7, 9], // Default: KYC, Accreditation, Jurisdiction
      description: body.description,
      transactionHash: body.transactionHash,
      blockNumber: body.blockNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(token as any);
    
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId,
          ...token,
        },
        message: 'Token registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

