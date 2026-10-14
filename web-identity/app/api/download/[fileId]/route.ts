/**
 * API Route for File Download from MongoDB GridFS
 * 
 * GET: Download a file by its ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required',
        },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file ID',
        },
        { status: 400 }
      );
    }
    
    // Get database and create GridFS bucket
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, {
      bucketName: 'claim_documents'
    });
    
    // Find file metadata
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found',
        },
        { status: 404 }
      );
    }
    
    const file = files[0];
    
    // Create download stream
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('end', resolve);
      downloadStream.on('error', reject);
    });
    
    const buffer = Buffer.concat(chunks);
    
    // Return file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.metadata?.contentType || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `inline; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

