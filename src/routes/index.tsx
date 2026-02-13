import { createFileRoute, Link } from '@tanstack/react-router'
import './index.css'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="home-page" role="document">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="home-header" role="banner">
        <Link to="/" className="logo" aria-label="Memory Driver – home">
          <img src="/logo.svg" alt="Memory Driver – Stay in the driver's seat of your memory" width="220" height="220" />
        </Link>
      </header>

      <main id="main-content" role="main">
        <section
          className="promo-section"
          aria-labelledby="premier-heading"
        >
          <div className="promo-card">
            <h3 id="premier-heading">Memory Driver Premier</h3>
            <p>
              The next-generation brain training event. Join us and stay in the driver's seat of your memory.
            </p>
          </div>
          <div className="promo-cta">
            <Link
              to="/registration"
              className="cta-button"
              aria-label="Register for MD Premier event"
            >
              Register
            </Link>
          </div>
        </section>

        <section
          className="promo-section"
          aria-labelledby="ambassador-heading"
        >
          <div className="promo-card">
            <h3 id="ambassador-heading">Ambassador Program</h3>
            <p>
              Join the Evon Medics Ambassador Program and help spread the word about Memory Driver.
              Connect with a community of advocates and grow with us.
            </p>
          </div>
          <div className="promo-cta">
            <Link
              to="/ambassador/register"
              search={{ step: 1 }}
              className="cta-button"
              aria-label="Sign up for the Ambassador Program"
            >
              Sign Up!
            </Link>
          </div>
        </section>
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
