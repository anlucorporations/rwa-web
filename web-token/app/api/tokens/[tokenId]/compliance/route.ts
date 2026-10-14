/**
 * API Route for Token Compliance Management
 * 
 * POST: Add compliance contract to a token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params;
    const body = await request.json();
    
    if (!body.complianceAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing compliance address',
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(tokenId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token ID',
        },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection('tokens');
    
    // Update the token with compliance address
    const result = await collection.updateOne(
      { _id: new ObjectId(tokenId) },
      {
        $set: {
          complianceAddress: body.complianceAddress.toLowerCase(),
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token not found',
        },
        { status: 404 }
      );
    }
    
    // Get the updated token
    const updatedToken = await collection.findOne({ _id: new ObjectId(tokenId) });
    
    return NextResponse.json({
      success: true,
      data: updatedToken,
      message: 'Compliance contract added successfully',
    });
  } catch (error) {
    console.error('Error adding compliance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add compliance',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

