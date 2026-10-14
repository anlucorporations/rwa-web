/**
 * Test API for GridFS functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GridFSBucket } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, {
      bucketName: 'claim_documents'
    });
    
    // List all files in GridFS
    const files = await bucket.find().toArray();
    
    // Get collection stats
    const claimRequests = await db.collection('claim_requests').find().toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        totalFiles: files.length,
        files: files.map(f => ({
          _id: f._id.toString(),
          filename: f.filename,
          length: f.length,
          uploadDate: f.uploadDate,
          metadata: f.metadata,
        })),
        totalRequests: claimRequests.length,
        requests: claimRequests.map(r => ({
          _id: r._id.toString(),
          requesterAddress: r.requesterAddress,
          issuerAddress: r.issuerAddress,
          claimTopic: r.claimTopic,
          documentFileId: r.documentFileId,
          documentName: r.documentName,
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error('Error testing GridFS:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test GridFS',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

