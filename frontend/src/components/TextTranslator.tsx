import React, { useState } from 'react';
import { Button, Select, Card, Typography, Space, Alert, Input, Spin } from 'antd';
import { SoundOutlined, SwapOutlined, TranslationOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';

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

const TextTranslator: React.FC = () => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [fromLanguage, setFromLanguage] = useState('en');
  const [toLanguage, setToLanguage] = useState('ta');
  const [error, setError] = useState('');

  const translateText = async (text: string) => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setError('');
    
    try {
      const response = await api.post('/api/translate', {
        text,
        from: fromLanguage,
        to: toLanguage,
      });

      setTranslation(response.data.translatedText);
    } catch (err) {
      setError('Translation failed. Please check your internet connection.');
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslate = () => {
    if (inputText.trim()) {
      translateText(inputText);
    }
  };

  const speakTranslation = () => {
    if (!translation) return;

    const utterance = new SpeechSynthesisUtterance(translation);
    const toLang = LANGUAGES.find(lang => lang.code === toLanguage);
    
    if (toLang?.speechCode) {
      utterance.lang = toLang.speechCode;
    }
    
    utterance.rate = 0.8;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  const swapLanguages = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
    setInputText('');
    setTranslation('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <Title level={2} className="text-center mb-6">
          Text Translator
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
          <Button
            type="link"
            icon={<SwapOutlined />}
            onClick={swapLanguages}
            className="text-blue-500"
          >
            Swap Languages
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card title="Enter Text" className="h-64">
            <TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your text here..."
              className="h-32 resize-none"
              maxLength={1000}
            />
            <div className="mt-2 text-right">
              <Text type="secondary" className="text-xs">
                {inputText.length}/1000 characters
              </Text>
            </div>
          </Card>

          <Card 
            title="Translation" 
            className="h-64"
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
            <div className="h-32 overflow-y-auto p-3 bg-gray-50 rounded border">
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
            <Button
              type="primary"
              size="large"
              icon={<TranslationOutlined />}
              onClick={handleTranslate}
              loading={isTranslating}
              disabled={!inputText.trim()}
            >
              Translate
            </Button>
          </Space>
        </div>

        <div className="mt-4 text-center">
          <Text type="secondary" className="text-sm">
            💡 Type your text and click "Translate" to get instant translation
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default TextTranslator;