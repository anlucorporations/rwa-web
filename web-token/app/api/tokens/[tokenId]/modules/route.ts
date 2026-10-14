/**
 * API Route: Update Token Compliance Modules
 * POST /api/tokens/[tokenId]/modules
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
    const { modules } = body; // Array of module addresses

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { success: false, message: 'Modules array is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const tokensCollection = db.collection('tokens');

    // Update token with new modules array
    const result = await tokensCollection.updateOne(
      { _id: new ObjectId(tokenId) },
      {
        $set: {
          complianceModules: modules,
          complianceAddress: modules.length > 0 ? modules[0] : null, // Keep first for backward compatibility
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
      message: 'Modules updated successfully',
      data: { modules },
    });
  } catch (error) {
    console.error('Error updating modules:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

