import { createFileRoute, Link, useNavigate, useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { submitAmbassadorRegistrationForm } from '../api.form'
import { sanitizeUrl } from '../lib/validation'
import './index.css'
import './registration.css'

export const Route = createFileRoute('/ambassador/register')({
  validateSearch: z.object({
    step: z.coerce.number().catch(1),
    from: z.string().optional(),
  }),
  component: AmbassadorRegisterPage,
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STEP_1 = 1
const STEP_2 = 2

const STEP_2_URL_FIELDS = [
  'socialInstagram',
  'socialTwitter',
  'socialFacebook',
  'socialYoutube',
  'socialLinkedIn',
  'socialOtherUrl',
] as const

interface RegistrationFormState {
  name: string
  email: string
  country: string
  state: string
  phone: string
  referralSource: string
}

function AmbassadorRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { step: urlStep, from } = Route.useSearch()
  const step = urlStep === 2 ? STEP_2 : STEP_1
  const hasAppliedRegistrationState = useRef(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    country: '',
    state: '',
    phone: '',
    howDidYouHear: '',
    previousSuccess: '',
    socialInstagram: '',
    socialTwitter: '',
    socialFacebook: '',
    socialYoutube: '',
    socialLinkedIn: '',
    socialOtherUrl: '',
    conflictsOfInterest: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [step1BlockedMessage, setStep1BlockedMessage] = useState<string | null>(null)
  const [showValidationPopup, setShowValidationPopup] = useState(false)
  /** Messages to show in the validation popup (set when opening popup so popup doesn't depend on errors timing) */
  const [validationPopupMessages, setValidationPopupMessages] = useState<string[]>([])
  const validationDialogRef = useRef<HTMLDivElement>(null)
  const validationPopupTriggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (step !== STEP_2 || from !== 'registration' || hasAppliedRegistrationState.current) return
    const registrationForm = (location.state as { registrationForm?: RegistrationFormState } | undefined)?.registrationForm
    if (!registrationForm) return
    hasAppliedRegistrationState.current = true
    setForm((prev) => ({
      ...prev,
      name: registrationForm.name || prev.name,
      email: registrationForm.email || prev.email,
      country: registrationForm.country || prev.country,
      state: registrationForm.state || prev.state,
      phone: registrationForm.phone || prev.phone,
      howDidYouHear: registrationForm.referralSource || prev.howDidYouHear,
    }))
  }, [step, from, location.state])

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        return value.trim() === '' ? 'Name is required.' : ''
      case 'email': {
        if (value.trim() === '') return 'Email is required.'
        return !EMAIL_REGEX.test(value.trim()) ? 'Please enter a valid email address.' : ''
      }
      case 'country':
        return value.trim() === '' ? 'Country is required.' : ''
      case 'state':
        return value.trim() === '' ? 'State is required.' : ''
      default:
        return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const name = target.name
    const value = 'value' in target ? target.value : ''
    setForm((prev) => ({ ...prev, [name]: value }))
    const err = validateField(name, value)
    setErrors((prev) => (err ? { ...prev, [name]: err } : { ...prev, [name]: '' }))
    setSubmitError(null)
    setStep1BlockedMessage(null)
    setShowValidationPopup(false)
    setValidationPopupMessages([])
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const name = target.name
    const value = 'value' in target ? target.value : ''
    if (STEP_2_URL_FIELDS.includes(name as (typeof STEP_2_URL_FIELDS)[number])) {
      const result = sanitizeUrl(value)
      if (value.trim() !== '') {
        if (!result.ok) {
          setErrors((prev) => ({ ...prev, [name]: result.error }))
          return
        }
        if (result.url && result.url !== value.trim()) {
          setForm((prev) => ({ ...prev, [name]: result.url }))
        }
      }
      setErrors((prev) => ({ ...prev, [name]: '' }))
      return
    }
    const err = validateField(name, value)
    setErrors((prev) => (err ? { ...prev, [name]: err } : { ...prev, [name]: '' }))
  }

  const validateStep1 = (): { valid: boolean; messages: string[] } => {
    const next: Record<string, string> = {}
    next.name = validateField('name', form.name)
    next.email = validateField('email', form.email)
    next.country = validateField('country', form.country)
    next.state = validateField('state', form.state)
    setErrors(next)
    const messages = [next.name, next.email, next.country, next.state].filter(Boolean) as string[]
    const valid = messages.length === 0
    return { valid, messages }
  }

  /** Step 2: previousSuccess required, at least one URL required, conflictsOfInterest required; URL fields sanitized. */
  const validateStep2 = (): { valid: boolean; nextErrors: Record<string, string> } => {
    const nextErrors: Record<string, string> = {}
    if (form.previousSuccess.trim() === '') {
      nextErrors.previousSuccess = 'Please describe your previous Ambassador/Affiliate/Influencer marketing success (or indicate none).'
    }
    if (form.conflictsOfInterest.trim() === '') {
      nextErrors.conflictsOfInterest = 'Please answer whether you have any conflicts of interest.'
    }
    const urlValues = STEP_2_URL_FIELDS.map((key) => form[key].trim())
    let validUrlCount = 0
    for (let i = 0; i < STEP_2_URL_FIELDS.length; i++) {
      const key = STEP_2_URL_FIELDS[i]
      const raw = urlValues[i]
      if (raw === '') continue
      const result = sanitizeUrl(raw)
      if (!result.ok) {
        nextErrors[key] = result.error
      } else {
        validUrlCount++
      }
    }
    if (validUrlCount === 0) {
      nextErrors.socialUrls = 'At least one social media or other URL is required.'
    }
    setErrors((prev) => ({ ...prev, ...nextErrors }))
    const valid = Object.keys(nextErrors).length === 0
    return { valid, nextErrors }
  }

  const goToStep2 = () => {
    setSubmitError(null)
    const { valid, messages } = validateStep1()
    if (!valid) {
      setStep1BlockedMessage('Please complete all required fields (Name, Email, Country, State) and fix any errors below before continuing.')
      validationPopupTriggerRef.current = document.activeElement as HTMLElement | null
      setValidationPopupMessages(messages)
      setShowValidationPopup(true)
      return
    }
    setStep1BlockedMessage(null)
    setShowValidationPopup(false)
    setValidationPopupMessages([])
    navigate({
      to: '/ambassador/register',
      search: (prev) => ({ ...prev, step: 2 }),
      replace: true,
    })
  }

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    goToStep2()
    return false
  }

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setStep1BlockedMessage(null)
    if (from === 'registration') {
      navigate({
        to: '/registration',
        replace: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: {
          restoredRegistrationForm: {
            name: form.name,
            email: form.email,
            country: form.country,
            state: form.state,
            phone: form.phone,
            referralSource: form.howDidYouHear,
            isAmbassador: true,
          },
        } as any,
      })
    } else {
      navigate({
        to: '/ambassador/register',
        search: (prev) => ({ ...prev, step: 1 }),
        replace: true,
      })
    }
  }

  const submitRegistration = async () => {
    setSubmitError(null)
    const { valid: step1Valid, messages } = validateStep1()
    if (!step1Valid) {
      setStep1BlockedMessage('Please complete all required fields (Name, Email, Country, State) before submitting.')
      validationPopupTriggerRef.current = document.activeElement as HTMLElement | null
      setValidationPopupMessages(messages)
      setShowValidationPopup(true)
      return
    }
    const { valid: step2Valid } = validateStep2()
    if (!step2Valid) return
    const sanitizedUrls: Record<string, string> = {}
    for (const key of STEP_2_URL_FIELDS) {
      const raw = form[key].trim()
      if (raw === '') continue
      const result = sanitizeUrl(raw)
      if (result.ok && result.url) sanitizedUrls[key] = result.url
    }
    setSubmitting(true)
    try {
      await submitAmbassadorRegistrationForm({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          country: form.country.trim(),
          state: form.state.trim(),
          phone: form.phone.trim() || undefined,
          howDidYouHear: form.howDidYouHear.trim() || undefined,
          previousSuccess: form.previousSuccess.trim(),
          socialInstagram: sanitizedUrls.socialInstagram || undefined,
          socialTwitter: sanitizedUrls.socialTwitter || undefined,
          socialFacebook: sanitizedUrls.socialFacebook || undefined,
          socialYoutube: sanitizedUrls.socialYoutube || undefined,
          socialLinkedIn: sanitizedUrls.socialLinkedIn || undefined,
          socialOtherUrl: sanitizedUrls.socialOtherUrl || undefined,
          conflictsOfInterest: form.conflictsOfInterest.trim(),
        },
      })
      navigate({ to: '/ambassador/success' })
    } catch {
      setSubmitError('Registration could not be completed. Please check your connection and try again. If the problem persists, save your information and contact support.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    void submitRegistration()
    return false
  }

  const closeValidationPopup = () => {
    setShowValidationPopup(false)
    setValidationPopupMessages([])
    const trigger = validationPopupTriggerRef.current
    if (trigger && typeof trigger.focus === 'function') {
      setTimeout(() => trigger.focus(), 0)
    }
  }

  useEffect(() => {
    if (!showValidationPopup || !validationDialogRef.current) return
    const dialog = validationDialogRef.current
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const getFocusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeValidationPopup()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = getFocusables()
      if (focusables.length === 0) return
      const current = document.activeElement as HTMLElement | null
      const last = focusables[focusables.length - 1]
      const first = focusables[0]
      if (e.shiftKey) {
        if (current === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (current === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showValidationPopup])

  if (step === STEP_1) {
    return (
      <>
        {showValidationPopup && validationPopupMessages.length > 0 && (
          <div
            ref={validationDialogRef}
            className="registration-validation-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="validation-popup-title"
            aria-describedby="validation-popup-list"
          >
            <div className="registration-validation-popup">
              <h2 id="validation-popup-title" className="registration-validation-popup-title">
                Please fix the following
              </h2>
              <ul id="validation-popup-list" className="registration-validation-popup-list">
                {validationPopupMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
              <button
                type="button"
                className="cta-button registration-validation-popup-close"
                onClick={closeValidationPopup}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        )}
      <div className="home-page" role="document">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header className="home-header" role="banner">
          <Link to="/" className="logo" aria-label="Memory Driver – home">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Memory Driver" width="220" height="220" />
          </Link>
        </header>
        <main id="main-content" role="main" className="registration-main">
          <div className="registration-inner">
            <h1 className="registration-title">Ambassador Application — Step 1</h1>
            <p className="registration-step-indicator" aria-live="polite">Step 1 of 2</p>
            <form
              className="registration-form"
              onSubmit={handleStep1Submit}
              noValidate
            >
              {submitError && <div className="registration-form-error" role="alert">{submitError}</div>}
              {step1BlockedMessage && (errors.name || errors.email || errors.country || errors.state) && (
                <div className="registration-form-error" role="alert" aria-live="polite">
                  {step1BlockedMessage}
                </div>
              )}
              <div className="field">
                <label htmlFor="amb-name">Name <span className="required" aria-hidden="true">(*)</span></label>
                <input id="amb-name" name="name" type="text" value={form.name} onChange={handleChange} onBlur={handleBlur} className={errors.name ? 'error' : ''} autoComplete="name" aria-required aria-invalid={!!errors.name} aria-describedby={errors.name ? 'amb-name-error' : undefined} />
                {errors.name && <span id="amb-name-error" className="field-error" role="alert">{errors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="amb-email">Email <span className="required" aria-hidden="true">(*)</span></label>
                <input id="amb-email" name="email" type="email" value={form.email} onChange={handleChange} onBlur={handleBlur} className={errors.email ? 'error' : ''} autoComplete="email" aria-required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'amb-email-error' : undefined} />
                {errors.email && <span id="amb-email-error" className="field-error" role="alert">{errors.email}</span>}
              </div>
              <div className="field">
                <label htmlFor="amb-country">Country <span className="required" aria-hidden="true">(*)</span></label>
                <input id="amb-country" name="country" type="text" value={form.country} onChange={handleChange} onBlur={handleBlur} className={errors.country ? 'error' : ''} autoComplete="country" aria-required aria-invalid={!!errors.country} aria-describedby={errors.country ? 'amb-country-error' : undefined} />
                {errors.country && <span id="amb-country-error" className="field-error" role="alert">{errors.country}</span>}
              </div>
              <div className="field">
                <label htmlFor="amb-state">State <span className="required" aria-hidden="true">(*)</span></label>
                <input id="amb-state" name="state" type="text" value={form.state} onChange={handleChange} onBlur={handleBlur} className={errors.state ? 'error' : ''} autoComplete="address-level1" aria-required aria-invalid={!!errors.state} aria-describedby={errors.state ? 'amb-state-error' : undefined} />
                {errors.state && <span id="amb-state-error" className="field-error" role="alert">{errors.state}</span>}
              </div>
              <div className="field">
                <label htmlFor="amb-phone">Phone Number</label>
                <input id="amb-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} onBlur={handleBlur} autoComplete="tel" />
              </div>
              <div className="field">
                <label htmlFor="amb-howDidYouHear">How did you hear about this program?</label>
                <textarea id="amb-howDidYouHear" name="howDidYouHear" value={form.howDidYouHear} onChange={handleChange} onBlur={handleBlur} rows={3} />
              </div>
              <div className="field submit-wrap">
                <button type="submit" className="cta-button">
                  NEXT
                </button>
              </div>
            </form>
            <Link to="/" className="registration-back-link">← Back to home</Link>
          </div>
        </main>
        <footer className="home-footer" role="contentinfo">
          <div className="home-footer-inner">
            <a href="https://evonmedics.com/memory-driver/" target="_blank" rel="noopener noreferrer" className="home-footer-link">Memory Driver</a>
          </div>
        </footer>
      </div>
      </>
    )
  }

  return (
    <div className="home-page" role="document">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="home-header" role="banner">
        <Link to="/" className="logo" aria-label="Memory Driver – home">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Memory Driver" width="220" height="220" />
        </Link>
      </header>
      <main id="main-content" role="main" className="registration-main">
        <div className="registration-inner">
          <h1 className="registration-title">Ambassador Application — Step 2</h1>
          <p className="registration-step-indicator" aria-live="polite">Step 2 of 2</p>
          <form className="registration-form" onSubmit={handleStep2Submit} noValidate>
            {submitError && (
              <div className="registration-form-error" role="alert" aria-live="polite">
                {submitError}
              </div>
            )}
            <div className="field">
              <label htmlFor="amb-previousSuccess">
                List your previous Ambassador/Affiliate/Influencer marketing success? (If any) <span className="required" aria-hidden="true">(*)</span>
              </label>
              <textarea id="amb-previousSuccess" name="previousSuccess" value={form.previousSuccess} onChange={handleChange} onBlur={handleBlur} rows={4} placeholder="e.g. campaigns, reach, brands worked with" className={errors.previousSuccess ? 'error' : ''} aria-required="true" aria-invalid={!!errors.previousSuccess} />
              {errors.previousSuccess && <span className="field-error" role="alert">{errors.previousSuccess}</span>}
            </div>
            <div className="field">
              <span className="registration-label">Please provide links to social media accounts <span className="required" aria-hidden="true">(* at least one)</span></span>
              {errors.socialUrls && <span className="field-error" role="alert">{errors.socialUrls}</span>}
              <div className="social-links-group">
                <div className="field">
                  <label htmlFor="amb-socialInstagram">Instagram</label>
                  <input id="amb-socialInstagram" name="socialInstagram" type="url" value={form.socialInstagram} onChange={handleChange} onBlur={handleBlur} placeholder="https://instagram.com/..." className={errors.socialInstagram ? 'error' : ''} aria-invalid={!!errors.socialInstagram} />
                  {errors.socialInstagram && <span className="field-error" role="alert">{errors.socialInstagram}</span>}
                </div>
                <div className="field">
                  <label htmlFor="amb-socialTwitter">Twitter / X</label>
                  <input id="amb-socialTwitter" name="socialTwitter" type="url" value={form.socialTwitter} onChange={handleChange} onBlur={handleBlur} placeholder="https://twitter.com/..." className={errors.socialTwitter ? 'error' : ''} aria-invalid={!!errors.socialTwitter} />
                  {errors.socialTwitter && <span className="field-error" role="alert">{errors.socialTwitter}</span>}
                </div>
                <div className="field">
                  <label htmlFor="amb-socialFacebook">Facebook</label>
                  <input id="amb-socialFacebook" name="socialFacebook" type="url" value={form.socialFacebook} onChange={handleChange} onBlur={handleBlur} placeholder="https://facebook.com/..." className={errors.socialFacebook ? 'error' : ''} aria-invalid={!!errors.socialFacebook} />
                  {errors.socialFacebook && <span className="field-error" role="alert">{errors.socialFacebook}</span>}
                </div>
                <div className="field">
                  <label htmlFor="amb-socialYoutube">YouTube</label>
                  <input id="amb-socialYoutube" name="socialYoutube" type="url" value={form.socialYoutube} onChange={handleChange} onBlur={handleBlur} placeholder="https://youtube.com/..." className={errors.socialYoutube ? 'error' : ''} aria-invalid={!!errors.socialYoutube} />
                  {errors.socialYoutube && <span className="field-error" role="alert">{errors.socialYoutube}</span>}
                </div>
                <div className="field">
                  <label htmlFor="amb-socialLinkedIn">LinkedIn</label>
                  <input id="amb-socialLinkedIn" name="socialLinkedIn" type="url" value={form.socialLinkedIn} onChange={handleChange} onBlur={handleBlur} placeholder="https://linkedin.com/in/..." className={errors.socialLinkedIn ? 'error' : ''} aria-invalid={!!errors.socialLinkedIn} />
                  {errors.socialLinkedIn && <span className="field-error" role="alert">{errors.socialLinkedIn}</span>}
                </div>
                <div className="field">
                  <label htmlFor="amb-socialOtherUrl">Other URL</label>
                  <input id="amb-socialOtherUrl" name="socialOtherUrl" type="url" value={form.socialOtherUrl} onChange={handleChange} onBlur={handleBlur} placeholder="https://..." className={errors.socialOtherUrl ? 'error' : ''} aria-invalid={!!errors.socialOtherUrl} />
                  {errors.socialOtherUrl && <span className="field-error" role="alert">{errors.socialOtherUrl}</span>}
                </div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="amb-conflictsOfInterest">
                Do you have any conflicts of interest? <span className="required" aria-hidden="true">(*)</span>
              </label>
              <textarea id="amb-conflictsOfInterest" name="conflictsOfInterest" value={form.conflictsOfInterest} onChange={handleChange} onBlur={handleBlur} rows={3} placeholder="e.g. competing brands, financial interests" className={errors.conflictsOfInterest ? 'error' : ''} aria-required="true" aria-invalid={!!errors.conflictsOfInterest} />
              {errors.conflictsOfInterest && <span className="field-error" role="alert">{errors.conflictsOfInterest}</span>}
            </div>
            <div className="field submit-wrap submit-wrap-row">
              <button type="button" className="cta-button cta-button-secondary" onClick={handleBack}>Back</button>
              <button
                type="button"
                className="cta-button"
                disabled={submitting}
                aria-busy={submitting}
                onClick={() => void submitRegistration()}
              >
                {submitting ? 'Registering…' : 'Register'}
              </button>
            </div>
          </form>
          <Link to="/" className="registration-back-link">← Back to home</Link>
        </div>
      </main>
      <footer className="home-footer" role="contentinfo">
        <div className="home-footer-inner">
          <a href="https://evonmedics.com/memory-driver/" target="_blank" rel="noopener noreferrer" className="home-footer-link">Memory Driver</a>
        </div>
      </footer>
    </div>
  )
}
