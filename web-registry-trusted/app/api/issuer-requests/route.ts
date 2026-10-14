/**
 * API Route for Issuer Requests
 * 
 * GET: Get claim requests for a specific issuer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ClaimRequest } from '@/types/claim-request';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const issuerAddress = searchParams.get('issuerAddress');
    const status = searchParams.get('status');
    
    if (!issuerAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Issuer address is required',
        },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection<ClaimRequest>('claim_requests');
    
    // Build query
    const query: any = {
      issuerAddress: issuerAddress.toLowerCase()
    };
    
    if (status) {
      query.status = status;
    }
    
    const requests = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error('Error fetching issuer requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

