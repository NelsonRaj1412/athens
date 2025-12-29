import React, { useState, useRef, useEffect } from 'react';
import { Button, Select, Card, Typography, Space, Alert, Spin, Input } from 'antd';
import { AudioOutlined, StopOutlined, SoundOutlined, EditOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';

// TypeScript declarations for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Language {
  code: string;
  name: string;
  speechCode?: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', speechCode: 'en-US' },
  { code: 'ta', name: 'Tamil', speechCode: 'ta-IN' },
  { code: 'hi', name: 'Hindi', speechCode: 'hi-IN' },
  { code: 'es', name: 'Spanish', speechCode: 'es-ES' },
  { code: 'fr', name: 'French', speechCode: 'fr-FR' },
  { code: 'de', name: 'German', speechCode: 'de-DE' },
  { code: 'zh', name: 'Chinese', speechCode: 'zh-CN' },
  { code: 'ja', name: 'Japanese', speechCode: 'ja-JP' },
  { code: 'ko', name: 'Korean', speechCode: 'ko-KR' },
  { code: 'ar', name: 'Arabic', speechCode: 'ar-SA' },
];

const VoiceTranslator: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [fromLanguage, setFromLanguage] = useState('en');
  const [toLanguage, setToLanguage] = useState('ta');
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    console.log('Checking speech recognition support...');
    console.log('webkitSpeechRecognition:', 'webkitSpeechRecognition' in window);
    console.log('SpeechRecognition:', 'SpeechRecognition' in window);
    console.log('isSecureContext:', window.isSecureContext);
    console.log('protocol:', window.location.protocol);
    console.log('hostname:', window.location.hostname);
    
    // Check if we're on HTTPS or localhost
    const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    
    if (!isSecureContext) {
      setError('Speech recognition requires HTTPS. Please use HTTPS or localhost.');
      return;
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          translateText(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log('Speech recognition error:', event.error);
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'network':
            errorMessage = 'Speech recognition network error. Try refreshing the page or check if Chrome can access speech services.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        console.log('Error message set:', errorMessage);
        setError(errorMessage);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
    }

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [fromLanguage]);

  const translateText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setError('');
    
    try {
      const response = await api.post('/api/translate/', {
        text,
        from: fromLanguage,
        to: toLanguage,
      });

      setTranslation(response.data.translatedText);
    } catch (err) {
      console.error('Translation error:', err);
      setError(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const startListening = async () => {
    console.log('startListening called');
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Check microphone permissions first
    try {
      console.log('Requesting microphone access...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Microphone access denied. Please allow microphone access in browser settings.');
      return;
    }

    setError('');
    setTranscript('');
    setTranslation('');
    
    const fromLang = LANGUAGES.find(lang => lang.code === fromLanguage);
    if (fromLang?.speechCode) {
      recognitionRef.current.lang = fromLang.speechCode;
    }
    
    try {
      console.log('Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      console.log('Speech recognition started');
    } catch (err) {
      console.error('Speech recognition start error:', err);
      setError('Failed to start speech recognition. Please try again.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const speakTranslation = () => {
    if (!translation || !synthRef.current) return;

    const utterance = new SpeechSynthesisUtterance(translation);
    const toLang = LANGUAGES.find(lang => lang.code === toLanguage);
    
    if (toLang?.speechCode) {
      utterance.lang = toLang.speechCode;
    }
    
    utterance.rate = 0.8;
    utterance.pitch = 1;
    
    synthRef.current.speak(utterance);
  };

  const swapLanguages = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
    setTranscript('');
    setTranslation('');
    setInputText('');
  };

  const handleTextTranslate = () => {
    if (inputText.trim()) {
      setTranscript(inputText);
      translateText(inputText);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <Title level={2} className="text-center mb-6">
          Voice Translator
        </Title>

        {error && (
          <Alert
            message={error}
            type="error"
            closable
            onClose={() => setError('')}
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Text strong>From Language:</Text>
            <Select
              value={fromLanguage}
              onChange={setFromLanguage}
              className="w-full mt-2"
              size="large"
            >
              {LANGUAGES.map(lang => (
                <Option key={lang.code} value={lang.code}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>To Language:</Text>
            <Select
              value={toLanguage}
              onChange={setToLanguage}
              className="w-full mt-2"
              size="large"
            >
              {LANGUAGES.map(lang => (
                <Option key={lang.code} value={lang.code}>
                  {lang.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        <div className="text-center mb-6">
          <Space>
            <Button
              type="link"
              onClick={swapLanguages}
              className="text-blue-500"
            >
              ⇄ Swap Languages
            </Button>
            <Button
              type={useTextInput ? "primary" : "default"}
              onClick={() => setUseTextInput(!useTextInput)}
              icon={<EditOutlined />}
            >
              {useTextInput ? 'Voice Mode' : 'Text Mode'}
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card title={useTextInput ? "Enter Text" : "Original Text"} className="h-48">
            {useTextInput ? (
              <div className="h-32">
                <TextArea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your text here..."
                  className="h-24 resize-none"
                  maxLength={100}
                />
                <div className="mt-2 text-right">
                  <Text type="secondary" className="text-xs">
                    {inputText.length}/100 characters
                  </Text>
                </div>
              </div>
            ) : (
              <div className="h-32 overflow-y-auto">
                {transcript || (
                  <Text type="secondary">
                    Click the microphone to start speaking...
                  </Text>
                )}
              </div>
            )}
          </Card>

          <Card 
            title="Translation" 
            className="h-48"
            extra={
              translation && (
                <Button
                  type="text"
                  icon={<SoundOutlined />}
                  onClick={speakTranslation}
                  title="Play translation"
                />
              )
            }
          >
            <div className="h-32 overflow-y-auto">
              {isTranslating ? (
                <div className="flex items-center justify-center h-full">
                  <Spin size="small" />
                  <Text className="ml-2">Translating...</Text>
                </div>
              ) : (
                translation || (
                  <Text type="secondary">
                    Translation will appear here...
                  </Text>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="text-center">
          <Space size="large">
            {useTextInput ? (
              <Button
                type="primary"
                size="large"
                icon={<EditOutlined />}
                onClick={handleTextTranslate}
                loading={isTranslating}
                disabled={!inputText.trim()}
              >
                Translate Text
              </Button>
            ) : (
              <Button
                type={isListening ? "default" : "primary"}
                size="large"
                icon={isListening ? <StopOutlined /> : <AudioOutlined />}
                onClick={isListening ? stopListening : startListening}
                className={isListening ? "bg-red-500 border-red-500 text-white" : ""}
              >
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Button>
            )}
          </Space>
        </div>

        <div className="mt-4 text-center">
          <Text type="secondary" className="text-sm">
            {useTextInput ? (
              <span>
                📝 Type your text and click "Translate Text" for instant translation
              </span>
            ) : (
              <>
                {isListening && (
                  <span className="text-red-500">
                    🎤 Listening... Speak now
                  </span>
                )}
                {!isListening && (
                  <div className="mt-2">
                    <Text type="secondary">
                      💡 Having microphone issues? Try "Text Mode" button above
                    </Text>
                  </div>
                )}
              </>
            )}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default VoiceTranslator;