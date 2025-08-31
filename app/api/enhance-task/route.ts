import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { taskId, title } = await request.json();
    
    // Llamar al webhook de n8n para mejorar la tarea
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'URL del webhook de n8n no configurada' },
        { status: 500 }
      );
    }
    
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        title,
        userEmail: 'demo@example.com', // En una app real, esto vendría de autenticación
      }),
    });
    
    if (!response.ok) {
      throw new Error(`El webhook de n8n respondió con estado ${response.status}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error mejorando tarea:', error);
    return NextResponse.json(
      { error: 'Error al mejorar la tarea' },
      { status: 500 }
    );
  }
}
