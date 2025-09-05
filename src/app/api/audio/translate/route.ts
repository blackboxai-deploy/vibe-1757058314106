import { NextRequest, NextResponse } from 'next/server';

interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

// Mock translation service - in production, integrate with Google Translate or similar
const mockTranslations: Record<string, Record<string, Record<string, string>>> = {
  'en-US': {
    'es-ES': {
      'hello': 'hola',
      'goodbye': 'adiós',
      'thank you': 'gracias',
      'please': 'por favor',
      'yes': 'sí',
      'no': 'no'
    },
    'fr-FR': {
      'hello': 'bonjour',
      'goodbye': 'au revoir',
      'thank you': 'merci',
      'please': 's\'il vous plaît',
      'yes': 'oui',
      'no': 'non'
    },
    'de-DE': {
      'hello': 'hallo',
      'goodbye': 'auf wiedersehen',
      'thank you': 'danke',
      'please': 'bitte',
      'yes': 'ja',
      'no': 'nein'
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json();
    const { text, sourceLang, targetLang } = body;

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Text, source language, and target language are required' },
        { status: 400 }
      );
    }

    // Simulate translation processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock translation logic
    const sourceTranslations = mockTranslations[sourceLang];
    let translation = text;

    if (sourceTranslations && sourceTranslations[targetLang]) {
      const targetTranslations = sourceTranslations[targetLang];
      const lowerText = text.toLowerCase();
      
      // Check for direct matches
      if (targetTranslations[lowerText]) {
        translation = targetTranslations[lowerText];
      } else {
        // Check for partial matches
        for (const [key, value] of Object.entries(targetTranslations)) {
          if (lowerText.includes(key)) {
            translation = lowerText.replace(key, value);
            break;
          }
        }
      }
    }

    // If no translation found, simulate a generic translation
    if (translation === text && sourceLang !== targetLang) {
      translation = `[${targetLang}] ${text}`;
    }

    console.log(`Translation: "${text}" (${sourceLang}) → "${translation}" (${targetLang})`);

    return NextResponse.json({
      success: true,
      originalText: text,
      translatedText: translation,
      sourceLang,
      targetLang,
      confidence: 0.85 + Math.random() * 0.1, // Mock confidence score
      processingTime: Math.round(500 + Math.random() * 1000) + 'ms'
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return supported languages
  return NextResponse.json({
    supportedLanguages: [
      {
        code: 'en-US',
        name: 'English',
        nativeName: 'English',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'es-ES',
        name: 'Spanish',
        nativeName: 'Español',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'fr-FR',
        name: 'French',
        nativeName: 'Français',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'de-DE',
        name: 'German',
        nativeName: 'Deutsch',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'pt-PT',
        name: 'Portuguese',
        nativeName: 'Português',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'it-IT',
        name: 'Italian',
        nativeName: 'Italiano',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'ja-JP',
        name: 'Japanese',
        nativeName: '日本語',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'ko-KR',
        name: 'Korean',
        nativeName: '한국어',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'zh-CN',
        name: 'Chinese (Simplified)',
        nativeName: '中文 (简体)',
        supportsSpeechToText: true,
        supportsTranslation: true
      },
      {
        code: 'ar-SA',
        name: 'Arabic',
        nativeName: 'العربية',
        supportsSpeechToText: true,
        supportsTranslation: true
      }
    ],
    totalLanguages: 10,
    lastUpdated: new Date().toISOString()
  });
}