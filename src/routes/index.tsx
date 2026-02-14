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
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Memory Driver – Stay in the driver's seat of your memory" width="220" height="220" />
        </Link>
      </header>

      <main id="main-content" role="main">
        <section
          className="promo-section"
          aria-labelledby="premier-heading"
        >
          <div className="promo-image-slot">
            <h3 id="premier-heading" className="promo-image-title">Memory Driver Premier</h3>
            <img
              src={`${import.meta.env.BASE_URL}premier_card_image.png`}
              alt="Memory Driver Premier – The next-generation brain training event. Stay in the driver's seat of your memory."
              className="premier-card-image"
              width="480"
              height="320"
            />
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
          className="promo-section promo-section-ambassador"
          aria-labelledby="ambassador-heading"
        >
          <div className="promo-image-slot">
            <h3 id="ambassador-heading" className="promo-image-title">Memory Driver Ambassador</h3>
            <img
              src={`${import.meta.env.BASE_URL}ambassador_card_image.png`}
              alt="Ambassador Program – Join the Evon Medics Ambassador Program and sign up for Memory Driver"
              className="ambassador-card-image"
              width="480"
              height="320"
            />
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
