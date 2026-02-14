import { createFileRoute, Link } from '@tanstack/react-router'
import './index.css'
import './registration.css'

export const Route = createFileRoute('/ambassador/success')({
  component: AmbassadorSuccessPage,
})

function AmbassadorSuccessPage() {
  return (
    <div className="home-page" role="document">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="home-header" role="banner">
        <Link to="/" className="logo" aria-label="Memory Driver – home">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Memory Driver – Stay in the driver's seat of your memory" width="220" height="220" />
        </Link>
      </header>

      <main id="main-content" role="main" className="registration-main">
        <div className="registration-inner">
          <h1 className="registration-title">Confirmation</h1>
          <div className="registration-success">
            <span className="registration-success-icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <p className="registration-success-message">Thank you for registering for the Ambassador Program. We have received your information and will be in touch soon.</p>
            <Link to="/" className="registration-back-link">
              Return to home
            </Link>
          </div>
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
