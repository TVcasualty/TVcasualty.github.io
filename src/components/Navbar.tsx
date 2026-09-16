import { css } from '../../styled-system/css'
import { site } from '../content/site'

const brand = css({
  fontSize: '1.1em',
  /* The wordmark is the site name, so it must not wrap mid-name. */
  whiteSpace: 'nowrap',
})

/**
 * The fixed navbar (BRIEF §3.4).
 *
 * Two things here are deliberate:
 *
 * 1. The mobile menu is pure CSS. A hidden checkbox drives the panel via a
 *    sibling selector, so navigation works with JavaScript disabled — which
 *    BRIEF §6 requires. The input sits transparently on top of its own label
 *    rather than being `display: none`, keeping it focusable and toggleable
 *    with the keyboard.
 *
 * 2. No colours are set here. The bar starts transparent and inherits its
 *    colours from `data-color`, which src/client/nav.ts mirrors from whichever
 *    band is currently under the bar. That is the entire mechanism: the
 *    navbar has no idea what colour it is.
 */
export const Navbar = () => (
  <nav id="navbar" aria-label="Main">
    <div class="nav-inner">
      <div class="nav-brand">
        <a href="/" class={brand}>
          {site.name}
        </a>
      </div>

      <div class="nav-menu">
        <input
          type="checkbox"
          id="whopper"
          class="whopper-input"
          aria-label="Toggle navigation menu"
        />
        <label class="whopper-label" for="whopper" aria-hidden="true">
          <span class="whopper-bar" />
          <span class="whopper-bar" />
          <span class="whopper-bar" />
        </label>

        <div class="whopper-panel">
          <ul>
            {site.nav.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </nav>
)
