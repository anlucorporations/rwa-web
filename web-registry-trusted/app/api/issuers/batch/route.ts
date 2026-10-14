/**
 * API Route for Batch Issuer Information
 * 
 * POST: Get issuer information for multiple addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { IssuerInfo } from '@/types/issuer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Addresses array is required',
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection<IssuerInfo>('issuers');

    // Normalize addresses to lowercase
    const normalizedAddresses = addresses.map((addr: string) => addr.toLowerCase());

    const issuers = await collection
      .find({ address: { $in: normalizedAddresses } })
      .toArray();

    // Create an object for quick lookup (address -> IssuerInfo)
    const issuerMap: Record<string, IssuerInfo> = {};
    issuers.forEach(issuer => {
      issuerMap[issuer.address] = issuer;
    });

    return NextResponse.json({
      success: true,
      data: issuerMap,
      count: issuers.length,
    });
  } catch (error) {
    console.error('Error fetching issuers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch issuers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
