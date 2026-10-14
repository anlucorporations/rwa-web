/**
 * API Route for Updating Request Status
 * 
 * POST: Approve or reject a claim request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { UpdateRequestStatusDto } from '@/types/claim-request';

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequestStatusDto = await request.json();
    
    // Validate required fields
    if (!body.requestId || !body.status || !body.issuerSignedMessage || !body.issuerSignature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'requestId, status, issuerSignedMessage, and issuerSignature are required',
        },
        { status: 400 }
      );
    }
    
    // Validate status
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
          message: 'Status must be either "approved" or "rejected"',
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(body.requestId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request ID',
        },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection('claim_requests');
    
    // Update the request with issuer signature
    const result = await collection.updateOne(
      { _id: new ObjectId(body.requestId) },
      {
        $set: {
          status: body.status,
          reviewedAt: new Date(),
          reviewNote: body.reviewNote || '',
          issuerSignedMessage: body.issuerSignedMessage,
          issuerSignature: body.issuerSignature,
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request not found',
        },
        { status: 404 }
      );
    }
    
    // Get the updated request
    const updatedRequest = await collection.findOne({ _id: new ObjectId(body.requestId) });
    
    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Request ${body.status} successfully`,
    });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

