/**
 * API Route: Update Token Price
 * POST /api/tokens/[tokenId]/price
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
    const { price } = body;

    if (price === undefined || price === null) {
      return NextResponse.json(
        { success: false, message: 'Price is required' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { success: false, message: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const tokensCollection = db.collection('tokens');

    // Update token price
    const result = await tokensCollection.updateOne(
      { _id: new ObjectId(tokenId) },
      {
        $set: {
          price: parseFloat(price),
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
      message: 'Price updated successfully',
      data: { price: parseFloat(price) },
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

