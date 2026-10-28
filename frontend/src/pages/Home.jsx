import { Link } from "react-router-dom";

const shoppingCategories = [
  {
    icon: "⌚",
    title: "Accessories",
    subtitle: "Everyday essentials",
    query: "Accessories",
    tone: "lavender",
  },
  {
    icon: "🎧",
    title: "Electronics",
    subtitle: "Smart picks for you",
    query: "Electronics",
    tone: "mint",
  },
  {
    icon: "🧴",
    title: "Beauty & Care",
    subtitle: "Little self-care wins",
    query: "Beauty",
    tone: "peach",
  },
  {
    icon: "🏠",
    title: "Home & Living",
    subtitle: "Make space yours",
    query: "Home",
    tone: "blue",
  },
];

function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> YOUR EVERYDAY FINDS, REIMAGINED
          </span>

          <h1>
            Good finds.
            <br />
            <span>Better living.</span>
          </h1>

          <p>
            Discover thoughtful picks for your style, your space, and everything
            in between — all in one place.
          </p>

          <div className="hero-actions">
            <Link to="/products" className="shop-btn">
              Explore products <span aria-hidden="true">↗</span>
            </Link>
            <span className="hero-note">Easy browsing. Lovely finds.</span>
          </div>

          <div className="hero-proof">
            <span className="proof-icon">✓</span>
            <span>
              <strong>Made for easy shopping</strong>
              <small>Find your next favourite in a few clicks</small>
            </span>
          </div>
        </div>

        <div
          className="hero-art"
          aria-label="A colourful selection of shopping essentials"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />

          <div className="art-label">
            <span className="sparkle">✦</span> THE GOOD FINDS EDIT
          </div>

          <div className="art-main-card">
            <div className="art-card-top">
              <span>VISIONMART PICKS</span>
              <span>✦ 01</span>
            </div>

            <div className="art-product-art">
              <span className="art-sun" />
              <span className="art-product-emoji">👜</span>
              <span className="art-mini-emoji">✦</span>
            </div>

            <div className="art-card-bottom">
              <div>
                <strong>Everyday favourites</strong>
                <small>A little something for you</small>
              </div>
              <span className="art-arrow">↗</span>
            </div>
          </div>

          <div className="floating-card floating-top">
            <span className="floating-icon">🎧</span>
            <span>
              <strong>Find your vibe</strong>
              <small>Explore something new</small>
            </span>
          </div>

          <div className="floating-card floating-bottom">
            <span className="floating-icon heart-icon">♡</span>
            <span>
              <strong>Save your favourites</strong>
              <small>Keep them close</small>
            </span>
          </div>

          <div className="art-sticker">
            GOOD
            <br />
            CHOICES
            <br />
            <span>ONLY ✦</span>
          </div>
        </div>
      </section>

      <section className="benefit-strip" aria-label="Shopping highlights">
        <div>
          <span className="benefit-icon">↗</span>
          <span>
            <strong>Easy to explore</strong>
            <small>Browse your way</small>
          </span>
        </div>

        <div>
          <span className="benefit-icon">♡</span>
          <span>
            <strong>Save what you love</strong>
            <small>Your own wishlist</small>
          </span>
        </div>

        <div>
          <span className="benefit-icon">▣</span>
          <span>
            <strong>Simple checkout</strong>
            <small>A smoother flow</small>
          </span>
        </div>
      </section>

      <section className="category-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">A LITTLE INSPIRATION</span>
            <h2>What are you looking for?</h2>
            <p>Start with a category and see where it takes you.</p>
          </div>

          <Link to="/products" className="text-link">
            View all products <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="category-grid">
          {shoppingCategories.map((category) => (
            <Link
              key={category.title}
              to={`/products?category=${encodeURIComponent(category.query)}`}
              className={`category-card ${category.tone}`}
            >
              <span className="category-icon" aria-hidden="true">
                {category.icon}
              </span>

              <span className="category-copy">
                <strong>{category.title}</strong>
                <small>{category.subtitle}</small>
              </span>

              <span className="category-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div>
          <span className="section-kicker">YOUR NEXT FAVOURITE IS WAITING</span>
          <h2>Good things are just a click away.</h2>
          <p>Take a look around and find something that feels just right.</p>
        </div>

        <Link to="/products" className="cta-button">
          Start exploring <span aria-hidden="true">→</span>
        </Link>

        <span className="cta-decoration" aria-hidden="true">
          ✳
        </span>
      </section>
    </div>
  );
}

export default Home;
