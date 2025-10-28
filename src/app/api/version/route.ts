import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.json');
    
    if (!fs.existsSync(versionPath)) {
      return NextResponse.json({
        version: '1.0.0',
        buildDate: new Date().toISOString(),
        description: 'Версия не найдена'
      });
    }

    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    return NextResponse.json(versionData);
  } catch (error) {
    console.error('Ошибка получения версии:', error);
    return NextResponse.json({
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      description: 'Ошибка получения версии'
    }, { status: 500 });
  }
}