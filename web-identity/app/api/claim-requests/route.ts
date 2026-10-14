/**
 * API Route for Claim Requests
 * 
 * GET: List all claim requests
 * POST: Create a new claim request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { CreateClaimRequestDto, ClaimRequest } from '@/types/claim-request';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection<ClaimRequest>('claim_requests');
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const requesterAddress = searchParams.get('requesterAddress');
    const issuerAddress = searchParams.get('issuerAddress');
    const status = searchParams.get('status');
    
    // Build query
    const query: any = {};
    if (requesterAddress) {
      query.requesterAddress = requesterAddress.toLowerCase();
    }
    if (issuerAddress) {
      query.issuerAddress = issuerAddress.toLowerCase();
    }
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
    console.error('Error fetching claim requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch claim requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateClaimRequestDto = await request.json();
    
    // Validate required fields
    if (!body.requesterAddress || !body.issuerAddress || !body.claimTopic || !body.signedMessage || !body.signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'requesterAddress, issuerAddress, claimTopic, signedMessage, and signature are required',
        },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection<ClaimRequest>('claim_requests');
    
    // Create claim request document
    const claimRequest: Omit<ClaimRequest, '_id'> = {
      requesterAddress: body.requesterAddress.toLowerCase(),
      issuerAddress: body.issuerAddress.toLowerCase(),
      claimTopic: body.claimTopic,
      message: body.message || '',
      documentFileId: body.documentFileId,
      documentName: body.documentName,
      documentContentType: body.documentContentType,
      documentSize: body.documentSize,
      signedMessage: body.signedMessage,
      signature: body.signature,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(claimRequest as any);
    
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId,
          ...claimRequest,
        },
        message: 'Claim request created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating claim request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create claim request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

