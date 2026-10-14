/**
 * API Route for Issuers
 * 
 * POST: Save or update issuer information (name)
 * GET: Get issuer information by address
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { IssuerInfo } from '@/types/issuer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name } = body;

    if (!address || !name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address and name are required',
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<IssuerInfo>('issuers');

    // Normalize address to lowercase
    const normalizedAddress = address.toLowerCase();

    // Upsert: update if exists, insert if not
    const result = await collection.updateOne(
      { address: normalizedAddress },
      {
        $set: {
          name: name.trim(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          address: normalizedAddress,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        address: normalizedAddress,
        name: name.trim(),
      },
      created: result.upsertedCount > 0,
    });
  } catch (error) {
    console.error('Error saving issuer:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save issuer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<IssuerInfo>('issuers');

    const normalizedAddress = address.toLowerCase();
    const issuer = await collection.findOne({ address: normalizedAddress });

    if (!issuer) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: issuer,
    });
  } catch (error) {
    console.error('Error fetching issuer:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch issuer',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
