import { getCookies, buildCarousel } from '../../scripts/scripts.js';

/**
 * Generates 16-character hexadecimal anonymous ID.
 * @returns {string} 16-character lowercase hexadecimal string.
 */
function generateAnonId() {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retrieves anonymous Salesforce ID from cookies.
 * @returns {string} Anonymous ID
 */
function getAnonId() {
  const cookies = getCookies();
  const sfid = Object.keys(cookies).find((key) => key.toLowerCase().includes('sfid'));
  if (sfid) {
    try {
      const decoded = decodeURIComponent(cookies[sfid]);
      const parsed = JSON.parse(decoded);
      return parsed.anonymousId;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse anonId cookie:', error);
    }
  }
  return generateAnonId();
}

/**
 * Encodes event object into URL-safe Base64 string.
 * @param {Object} event - Event object to encode
 * @returns {string} URL-safe, Base64-encoded representation of event
 */
function encodeEvent(event) {
  const str = JSON.stringify(event);
  const base64 = btoa(str);
  const encoded = encodeURIComponent(base64);
  return encoded;
}

/**
 * Constructs and encodes event object for Evergage.
 * @returns {string} URL-encoded, Base64-encoded JSON string representing the event
 */
function generateEvent() {
  const event = {
    source: {
      contentZones: ['Product-Recommendation-Home'],
    },
    user: {
      anonymousId: getAnonId(),
      identities: {},
      attributes: {},
    },
    interaction: {
      name: 'View Home Page',
    },
    account: {},
    _toolsEventLinkId: Math.random().toString().slice(2),
  };
  return encodeEvent(event);
}

/**
 * Sends event to Evergage and returns the first campaign payload.
 * @param {string} event - URL-encoded, Base64-encoded JSON string representing the event
 * @returns {Promise<Object>} `payload` object from first `campaignResponse`
 */
async function fetchRecommendations() {
  const url = 'https://vitamixmgmtcorp.us-5.evergage.com/api2/event/vitamix_us';
  const event = generateEvent();

  try {
    const resp = await fetch(`${url}?event=${event}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} while sending event`);

    const data = await resp.json();
    if (data && data.campaignResponses && data.campaignResponses[0]) {
      return data.campaignResponses[0].payload || {};
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return {};
}

/**
 * Extracts flattened values from product's attribute object.
 * @param {Object} attr - Raw attributes object from a product
 * @returns {Object} Simplified object with core values
 */
function extractProductAttributes(attr) {
  return {
    name: attr?.name?.value || '',
    description: attr?.description?.value || '',
    imageUrl: attr?.imageUrl?.value || '',
    url: attr?.url?.value || '',
    availability: attr?.availability?.value || '',
  };
}

/**
 * Builds single product element with image and details.
 * @param {Object} p - Product object containing attributes
 * @param {Object} p.attributes - Product attributes object
 * @returns {HTMLLIElement} Constructed product list item element
 */
function buildProduct(p) {
  const { name, imageUrl, url } = extractProductAttributes(p.attributes);
  const product = document.createElement('li');

  // build product image
  const imageWrapper = document.createElement('div');
  imageWrapper.classList.add('product-image');
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = name;
  picture.append(img);
  imageWrapper.append(picture);
  product.append(imageWrapper);

  // build product body
  const body = document.createElement('div');
  body.classList.add('product-body');
  const title = document.createElement('h3');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = name;
  title.append(link);
  body.append(title);

  product.append(imageWrapper, body);
  product.addEventListener('click', () => { link.click(); });
  return product;
}

/**
 * Builds list of product elements from array of product objects.
 * @param {Array} products - Array of product objects to build
 * @returns {HTMLUListElement} Constructed unordered list containing all products
 */
function buildProducts(products) {
  const productList = document.createElement('ul');
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const product = buildProduct(p);
    productList.append(product);
  }

  return productList;
}

export default async function decorate(block) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const recommendations = await fetchRecommendations();
        const productsData = recommendations.products;

        // if products found from everage, build carousel
        if (productsData.length) {
          const products = buildProducts(productsData);
          block.innerHTML = '';
          block.append(products);
          buildCarousel(block, false);
        } else { // no products found, remove section
          const wrapper = block.parentElement;
          const section = wrapper.closest('.section');
          wrapper.previousElementSibling.remove();
          wrapper.remove();
          if (section.children.length === 0) section.remove();
          else section.classList.remove('recommended-products-container');
        }

        observer.disconnect();
      }
    });
  }, { threshold: 0 });

  observer.observe(block);
}
