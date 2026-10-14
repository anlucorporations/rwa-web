/**
 * API Route: Update Token Required Claims
 * POST /api/tokens/[tokenId]/claims
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
    const { claims } = body; // Array of claim topic numbers

    if (!claims || !Array.isArray(claims)) {
      return NextResponse.json(
        { success: false, message: 'Claims array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const tokensCollection = db.collection('tokens');

    // Update token with new claims array
    const result = await tokensCollection.updateOne(
      { _id: new ObjectId(tokenId) },
      {
        $set: {
          requiredClaims: claims,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Claims updated successfully',
      data: { claims },
    });
  } catch (error) {
    console.error('Error updating claims:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

