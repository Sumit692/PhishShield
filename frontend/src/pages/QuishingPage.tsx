import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {
  QrCode,
  Camera,
  Upload,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { api, ApiError } from '../services/api';
import type { AnalysisResult } from '../types';
import { Button, CopyButton } from '../components/arc';
import { RiskBadge } from '../components/RiskBadge';
import { ScoreMeter } from '../components/ScoreMeter';
import { IndicatorItem } from '../components/IndicatorItem';
import styles from './QuishingPage.module.css';
import analyzeStyles from './AnalyzePage.module.css';

interface DemoQrSample {
  id: string;
  label: string;
  category: 'Phishing' | 'Legitimate';
  url: string;
  description: string;
  dataUrl?: string;
}

const DEFAULT_DEMO_SAMPLES: DemoQrSample[] = [
  {
    id: 'qr-mfa-phish',
    label: 'Fake Microsoft MFA Renewal QR',
    category: 'Phishing',
    url: 'http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run',
    description: 'Bypasses secure mail gateways by embedding a raw IP credential harvester inside an image.'
  },
  {
    id: 'qr-bank-lock',
    label: 'Deceptive Bank Unlock QR',
    category: 'Phishing',
    url: 'https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214',
    description: 'A physical sticker lure impersonating Chase Bank with lookalike subdomains.'
  },
  {
    id: 'qr-mit-portal',
    label: 'Legitimate University Portal QR',
    category: 'Legitimate',
    url: 'https://www.mit.edu/education/schools-and-departments',
    description: 'Standard authentic QR code directing students to the official MIT academic directory.'
  }
];

export const QuishingPage: React.FC = () => {
  useDocumentTitle('QR Code Scanner (Quishing)');

  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [samples, setSamples] = useState<DemoQrSample[]>(DEFAULT_DEMO_SAMPLES);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [decodedUrl, setDecodedUrl] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Camera handling
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generate QR thumbnail previews for exhibition samples
  useEffect(() => {
    let isMounted = true;
    Promise.all(
      DEFAULT_DEMO_SAMPLES.map(async (sample) => {
        try {
          const dataUrl = await QRCode.toDataURL(sample.url, {
            margin: 1,
            width: 120,
            color: { dark: '#1B4332', light: '#FFFFFF' }
          });
          return { ...sample, dataUrl };
        } catch {
          return sample;
        }
      })
    ).then((updated) => {
      if (isMounted) setSamples(updated);
    });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start decoding interval
      scanIntervalRef.current = window.setInterval(decodeVideoFrame, 300);
    } catch (err: any) {
      setErrorMsg('Camera access was denied or is unavailable on this device. Please use image upload.');
      setMode('upload');
    }
  };

  const decodeVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      stopCamera();
      handleDecodedContent(code.data);
    }
  };

  const handleDecodedContent = async (text: string) => {
    const raw = text.trim();
    setDecodedUrl(raw);
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await api.analysis.analyze(raw);
      setResult(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unable to evaluate decoded QR destination. Please verify link structure.');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const processImageFile = (file: File) => {
    setErrorMsg('');
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleDecodedContent(code.data);
        } else {
          setErrorMsg('No readable QR code was detected in this image. Ensure the code is clear and in focus.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: DemoQrSample) => {
    handleDecodedContent(sample.url);
  };

  const handleReset = () => {
    setDecodedUrl('');
    setResult(null);
    setErrorMsg('');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.pageWrapper}>
      <div className="container">
        {/* Navigation Tabs between Tools */}
        <div className={styles.toolsNav}>
          <Link to="/analyze" className={styles.toolTab}>
            Inspect URL
          </Link>
          <Link to="/quishing" className={`${styles.toolTab} ${styles.toolTabActive}`}>
            <QrCode size={15} />
            Quishing Scanner (QR)
          </Link>
          <Link to="/email-inspector" className={styles.toolTab}>
            Email & SMS Inspector
          </Link>
          <Link to="/arena" className={styles.toolTab}>
            Spot the Phish Arena 🎮
          </Link>
          <Link to="/extension" className={styles.toolTab}>
            Browser Extension
          </Link>
        </div>

        <header className={styles.pageHeader}>
          <div className={styles.badgePill}>
            <QrCode size={13} />
            <span>Anti-Quishing Defense</span>
          </div>
          <h1 className={styles.pageTitle}>QR Code Phishing ("Quishing") Scanner</h1>
          <p className={styles.pageSubtitle}>
            Scan physical or digital QR codes to decode embedded destinations and inspect
            them across 25+ lexical and structural vectors before you open them on your mobile device.
          </p>
        </header>

        {/* Input Card */}
        <section className={styles.card}>
          <div className={styles.modeSwitchContainer}>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'upload' ? styles.modeBtnActive : ''}`}
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
            >
              <Upload size={16} />
              Upload QR Image
            </button>
            <button
              type="button"
              className={`${styles.modeBtn} ${mode === 'camera' ? styles.modeBtnActive : ''}`}
              onClick={() => {
                setMode('camera');
                startCamera();
              }}
            >
              <Camera size={16} />
              Live Webcam Scan
            </button>
          </div>

          {errorMsg && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger-text)',
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                role="button"
                aria-label="Upload QR Code Image"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <QrCode className={styles.dropIcon} />
                <div className={styles.dropTitle}>
                  {loading ? 'Processing QR Code...' : 'Drop a QR code image here, or click to browse'}
                </div>
                <div className={styles.dropSubtitle}>
                  Supports PNG, JPG, WebP, SVG screenshots from emails, flyers, or invoices
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.cameraWrapper}>
              <div className={styles.videoContainer}>
                <video ref={videoRef} className={styles.videoElement} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className={styles.scanOverlay}>
                  <div className={styles.reticle}>
                    <div className={styles.reticleCorner} style={{ top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 }} />
                    <div className={styles.reticleCorner} style={{ top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 }} />
                    <div className={styles.reticleCorner} style={{ bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 }} />
                    <div className={styles.reticleCorner} style={{ bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 }} />
                  </div>
                </div>
              </div>

              <div className={styles.cameraControls}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={cameraActive ? stopCamera : startCamera}
                >
                  <RefreshCw size={14} style={{ marginRight: '6px' }} />
                  {cameraActive ? 'Pause Camera' : 'Resume Camera'}
                </Button>
              </div>
            </div>
          )}

          {/* Exhibition Demonstration Samples */}
          <div className={styles.samplesSection}>
            <div className={styles.samplesHeader}>
              <span className={styles.samplesTitle}>Exhibition Demonstration Samples</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Click any sample to simulate a live QR scan
              </span>
            </div>
            <div className={styles.samplesGrid}>
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  className={styles.sampleCard}
                  onClick={() => handleSelectSample(sample)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSelectSample(sample);
                  }}
                >
                  {sample.dataUrl ? (
                    <img src={sample.dataUrl} alt={sample.label} className={styles.sampleQrThumb} />
                  ) : (
                    <div className={styles.sampleQrThumb} />
                  )}
                  <div className={styles.sampleCardInfo}>
                    <div className={styles.sampleCardLabel}>{sample.label}</div>
                    <div className={styles.sampleCardDesc}>{sample.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Decoded Target Result Section */}
        {decodedUrl && (
          <section className={styles.decodedCard}>
            <div className={styles.decodedHeader}>
              <span className={styles.decodedTitle}>Decoded QR Payload</span>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Scan Another QR
              </Button>
            </div>
            <div className={styles.decodedUrlBox}>
              <span className={styles.decodedUrlText}>{decodedUrl}</span>
              <CopyButton value={decodedUrl} label="Copy Link" variant="outline" />
            </div>
          </section>
        )}

        {/* Comprehensive Machine Learning Risk Assessment */}
        {result && (
          <section className={analyzeStyles.resultCard}>
            <div className={analyzeStyles.resultHeader}>
              <div>
                <div className={analyzeStyles.resultSubtitle}>
                  PhishShield ML Evaluation
                </div>
                <div className={analyzeStyles.resultUrlRow}>
                  <span className={analyzeStyles.urlText} title={result.submitted_url}>
                    {result.submitted_url}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <RiskBadge level={result.risk_level} label={result.classification} />
              </div>
            </div>

            {/* Score & Model Details */}
            <div className={analyzeStyles.scoreGrid}>
              <ScoreMeter score={result.risk_score} level={result.risk_level} />

              <div className={analyzeStyles.confidenceBox}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Model Confidence
                </span>
                <div className={analyzeStyles.confidenceValue}>
                  {result.model_confidence}%
                </div>
                <p className={analyzeStyles.confidenceNote}>
                  {result.confidence_note || 'Statistical probability of phishing characteristics.'}
                </p>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Engine: {result.model_version}
                </div>
              </div>
            </div>

            {/* Security Summary & Guidance */}
            <div className={`${analyzeStyles.adviceBox} ${analyzeStyles[result.risk_level]}`}>
              <div className={analyzeStyles.adviceTitle}>Security Summary & Guidance</div>
              <p className={analyzeStyles.adviceText}>{result.summary}</p>
              <p className={analyzeStyles.adviceText} style={{ fontWeight: 500 }}>
                Recommendation: {result.recommendation}
              </p>
            </div>

            {/* Threat Indicators */}
            <div className={analyzeStyles.indicatorsSection}>
              <div className={analyzeStyles.indicatorsHeader}>
                <h2 className={analyzeStyles.indicatorsTitle}>
                  Extracted Signals & Indicators
                </h2>
                <span className={analyzeStyles.indicatorsCount}>
                  {result.indicators.length} {result.indicators.length === 1 ? 'signal' : 'signals'} detected
                </span>
              </div>

              {result.indicators.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  No structural anomalies or brand spoofing detected in this QR destination.
                </p>
              ) : (
                <div className={analyzeStyles.indicatorsList}>
                  {result.indicators.map((ind, index) => (
                    <IndicatorItem key={`${ind.id}-${index}`} indicator={ind} />
                  ))}
                </div>
              )}
            </div>

            {/* Quishing Education Callout */}
            <div className={styles.intelBox}>
              <div className={styles.intelTitle}>
                <Info size={16} />
                Why Quishing is Deceptive
              </div>
              <p className={styles.intelText}>
                QR phishing ("quishing") circumvents traditional email security scanners because
                security software cannot inspect plain text links within image payloads. Attackers
                also paste fraudulent physical stickers over legitimate QR codes on parking meters,
                shared bikes, and restaurant table menus. Always inspect the destination domain
                before submitting credentials or payment details.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
export default QuishingPage;
