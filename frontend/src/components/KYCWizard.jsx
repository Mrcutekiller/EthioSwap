import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const KYCWizard = ({ user, onComplete, onClose }) => {
  const [step, setStep] = useState(1); // 1=intro, 2=info, 3=id-front, 4=id-back, 5=face, 6=done
  const [fullName, setFullName] = useState('');
  const [kycPhone, setKycPhone] = useState(user.phone || '');
  const [age, setAge] = useState('');
  const [idType, setIdType] = useState('National ID Card');
  const [address, setAddress] = useState('');

  // Convex Mutations
  const updateInfo = useMutation(api.users.updateKycInfo);
  const updateDocs = useMutation(api.users.updateKycDocs);
  const updateSelfie = useMutation(api.users.updateKycSelfie);

  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null); // 'front','back','face'
  const [selfieCapture, setSelfieCapture] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceLiveReady, setFaceLiveReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Helper to compress and convert File/Blob to compressed base64 JPEG
  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 640;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.5 quality to stay well below Convex's 1MB limit (approx 40KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(new Error("Failed to load image for compression"));
    };
    reader.onerror = (err) => reject(err);
  });

  // Cleanup camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const openCamera = async (target) => {
    setError('');
    setCameraTarget(target);
    try {
      const facingMode = target === 'front' || target === 'back' ? 'environment' : 'user';
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      streamRef.current = stream;
      setCameraOpen(true);
      setFaceLiveReady(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          if (target === 'face') {
            setTimeout(() => setFaceLiveReady(true), 2000);
          } else {
            setFaceLiveReady(true);
          }
        }
      }, 100);
    } catch (err) {
      setError('Camera access denied. Please use file upload instead.');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  };

  const handleCapture = async () => {
    const blob = await captureFrame();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const file = new File([blob], `${cameraTarget}_capture.jpg`, { type: 'image/jpeg' });

    if (cameraTarget === 'front') { setIdFront(file); setFrontPreview(url); }
    else if (cameraTarget === 'back') { setIdBack(file); setBackPreview(url); }
    else if (cameraTarget === 'face') { setSelfieCapture(file); setSelfiePreview(url); }

    stopCamera();
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === 'front') { setIdFront(file); setFrontPreview(url); }
    else if (side === 'back') { setIdBack(file); setBackPreview(url); }
    else if (side === 'face') { setSelfieCapture(file); setSelfiePreview(url); }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !kycPhone.trim() || !age.trim() || !idType) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateInfo({
        userId: user.id,
        name: fullName,
        phone: kycPhone,
        age,
        idType,
        address
      });
      setStep(3); // Go to ID Front upload
    } catch (err) {
      setError(err.message || 'Failed to save information. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadIDs = async () => {
    if (!idFront || !idBack) { setError('Please capture or upload both front and back of your ID.'); return; }
    setLoading(true); setError('');
    try {
      const frontBase64 = await toBase64(idFront);
      const backBase64 = await toBase64(idBack);
      
      await updateDocs({
        userId: user.id,
        idFront: frontBase64,
        idBack: backBase64
      });
      setStep(5); // Go to selfie step
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFace = async () => {
    if (!selfieCapture) { setError('Please capture a selfie first.'); return; }
    setLoading(true); setError('');
    try {
      const selfieBase64 = await toBase64(selfieCapture);
      
      const updatedUser = await updateSelfie({
        userId: user.id,
        selfie: selfieBase64
      });
      setStep(6); // Done
      if (onComplete) onComplete(updatedUser);
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Intro', 'Info', 'Front', 'Back', 'Selfie', 'Done'];

  return (
    <div className="overlay modal-center" style={{ zIndex: 300 }}>
      <div className="modal-box" style={{ maxWidth: '420px', padding: '0', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Verify Your Identity</h3>
            <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', fontFamily: 'var(--font)' }}>✕</button>
          </div>

          {/* Step track */}
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '16px', gap: '0' }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, background: step > i + 1 ? 'var(--gold-bg)' : step === i + 1 ? 'var(--gold)' : 'var(--bg-elevated)', border: `2px solid ${step > i + 1 ? 'var(--border-active)' : step === i + 1 ? 'var(--gold)' : 'var(--border)'}`, color: step === i + 1 ? '#0A0C12' : step > i + 1 ? 'var(--gold-light)' : 'var(--text-3)', transition: 'all 0.3s ease' }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 600, color: step === i + 1 ? 'var(--gold-light)' : 'var(--text-3)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{s}</span>
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: '2px', background: step > i + 1 ? 'var(--gold-dim)' : 'var(--border)', marginBottom: '16px', transition: 'background 0.3s ease' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px 20px', maxHeight: '70vh', overflowY: 'auto' }}>

          {/* STEP 1: Intro */}
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'var(--gold-bg)', border: '1px solid var(--border-active)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' }}>🛡️</div>
              <h4 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>KYC Verification</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '20px' }}>
                To protect all users and comply with escrow trading regulations, we require ID and selfie verification.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
                {[
                  '1. Personal Info: Name, age, phone',
                  '2. Government ID or Passport (front & back)',
                  '3. Live selfie to confirm it\'s you',
                  '4. Admin approval within 24 hours'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-2)', background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>✓</span> {item}
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn btn-gold btn-full btn-lg">Start Verification</button>
            </div>
          )}

          {/* STEP 2: Info Form */}
          {step === 2 && (
            <form onSubmit={handleSaveInfo}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Personal Information</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>Fill out your details exactly as they appear on your document.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 600 }}>Full Name *</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. Abebe Kebede" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'var(--font)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 600 }}>Phone Number *</label>
                    <input type="tel" value={kycPhone} onChange={e => setKycPhone(e.target.value)} required placeholder="+251..." style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'var(--font)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 600 }}>Age *</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} required min="18" max="120" placeholder="Min 18" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'var(--font)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 600 }}>ID Document Type *</label>
                  <select value={idType} onChange={e => setIdType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'var(--font)' }}>
                    <option value="National ID Card">National ID Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: 600 }}>Residential Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Bole, Addis Ababa" style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: '14px', fontFamily: 'var(--font)' }} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '8px' }}>⚠ {error}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                <button type="submit" disabled={loading} className="btn btn-gold" style={{ flex: 2 }}>
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ID Front */}
          {step === 3 && (
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>ID / Passport — Front</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>Take a clear photo of the front of your {idType}.</p>

              {frontPreview ? (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <img src={frontPreview} alt="ID front" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-active)' }} />
                  <button onClick={() => { setIdFront(null); setFrontPreview(null); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(10,12,18,0.8)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Retake</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <button onClick={() => openCamera('front')} style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <span style={{ fontSize: '24px' }}>📷</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Use Camera</span>
                  </button>
                  <label style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '24px' }}>📁</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Upload File</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'front')} />
                  </label>
                </div>
              )}

              {error && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '8px' }}>⚠ {error}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStep(2)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                <button onClick={() => setStep(4)} disabled={!idFront} className="btn btn-gold" style={{ flex: 2 }}>Continue</button>
              </div>
            </div>
          )}

          {/* STEP 4: ID Back */}
          {step === 4 && (
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>ID / Passport — Back</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>Now photograph or upload the back of your {idType}.</p>

              {backPreview ? (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <img src={backPreview} alt="ID back" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-active)' }} />
                  <button onClick={() => { setIdBack(null); setBackPreview(null); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(10,12,18,0.8)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Retake</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <button onClick={() => openCamera('back')} style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <span style={{ fontSize: '24px' }}>📷</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Use Camera</span>
                  </button>
                  <label style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '24px' }}>📁</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Upload File</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'back')} />
                  </label>
                </div>
              )}

              {error && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '8px' }}>⚠ {error}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStep(3)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                <button onClick={handleUploadIDs} disabled={!idBack || loading} className="btn btn-gold" style={{ flex: 2 }}>
                  {loading ? 'Uploading...' : 'Upload & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Face / Selfie */}
          {step === 5 && (
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Live Face Verification</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
                Look directly at the camera. Position your face in the oval guide and wait for detection.
              </p>

              {selfiePreview ? (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <img src={selfiePreview} alt="Selfie" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', border: '2px solid var(--border-active)' }} />
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: 'var(--status-success-text)', fontWeight: 600 }}>✓ Face Verified</div>
                  <button onClick={() => { setSelfieCapture(null); setSelfiePreview(null); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(10,12,18,0.8)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-1)', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Retake</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <button onClick={() => openCamera('face')} style={{ background: 'var(--gold-bg)', border: '2px dashed var(--border-active)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    <span style={{ fontSize: '24px' }}>🤳</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold-light)' }}>Live Face Scan</span>
                  </button>
                  <label style={{ background: 'var(--bg-elevated)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '24px' }}>📁</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Upload Selfie</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'face')} />
                  </label>
                </div>
              )}

              <div style={{ background: 'var(--gold-bg)', border: '1px solid rgba(200,150,44,0.15)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--gold-light)', marginBottom: '16px' }}>
                💡 Tips: Ensure lighting is uniform, look straight ahead, and do not cover your face.
              </div>

              {error && <p style={{ color: 'var(--status-danger-text)', fontSize: '12px', marginBottom: '8px' }}>⚠ {error}</p>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setStep(4)} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                <button onClick={handleUploadFace} disabled={!selfieCapture || loading} className="btn btn-gold" style={{ flex: 2 }}>
                  {loading ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Done */}
          {step === 6 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' }}>✓</div>
              <h4 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Verification Submitted!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: '1.6', marginBottom: '24px' }}>
                Your personal details, ID document scans, and live face selfie have been safely submitted to the admin queue. We'll verify you shortly!
              </p>
              <button onClick={onClose} className="btn btn-gold btn-full">Done</button>
            </div>
          )}

        </div>
      </div>

      {/* Camera Capture Modal */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', borderRadius: cameraTarget === 'face' ? '50% 50% 50% 50% / 60% 60% 40% 40%' : '8px' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Overlay guides */}
            {cameraTarget === 'face' ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '220px', height: '280px', border: `3px solid ${faceLiveReady ? 'var(--gold)' : 'rgba(255,255,255,0.3)'}`, borderRadius: '50%', boxShadow: faceLiveReady ? '0 0 20px rgba(200,150,44,0.4)' : 'none', transition: 'all 0.5s ease' }} />
                <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: faceLiveReady ? 'var(--gold-light)' : 'white', fontFamily: 'var(--font)', fontWeight: 600 }}>
                  {faceLiveReady ? '✓ Live Face Locked — Capture' : 'Live Camera Loading...'}
                </div>
              </div>
            ) : (
              <div style={{ position: 'absolute', inset: '10%', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '8px', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', color: 'white', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                  Align {idType} in Frame
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', padding: '0 20px', width: '100%', maxWidth: '400px' }}>
            <button onClick={stopCamera} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>
            <button onClick={handleCapture} disabled={!faceLiveReady && cameraTarget === 'face'} style={{ flex: 2, padding: '14px', background: faceLiveReady || cameraTarget !== 'face' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: '#0A0C12', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: !faceLiveReady && cameraTarget === 'face' ? 0.5 : 1 }}>
              {cameraTarget === 'face' ? '📸 Capture Selfie' : '📸 Capture'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCWizard;
