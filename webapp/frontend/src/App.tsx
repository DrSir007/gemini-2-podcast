import { useState, useRef } from 'react'
import { GraduationCap, MessageCircle, BookOpen, FileText, Upload, Link2 } from 'lucide-react'
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

export default function App() {
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async () => {
    if (!selectedStyle || !selectedType || !content) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')
    setAudioUrl(null)
    setGeneratedScript(null)

    try {
      const response = await axios.post('http://localhost:8000/generate-podcast', {
        style: selectedStyle,
        content_type: selectedType,
        content: content,
      }, {
        responseType: 'blob',
      })

      // Get the script from headers
      const script = response.headers['x-script']
      if (script) {
        setGeneratedScript(script)
      }

      // Handle audio file
      if (response.data instanceof Blob) {
        const audioBlob = new Blob([response.data], { type: 'audio/mp3' })
        const url = window.URL.createObjectURL(audioBlob)
        setAudioUrl(url)
      }

      // If we got JSON instead (error case), read it
      if (response.data.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = () => {
          const result = JSON.parse(reader.result as string)
          if (result.script) {
            setGeneratedScript(result.script)
          }
          if (result.error) {
            setError(result.error)
          }
        }
        reader.readAsText(response.data)
      }
    } catch (err) {
      console.error('Error details:', err)
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.detail || 'An error occurred while generating the podcast')
      } else {
        setError('An error occurred while connecting to the server')
      }
    } finally {
      setIsLoading(false)
    }
  }

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
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Generating...' : 'Generate Podcast'}
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
