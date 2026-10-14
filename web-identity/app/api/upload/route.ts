/**
 * API Route for File Upload to MongoDB GridFS
 * 
 * POST: Upload a document file to MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: 'Maximum file size is 10MB',
        },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: 'Only PDF, DOC, DOCX, JPG, PNG files are allowed',
        },
        { status: 400 }
      );
    }
    
    // Get database and create GridFS bucket
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, {
      bucketName: 'claim_documents'
    });
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create readable stream from buffer
    const readableStream = Readable.from(buffer);
    
    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: {
        originalName: file.name,
        contentType: file.type,
        size: file.size,
        uploadedAt: new Date(),
      }
    });
    
    // Pipe the file to GridFS
    await new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('finish', resolve)
        .on('error', reject);
    });
    
    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadStream.id.toString(),
        filename: file.name,
        contentType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
      message: 'File uploaded successfully to MongoDB',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

