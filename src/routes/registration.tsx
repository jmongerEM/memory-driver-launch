import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { submitRegistrationForm } from '../api.form'
import './index.css'
import './registration.css'

export const Route = createFileRoute('/registration')({
  component: RegistrationPage,
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RegistrationPage() {
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    country: '',
    state: '',
    phone: '',
    referralSource: '',
    isAmbassador: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string | boolean): string => {
    switch (name) {
      case 'name':
        return typeof value === 'string' && value.trim() === '' ? 'Name is required.' : ''
      case 'email': {
        if (typeof value !== 'string' || value.trim() === '') return 'Email is required.'
        return !EMAIL_REGEX.test(value.trim()) ? 'Please enter a valid email address.' : ''
      }
      case 'country':
        return typeof value === 'string' && value.trim() === '' ? 'Country is required.' : ''
      case 'state':
        return typeof value === 'string' && value.trim() === '' ? 'State is required.' : ''
      default:
        return ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const name = target.name
    const type = target.type
    const value = 'value' in target ? target.value : ''
    const checked = 'checked' in target ? target.checked : false
    const next = type === 'checkbox' ? checked : value
    setForm((prev) => ({ ...prev, [name]: next }))
    const err = type === 'checkbox' ? '' : validateField(name, next as string)
    setErrors((prev) => (err ? { ...prev, [name]: err } : { ...prev, [name]: '' }))
    setSubmitError(null)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const name = target.name
    const type = 'type' in target ? target.type : ''
    const value = 'value' in target ? target.value : ''
    const checked = 'checked' in target ? target.checked : false
    const v = type === 'checkbox' ? checked : value
    const err = type === 'checkbox' ? '' : validateField(name, v as string)
    setErrors((prev) => (err ? { ...prev, [name]: err } : { ...prev, [name]: '' }))
  }

  const validateForm = (): boolean => {
    const next: Record<string, string> = {}
    next.name = validateField('name', form.name)
    next.email = validateField('email', form.email)
    next.country = validateField('country', form.country)
    next.state = validateField('state', form.state)
    setErrors(next)
    return !Object.values(next).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validateForm()) return
    setSubmitting(true)
    try {
      await submitRegistrationForm({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          country: form.country.trim(),
          state: form.state.trim(),
          phone: form.phone.trim() || undefined,
          referralSource: form.referralSource.trim() || undefined,
          isAmbassador: form.isAmbassador,
        },
      })
      setSuccess(true)
    } catch {
      setSubmitError('Registration could not be completed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formContent = success ? (
    <div className="registration-success">
      <h2>Registration Successful!</h2>
      <p>Thank you for registering. We have received your information.</p>
      <Link to="/" className="registration-back-link">
        Return to home
      </Link>
    </div>
  ) : (
    <>
      <p className="registration-instructions">
        Complete the form below to register. Fields marked with an asterisk (*) are required. 
        Enter your name, email, country, and state; add phone and how you heard about us if you like. 
        Check “Become an Ambassador” if you want to join the Ambassador Program. When finished, click Register.
      </p>

      <form className="registration-form" onSubmit={handleSubmit} noValidate>
        {submitError && (
          <div className="registration-form-error" role="alert">
            {submitError}
          </div>
        )}

        <div className="field">
            <label htmlFor="name">
              Name <span className="required" aria-hidden="true">(*)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.name ? 'error' : ''}
              autoComplete="name"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <span id="name-error" className="field-error" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="email">
              Email <span className="required" aria-hidden="true">(*)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.email ? 'error' : ''}
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="country">
              Country <span className="required" aria-hidden="true">(*)</span>
            </label>
            <input
              id="country"
              name="country"
              type="text"
              value={form.country}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.country ? 'error' : ''}
              autoComplete="country"
              aria-required="true"
              aria-invalid={!!errors.country}
              aria-describedby={errors.country ? 'country-error' : undefined}
            />
            {errors.country && (
              <span id="country-error" className="field-error" role="alert">
                {errors.country}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="state">
              State <span className="required" aria-hidden="true">(*)</span>
            </label>
            <input
              id="state"
              name="state"
              type="text"
              value={form.state}
              onChange={handleChange}
              onBlur={handleBlur}
              className={errors.state ? 'error' : ''}
              autoComplete="address-level1"
              aria-required="true"
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? 'state-error' : undefined}
            />
            {errors.state && (
              <span id="state-error" className="field-error" role="alert">
                {errors.state}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="tel"
            />
          </div>

          <div className="field">
            <label htmlFor="referralSource">How did you hear about us?</label>
            <textarea
              id="referralSource"
              name="referralSource"
              value={form.referralSource}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
            />
          </div>

          <div className="field checkbox-field">
            <input
              id="isAmbassador"
              name="isAmbassador"
              type="checkbox"
              checked={form.isAmbassador}
              onChange={handleChange}
              aria-describedby="isAmbassador-desc"
            />
            <label htmlFor="isAmbassador" id="isAmbassador-desc">
              Become an Ambassador
            </label>
          </div>

        <div className="field submit-wrap">
          <button
            type="submit"
            className="cta-button"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
        </div>
      </form>

      <Link to="/" className="registration-back-link">
        ← Back to home
      </Link>
    </>
  )

  return (
    <div className="home-page" role="document">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="home-header" role="banner">
        <Link to="/" className="logo" aria-label="Memory Driver – home">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Memory Driver – Stay in the driver's seat of your memory" width="220" height="220" />
        </Link>
      </header>

      <main id="main-content" role="main" className="registration-main">
        <div className="registration-inner">
          {formContent}
        </div>
      </main>

      <footer className="home-footer" role="contentinfo">
        <div className="home-footer-inner">
          <a
            href="https://evonmedics.com/memory-driver/"
            target="_blank"
            rel="noopener noreferrer"
            className="home-footer-link"
          >
            Memory Driver
          </a>
        </div>
      </footer>
    </div>
  )
}
