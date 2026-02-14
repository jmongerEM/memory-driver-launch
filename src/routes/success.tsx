import { createFileRoute, Link } from '@tanstack/react-router'
import './index.css'
import './registration.css'

export const Route = createFileRoute('/success')({
  component: SuccessPage,
})

function SuccessPage() {
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
          <div className="registration-success">
            <h2>Registration Successful!</h2>
            <p>Thank you for registering. We have received your information.</p>
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
