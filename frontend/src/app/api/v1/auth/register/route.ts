import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 簡単なバリデーション
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All fields are required',
            details: [
              !body.email && { field: 'email', message: 'Email is required' },
              !body.password && { field: 'password', message: 'Password is required' },
              !body.name && { field: 'name', message: 'Name is required' },
            ].filter(Boolean)
          }
        },
        { status: 400 }
      );
    }

    // パスワードの検証
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [
              { field: 'password', message: 'Password must be at least 8 characters long' }
            ]
          }
        },
        { status: 400 }
      );
    }

    // 成功レスポンス（モック）
    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: '123456',
          email: body.email,
          name: body.name,
          role: 'user',
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration'
        }
      },
      { status: 500 }
    );
  }
}