import { useState, useRef, useEffect, useCallback } from 'react'
import { GraduationCap, MessageCircle, BookOpen, FileText, Upload, Link2, Mic2 } from 'lucide-react'
import axios from 'axios'
import clsx from 'clsx'

const podcastStyles = [
  {
    id: 'expert',
    name: 'Expert Discussion',
    icon: GraduationCap,
    description: 'Professional, in-depth analysis with expert insights',
  },
  {
    id: 'casual',
    name: 'Casual Conversation',
    icon: MessageCircle,
    description: 'Fun, engaging dialogue with relatable examples',
  },
  {
    id: 'narrative',
    name: 'Narrative Journey',
    icon: BookOpen,
    description: 'Engaging storytelling that weaves facts into a narrative',
  },
]

const contentTypes = [
  {
    id: 'text',
    name: 'Paste Text',
    icon: FileText,
    description: 'Copy and paste your article, blog post, or written content',
  },
  {
    id: 'file',
    name: 'Upload Document',
    icon: Upload,
    description: 'Select a file (PDF, DOC, or TXT) from your device',
  },
  {
    id: 'url',
    name: 'Enter URL',
    icon: Link2,
    description: 'Import content directly from a webpage',
  },
]

interface Voice {
  id: string
  name: string
  description: string
}

interface PodcastResponse {
  script: string;
  audio_path: string;
}

export default function App() {
  const [selectedStyle, setSelectedStyle] = useState('conversational')
  const [selectedType, setSelectedType] = useState('monologue')
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const [voices, setVoices] = useState<Voice[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Fetch available voices
    const fetchVoices = async () => {
      try {
        const response = await axios.get('http://localhost:8000/voices')
        setVoices(response.data.voices)
      } catch (err) {
        console.error('Error fetching voices:', err)
      }
    }
    fetchVoices()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setContent(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    setGeneratedScript(null);

    if (!content || !selectedStyle || !selectedType || !selectedVoice) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post<PodcastResponse>('http://localhost:8000/generate-podcast', {
        content,
        style: selectedStyle,
        type: selectedType,
        voice: selectedVoice
      });

      const { script, audio_path } = response.data;
      
      // Get the filename from the path
      const filename = audio_path.split('/').pop();
      
      // Set the audio URL using the backend endpoint
      setAudioUrl(`http://localhost:8000/audio/${filename}`);
      setGeneratedScript(script);

      // Create a downloadable link for the script
      const blob = new Blob([script], { type: 'text/plain' });
      const scriptUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = scriptUrl;
      link.download = 'podcast-script.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(scriptUrl);

    } catch (err) {
      console.error('Error generating podcast:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate podcast');
    } finally {
      setIsLoading(false);
    }
  }, [content, selectedStyle, selectedType, selectedVoice]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Create Your AI Podcast</h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose your podcast style and add your content
          </p>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">Select Your Podcast Style</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {podcastStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={clsx(
                  'relative rounded-lg p-6 text-left transition-all duration-200 hover:bg-gray-50',
                  selectedStyle === style.id ? 'ring-2 ring-primary-500 bg-primary-50' : 'border'
                )}
              >
                <div className="flex items-center space-x-4">
                  <style.icon className="h-6 w-6 text-primary-600" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{style.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{style.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">Choose Your Voice</h2>
          <p className="mt-2 text-sm text-gray-600">
            Select a neural voice for your podcast. Each voice has unique characteristics.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice.id)}
                className={clsx(
                  'relative rounded-lg p-6 text-left transition-all duration-200 hover:bg-gray-50',
                  selectedVoice === voice.id ? 'ring-2 ring-primary-500 bg-primary-50' : 'border'
                )}
              >
                <div className="flex items-center space-x-4">
                  <Mic2 className="h-6 w-6 text-primary-600" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{voice.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{voice.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">Add Your Content</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {contentTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id)
                  if (type.id === 'file' && fileInputRef.current) {
                    fileInputRef.current.click()
                  }
                }}
                className={clsx(
                  'relative rounded-lg p-6 text-left transition-all duration-200 hover:bg-gray-50',
                  selectedType === type.id ? 'ring-2 ring-primary-500 bg-primary-50' : 'border'
                )}
              >
                <div className="flex items-center space-x-4">
                  <type.icon className="h-6 w-6 text-primary-600" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">{type.name}</p>
                    <p className="mt-1 text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
          />

          <div className="mt-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your content here..."
              className="input h-40"
            />
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-sm">{error}</div>
          )}

          <div className="mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Mic2 className="animate-pulse mr-2" size={20} />
                  Generating...
                </>
              ) : (
                'Generate Podcast'
              )}
            </button>
          </div>
        </div>

        {/* Generated Content Section */}
        {(generatedScript || audioUrl) && (
          <div className="mt-8 space-y-6">
            {/* Audio Player */}
            {audioUrl && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Listen to Your Podcast</h3>
                <audio controls className="w-full" src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
                <a
                  href={audioUrl}
                  download="podcast.mp3"
                  className="mt-4 inline-block text-primary-600 hover:text-primary-700"
                >
                  Download Audio
                </a>
              </div>
            )}

            {/* Script Display */}
            {generatedScript && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Generated Script</h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded">
                  {generatedScript}
                </pre>
                <button
                  onClick={() => {
                    const blob = new Blob([generatedScript], { type: 'text/plain' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'podcast-script.txt'
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    a.remove()
                  }}
                  className="mt-4 text-primary-600 hover:text-primary-700"
                >
                  Download Script
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
